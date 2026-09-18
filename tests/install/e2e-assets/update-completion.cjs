const fs = require('node:fs')
const path = require('node:path')

function optionalRead(file) {
  try { return fs.readFileSync(file, 'utf8') } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function createUpdateCompletionObserver({ resultPath, expectedSha, hermesHome }) {
  const home = resultPath ? path.dirname(resultPath) : hermesHome
  if (!home) throw new Error('HERMES_HOME is required to observe the update marker without --result')
  if (!resultPath && !expectedSha) throw new Error('An update result path or expected SHA is required')
  const markerPath = path.join(home, '.hermes-update-in-progress')
  const logPath = path.join(home, 'logs', 'desktop.log')
  let logOffset = 0
  let logIdentity = ''
  let pendingLine = ''
  let success = null
  let failure = null
  let pendingReason = 'waiting for this update to finish'

  // Start before clicking Update now. A previous result or log line must not
  // authorize this run, including when the app consumes the new result first.
  if (resultPath) fs.rmSync(resultPath, { force: true })
  try {
    const stat = fs.statSync(logPath)
    logOffset = stat.size
    logIdentity = `${stat.dev}:${stat.ino}`
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  function readNewLog() {
    let fd
    try { fd = fs.openSync(logPath, 'r') } catch (error) {
      if (error.code === 'ENOENT') return ''
      throw error
    }
    try {
      const stat = fs.fstatSync(fd)
      const identity = `${stat.dev}:${stat.ino}`
      if (identity !== logIdentity || stat.size < logOffset) {
        logOffset = 0
        pendingLine = ''
      }
      logIdentity = identity
      const buffer = Buffer.alloc(stat.size - logOffset)
      const count = fs.readSync(fd, buffer, 0, buffer.length, logOffset)
      logOffset += count
      return buffer.subarray(0, count).toString('utf8')
    } finally {
      fs.closeSync(fd)
    }
  }

  function capture() {
    try {
      if (resultPath) {
        const raw = optionalRead(resultPath)
        if (raw !== null) {
          let result
          try { result = JSON.parse(raw.replace(/^\uFEFF/, '')) } catch (error) {
            if (!(error instanceof SyntaxError)) throw error
            pendingReason = 'update result is not yet complete JSON'
          }
          if (result?.ok === false) failure = new Error(`updater failed: ${result.message || result.exit_code}`)
          if (result?.ok === true) success = `result file: ${result.message || 'ok=true'}`
        }
      }
      const chunk = readNewLog()
      const lines = (pendingLine + chunk).split('\n')
      pendingLine = lines.pop()
      for (const line of lines) {
        if (line.includes('[updates] detached update FAILED')) failure = new Error(line.trim())
        if (line.includes('[updates] detached update finished OK') || line.includes('[updates] detached update finished with manual action')) {
          success = `desktop log: ${line.trim()}`
        }
      }
    } catch (error) {
      failure = error
    }
  }

  capture()
  const timer = setInterval(capture, 100)
  timer.unref()

  return {
    check(currentSha) {
      capture()
      if (failure) throw failure
      const complete = (!expectedSha || currentSha === expectedSha)
        && !fs.existsSync(markerPath) && (!resultPath || Boolean(success))
      return { complete, evidence: success, pendingReason }
    },
    close() { clearInterval(timer) },
  }
}

module.exports = { createUpdateCompletionObserver }
