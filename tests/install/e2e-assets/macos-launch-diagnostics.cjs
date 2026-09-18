const { execFile } = require('node:child_process')
const fs = require('node:fs/promises')
const path = require('node:path')
const { promisify } = require('node:util')

const run = promisify(execFile)

function launchedAppPids(processes, executablePath, parentPid) {
  return processes.split('\n').flatMap(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/)
    return match && Number(match[2]) === parentPid && match[3] === executablePath
      ? [Number(match[1])]
      : []
  })
}

async function captureMacosLaunchDiagnostics({ executablePath, outputPrefix, log }) {
  await fs.mkdir(path.dirname(outputPrefix), { recursive: true })
  const { stdout } = await run('/bin/ps', ['-axo', 'pid=,ppid=,state=,comm='], { timeout: 10_000 })
  await fs.writeFile(`${outputPrefix}.processes.txt`, stdout)
  const { stdout: identities } = await run('/bin/ps', ['-axo', 'pid=,ppid=,comm='], { timeout: 10_000 })
  const pids = launchedAppPids(identities, executablePath, process.pid)
  log(`macOS launch still pending; sampling owned app PID(s): ${pids.join(', ') || 'none found'}`)
  for (const pid of pids) {
    const samplePath = `${outputPrefix}.${pid}.sample.txt`
    try {
      await run('/usr/bin/sample', [String(pid), '3', '-file', samplePath], { timeout: 10_000 })
      log(`macOS launch sample: ${samplePath}`)
    } catch (error) {
      log(`macOS launch sample for PID ${pid} failed: ${error.message}`)
    }
  }
  // Full-desktop capture is only for the disposable CI runner, where native
  // permission dialogs are outside Playwright's page screenshot surface.
  if (process.env.GITHUB_ACTIONS === 'true') {
    await run('/usr/sbin/screencapture', ['-x', `${outputPrefix}.screen.png`], { timeout: 10_000 })
  }
}

async function diagnoseSlowMacosLaunch(launch, options) {
  let capture = Promise.resolve()
  const timer = setTimeout(() => {
    capture = captureMacosLaunchDiagnostics(options).catch(error => {
      options.log(`macOS launch diagnostics failed: ${error.message}`)
    })
  }, 60_000)
  try {
    return await launch()
  } finally {
    clearTimeout(timer)
    await capture
  }
}

module.exports = { launchedAppPids, captureMacosLaunchDiagnostics, diagnoseSlowMacosLaunch }
