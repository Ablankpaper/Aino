const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const platforms = {
  linux: { key: 'linux', directories: ['linux-unpacked', 'linux-arm64-unpacked', 'linux-armv7l-unpacked'] },
  darwin: { key: 'mac', directories: ['mac-arm64', 'mac', 'mac-universal'] },
  win32: { key: 'win', directories: ['win-unpacked', 'win-arm64-unpacked', 'win-ia32-unpacked'] },
}

function resolveDesktopArtifact(installDir, platform = process.platform) {
  const spec = platforms[platform]
  if (!spec) throw new Error(`Unsupported desktop platform: ${platform}`)
  const desktop = path.join(installDir, 'apps', 'desktop')
  const metadata = JSON.parse(fs.readFileSync(path.join(desktop, 'package.json'), 'utf8'))
  const build = metadata.build || {}
  const configuredName = build[spec.key]?.executableName ?? build.executableName
  // electron-builder defaults Linux to the package name, other hosts to productName.
  const name = configuredName ?? (platform === 'linux'
    ? metadata.name.toLowerCase()
    : build.productName || metadata.productName || metadata.name)
  const output = path.resolve(desktop, build.directories?.output || 'dist')

  for (const directory of spec.directories) {
    const artifactPath = path.join(output, directory, platform === 'darwin' ? `${name}.app` : platform === 'win32' ? `${name}.exe` : name)
    const executablePath = platform === 'darwin' ? path.join(artifactPath, 'Contents', 'MacOS', name) : artifactPath
    if (!fs.existsSync(executablePath)) continue
    const stat = fs.statSync(executablePath)
    if (!stat.isFile() || (platform !== 'win32' && (stat.mode & 0o111) === 0)) continue
    return { artifactPath, executablePath }
  }
  return null
}

function refreshPackagedLaunchSpec(spec, installDir, platform = process.platform) {
  if (spec.matchedShape !== 'packaged') return spec
  const artifact = resolveDesktopArtifact(installDir, platform)
  if (!artifact) throw new Error(`No packaged desktop artifact matches the installed package in ${installDir}`)
  return {
    ...spec,
    argv: [artifact.executablePath, ...spec.argv.slice(1)],
    cwd: spec.cwd === path.dirname(spec.argv[0]) ? path.dirname(artifact.executablePath) : spec.cwd,
  }
}

function captureUpdatedDesktopLaunch({ hermesPath, installDir, captureDir, specPath, env }) {
  fs.rmSync(specPath, { force: true })
  fs.rmSync(`${specPath}.captured`, { force: true })
  // The real CLI prepares the rebuilt sandbox helper before its final spawn.
  // Intercept only that spawn; do not replay pre-update launch assumptions.
  execFileSync(hermesPath, ['desktop', '--skip-build'], {
    cwd: installDir,
    env: {
      ...env,
      PYTHONPATH: [captureDir, env.PYTHONPATH].filter(Boolean).join(path.delimiter),
      HERMES_E2E_CAPTURE_LAUNCH: specPath,
    },
    stdio: ['ignore', 'inherit', 'inherit'],
    timeout: 5 * 60 * 1000,
  })
  if (!fs.existsSync(`${specPath}.captured`)) {
    throw new Error('updated hermes desktop exited successfully but no launch was captured')
  }
  return JSON.parse(fs.readFileSync(specPath, 'utf8'))
}

module.exports = { resolveDesktopArtifact, refreshPackagedLaunchSpec, captureUpdatedDesktopLaunch }

if (require.main === module) {
  const [installDir, platform = process.platform, field = 'artifact'] = process.argv.slice(2)
  try {
    const result = resolveDesktopArtifact(installDir, platform)
    if (!result) throw new Error(`No packaged desktop artifact matches the installed package in ${installDir}`)
    console.log(field === 'executable' ? result.executablePath : result.artifactPath)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
