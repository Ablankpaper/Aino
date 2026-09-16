import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

import { _electron } from '@playwright/test'

import { findElectron } from './fixtures'
import { installErrorBannerGuard } from './test'

export interface NativeManifest {
  origin: string
  nonce: string
  phone: string
  run_id: string
  fixture_path: string
  fixture_content: string
}

export interface NativeState {
  user_id: number
  balance: string
  usage_cost: string
  usage_calls: number
  usage_turns: number
  orders: number
  model_calls: number
  payment_calls: number
  tool_results: number
  stream_started: number
  stream_cancelled: number
}

export function fixtureEnvironment(): Record<string, string> {
  const allowed = ['PATH', 'TMPDIR', 'DISPLAY', 'XDG_RUNTIME_DIR', 'SHELL', 'USER', 'LOGNAME', 'DOCKER_HOST', 'DOCKER_CONTEXT']
  const env: Record<string, string> = { LANG: 'en_US.UTF-8', TZ: 'UTC' }

  for (const key of allowed) { if (process.env[key]) { env[key] = process.env[key]! } }

  return env
}

export function installLoopbackPythonGuard(root: string): string {
  const directory = path.join(root, 'python-network-guard')
  fs.mkdirSync(directory, { mode: 0o700 })
  // Loaded by the actual isolated Python interpreter; it changes transport
  // reachability only, never model/tool/auth/account behavior.
  fs.writeFileSync(path.join(directory, 'sitecustomize.py'), `import ipaddress, os, socket, subprocess
with open(os.path.join(os.environ['HERMES_HOME'], 'python-network-guard-active'), 'a') as f:
    f.write(str(os.getpid()) + '\\n')
_connect = socket.socket.connect
_connect_ex = socket.socket.connect_ex
_resolve = socket.getaddrinfo
_popen_init = subprocess.Popen.__init__
def _guard_popen(self, args, *positional, **kwargs):
    if isinstance(args, (list, tuple)) and args and os.path.basename(str(args[0])) == 'security' and 'find-generic-password' in args:
        with open(os.path.join(os.environ['HERMES_HOME'], 'blocked-credential-discovery.txt'), 'a') as f:
            f.write('macOS generic-password read denied before spawn\\n')
        raise FileNotFoundError('native fixture does not expose personal credential stores')
    return _popen_init(self, args, *positional, **kwargs)
def _check(host):
    if isinstance(host, bytes): host = host.decode()
    if host == 'localhost': return
    try:
        if ipaddress.ip_address(host).is_loopback: return
    except ValueError:
        pass
    with open(os.path.join(os.environ['HERMES_HOME'], 'blocked-network.txt'), 'a') as f:
        f.write(str(host) + '\\n')
    raise OSError('native fixture forbids non-loopback transport')
def _guard_connect(self, address):
    if self.family in (socket.AF_INET, socket.AF_INET6): _check(address[0])
    return _connect(self, address)
def _guard_connect_ex(self, address):
    if self.family in (socket.AF_INET, socket.AF_INET6): _check(address[0])
    return _connect_ex(self, address)
def _guard_resolve(host, *args, **kwargs):
    if host is not None: _check(host)
    return _resolve(host, *args, **kwargs)
socket.socket.connect = _guard_connect
socket.socket.connect_ex = _guard_connect_ex
socket.getaddrinfo = _guard_resolve
subprocess.Popen.__init__ = _guard_popen
`, { mode: 0o600 })

  return directory
}

export function installLoopbackNodeGuard(root: string): string {
  const guard = path.join(root, 'node-network-guard.cjs')
  fs.writeFileSync(guard, `const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const home = process.env.HERMES_HOME;
fs.appendFileSync(path.join(home, 'node-network-guard-active'), String(process.pid) + '\\n');
function check(host) {
  if (!host || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) return;
  fs.appendFileSync(path.join(home, 'blocked-node-network.txt'), String(host) + '\\n');
  throw new Error('native fixture forbids non-loopback transport');
}

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (first && typeof first === 'object') { if (!first.path) check(first.host || first.hostname); }
  else if (typeof first === 'number' && typeof args[1] === 'string') check(args[1]);
  return connect.apply(this, args);
};
if (globalThis.fetch) {
  const fetch = globalThis.fetch;
  globalThis.fetch = function(input, ...rest) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    check(url.hostname);
    return fetch.call(this, input, ...rest);
  };
}
`, { mode: 0o600 })

  return guard
}

export async function launchGuardedDesktop(env: Record<string, string>, guardPath: string) {
  const desktopRoot = path.resolve(import.meta.dirname, '..')
  const entry = path.join(path.dirname(guardPath), 'native-electron-entry.cjs')
  const mainURL = pathToFileURL(path.join(desktopRoot, 'dist', 'electron-main.mjs')).href
  // Electron deliberately ignores NODE_OPTIONS --require. The fixture entry
  // installs transport policy before importing the unchanged real main bundle.
  fs.writeFileSync(entry, `require(${JSON.stringify(guardPath)});
const { app, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const guardedSessions = new WeakSet();
function guardSession(target) {
  if (guardedSessions.has(target)) return;
  guardedSessions.add(target);
  target.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    const allowed = ['file:', 'data:', 'blob:', 'devtools:', 'chrome:', 'chrome-extension:', 'about:'].includes(url.protocol)
      || ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (!allowed) fs.appendFileSync(path.join(process.env.HERMES_HOME, 'blocked-chromium-network.txt'), url.hostname + '\\n');
    callback({ cancel: !allowed });
  });
}
app.on('session-created', guardSession);
app.whenReady().then(() => {
  guardSession(session.defaultSession);
  fs.appendFileSync(path.join(process.env.HERMES_HOME, 'chromium-network-guard-active'), String(process.pid) + '\\n');
});
app.setAppPath(${JSON.stringify(desktopRoot)});
import(${JSON.stringify(mainURL)});
`, { mode: 0o600 })
  const app = await _electron.launch({ executablePath: findElectron(), args: [entry, '--disable-gpu', '--no-sandbox'], env, cwd: desktopRoot })
  const page = await app.firstWindow()
  installErrorBannerGuard(page)

  return { app, page }
}

export function persistedFixtureText(directory: string): string[] {
  const values: string[] = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)

    if (entry.isDirectory()) { values.push(...persistedFixtureText(filename)) }
    else if (entry.isFile()) { values.push(fs.readFileSync(filename).toString('utf8')) }
  }

  return values
}

export async function startRealPlatformAPI(apiRoot: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aino-native-api-'))
  fs.chmodSync(dir, 0o700)
  const runtimeHome = path.join(dir, 'home')
  const binaryPath = path.join(dir, 'aino-native-consumer.test')
  const logPath = path.join(dir, 'api.log')
  const compileArgs = ['test', '-c', '-tags', 'integration,nativeconsumer', '-o', binaryPath, './internal/repository']
  const runtimeArgs = ['-test.run', '^TestAinoNativeConsumer$', '-test.count=1', '-test.timeout=9m', '-test.v']
  const apiSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: apiRoot, encoding: 'utf8' }).trim()
  fs.writeFileSync(path.join(dir, 'api-source-status.txt'), execFileSync('git', ['status', '--short'], { cwd: apiRoot }), { mode: 0o600 })
  fs.writeFileSync(path.join(dir, 'api-source-working.diff'), execFileSync('git', ['diff'], { cwd: apiRoot }), { mode: 0o600 })
  fs.writeFileSync(path.join(dir, 'api-source-head.txt'), `${apiSha}\n`, { mode: 0o600 })
  fs.mkdirSync(runtimeHome, { mode: 0o700 })

  // Compilation may use the existing Go caches, but the service itself gets no
  // host HOME. Resolve Docker's non-secret endpoint before launching so the
  // disposable fixture can reach its owned containers without HOME discovery.
  const dockerHost = execFileSync('docker', ['context', 'inspect', '--format', '{{ .Endpoints.docker.Host }}'], { encoding: 'utf8' }).trim()

  if (!dockerHost.startsWith('unix://')) { throw new Error('Native fixture requires an explicit Unix Docker endpoint') }

  const toolingEnvironment = {
    ...fixtureEnvironment(),
    HOME: runtimeHome,
    CI: 'true',
    GOCACHE: '/Users/zizimutou/Library/Caches/go-build',
    GOPATH: '/Users/zizimutou/go',
    DOCKER_HOST: dockerHost
  }

  const runtimeEnvironment = {
    ...fixtureEnvironment(),
    HOME: runtimeHome,
    CI: 'true',
    AINO_NATIVE_FIXTURE_DIR: dir,
    DOCKER_HOST: dockerHost
  }

  fs.writeFileSync(path.join(dir, 'compile-command.txt'), `CI=true GOCACHE=<toolchain cache> GOPATH=<toolchain cache> go ${compileArgs.join(' ')}\n`, { mode: 0o600 })
  fs.writeFileSync(path.join(dir, 'command.txt'), `CI=true HOME=<private fixture home> AINO_NATIVE_FIXTURE_DIR=<private directory> ${path.basename(binaryPath)} ${runtimeArgs.join(' ')}\n`, { mode: 0o600 })

  const log = fs.openSync(logPath, 'wx', 0o600)

  try {
    execFileSync('go', compileArgs, {
      cwd: path.join(apiRoot, 'backend'),
      env: toolingEnvironment,
      stdio: ['ignore', log, log]
    })
  } finally {
    fs.closeSync(log)
  }

  const binaryHash = execFileSync('shasum', ['-a', '256', binaryPath], { encoding: 'utf8' }).trim().split(/\s+/)[0]
  fs.writeFileSync(path.join(dir, 'runtime-isolation.json'), JSON.stringify({
    api_source_sha: apiSha,
    binary: binaryPath,
    binary_sha256: binaryHash,
    runtime_home: runtimeHome,
    docker_host: dockerHost,
    tooling_cache_scope: { gocache: toolingEnvironment.GOCACHE, gopath: toolingEnvironment.GOPATH },
    runtime_environment: { HOME: runtimeHome, CI: 'true', AINO_NATIVE_FIXTURE_DIR: dir, DOCKER_HOST: dockerHost }
  }, null, 2), { mode: 0o600 })

  const runtimeLog = fs.openSync(logPath, 'a', 0o600)
  let child: ChildProcess

  try {
    child = spawn(binaryPath, runtimeArgs, {
      cwd: path.join(apiRoot, 'backend'),
      env: runtimeEnvironment,
      stdio: ['ignore', runtimeLog, runtimeLog]
    })
  } finally {
    fs.closeSync(runtimeLog)
  }

  let exited: number | null | undefined
  child.on('exit', code => {
    exited = code
    fs.writeFileSync(path.join(dir, 'api-exit-code.json'), JSON.stringify({ exit_code: code }), { mode: 0o600 })
  })
  const done = new Promise<number | null>(resolve => child.once('exit', resolve))
  let manifest: NativeManifest | undefined

  async function awaitOwnedChildExit() {
    if (exited !== undefined) { return }

    child.kill('SIGTERM')
    const outcome = await Promise.race([done, new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 15_000))])

    if (outcome !== 'timeout') { return }

    child.kill('SIGKILL')
    await Promise.race([done, new Promise(resolve => setTimeout(resolve, 15_000))])
  }

  try {
    const deadline = Date.now() + 120_000

    while (Date.now() < deadline) {
      if (exited !== undefined) { throw new Error(`API fixture exited (${exited}); private log ${logPath}`) }
      const manifestPath = path.join(dir, 'manifest.json')

      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as NativeManifest

        break
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    }

    if (!manifest) { throw new Error(`API fixture startup timed out; private log ${logPath}`) }
    const address = new URL(manifest.origin)

    if (address.protocol !== 'http:' || address.hostname !== '127.0.0.1' || !address.port) {
      throw new Error('Native fixture must have an explicit random loopback origin')
    }
  } catch (error) {
    await awaitOwnedChildExit()
    throw error
  }

  const info = manifest

  async function control<T>(endpoint: string, body?: string): Promise<T> {
    const response = await fetch(`${info.origin}/fixture/control/${endpoint}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-Fixture-Nonce': info.nonce },
      body,
      signal: AbortSignal.timeout(15_000)
    })

    if (!response.ok) { throw new Error(`Fixture control ${endpoint}: HTTP ${response.status}`) }

    return response.json() as Promise<T>
  }

  return {
    info, dir, apiSha, logPath, control,
    async close() {
      if (exited === undefined) {
        await control('complete', '').catch(() => undefined)
        const code = await Promise.race([done, new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 15_000))])

        if (code === 'timeout') {
          await awaitOwnedChildExit()
          throw new Error(`API fixture cleanup timed out; ${logPath}`)
        }

        if (code !== 0) { throw new Error(`API fixture failed (${code}); ${logPath}`) }
      }

      if (exited !== 0) { throw new Error(`API fixture failed (${exited}); ${logPath}`) }
    }
  }
}
