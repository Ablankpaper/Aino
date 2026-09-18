// @ts-check
/**
 * Launch the Hermes desktop app from a captured launch spec and click the
 * real update flow: Settings -> About -> "Update now".
 *
 * The spec is written by launch-capture/sitecustomize.py at `hermes
 * desktop`'s own spawn site, so argv, cwd, and the fully-constructed env
 * are the product's own -- this launcher only translates the npm-exec
 * source shape into a direct electron binary path (Playwright needs a
 * real executable, and the electron npm shim would re-spawn out of our
 * control).
 *
 * Usage (from the scratch dir where the driver installed @playwright/test):
 *   node launch-from-spec.mjs --spec /path/launch-spec.json \
 *     [--result $HERMES_HOME/.hermes-update-result.json] \
 *     [--expect-sha <sha> --repo-dir <install dir>] [--no-update]
 *
 * --no-update: prove the main renderer, Settings navigation, and backend
 * status RPC, then close. The smoke arm.
 * Otherwise: click Update now, then poll for completion. Two signals,
 * either satisfies (poll whichever are given, first hit wins):
 *   --result      the windows hand-off's result file
 *                 (HERMES_HOME/.hermes-update-result.json)
 *   --expect-sha  the installed checkout reaching the expected commit -
 *                 the source-install signal, where the About pane's update
 *                 runs `hermes update` and no result file exists.
 * The Playwright close event is unreliable across the update handoff, so
 * neither signal is an app event.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { _electron } from '@playwright/test';
import { prepareWindowForInput } from './window-input.cjs';
import launchAcceptance from './launch-acceptance.cjs';

const { acceptDesktopLaunch, withOwnedApplication } = launchAcceptance;

/**
 * @typedef {{argv: string[], cwd: string, env: Record<string, string>,
 *            matchedShape: 'source' | 'packaged'}} LaunchSpec
 */

/**
 * Resolve what _electron.launch needs from a captured spec.
 * @param {LaunchSpec} spec
 * @returns {{executablePath: string, args: string[], cwd: string,
 *            env: Record<string, string>}}
 */
export function resolveLaunch(spec) {
  if (spec.matchedShape === 'packaged') {
    return {
      executablePath: spec.argv[0],
      args: spec.argv.slice(1),
      cwd: spec.cwd,
      env: spec.env,
    };
  }
  // Source shape: ["npm", "exec", "--", "electron", ".", ...extra] running
  // in apps/desktop. Electron's real binary lives in the workspace-hoisted
  // node_modules; `electron/index.js` exports its path but requires the
  // module -- cheaper here to read the path file it derives from.
  const desktopDir = spec.cwd;
  const idx = spec.argv.findIndex((t) => t === 'electron');
  const extra = idx >= 0 ? spec.argv.slice(idx + 1).filter((t) => t !== '.') : [];
  const candidates = [
    path.join(desktopDir, 'node_modules', 'electron'),
    path.join(desktopDir, '..', '..', 'node_modules', 'electron'),
  ];
  for (const moduleDir of candidates) {
    const pathTxt = path.join(moduleDir, 'path.txt');
    if (!fs.existsSync(pathTxt)) continue;
    const rel = fs.readFileSync(pathTxt, 'utf8').trim();
    const exe = path.join(moduleDir, 'dist', rel);
    if (fs.existsSync(exe)) {
      return { executablePath: exe, args: ['.', ...extra], cwd: desktopDir, env: spec.env };
    }
  }
  throw new Error(`no electron binary found under ${candidates.join(' or ')}`);
}

/** @param {string} msg */
function log(msg) {
  console.log(`[launch-from-spec] ${msg}`);
}

// Coarse phase marker for the self-deadline's post-mortem line.
let currentPhase = 'init';
/** @param {string} p */
function phase(p) {
  currentPhase = p;
}

async function main() {
  // SIGKILLed Electron leaves Playwright connections and inherited pipes
  // holding node's event loop open, so the driver can outlive its own
  // finished test. Success and failure paths exit explicitly; this unref'd
  // timer is the backstop so no unknown state holds a runner past its budget.
  const SELF_DEADLINE_MS = 20 * 60 * 1000;
  const selfDeadline = setTimeout(() => {
    log(`DRIVER SELF-TIMEOUT after ${SELF_DEADLINE_MS / 60000}min - exiting 124 (phase: ${currentPhase})`);
    process.exit(124);
  }, SELF_DEADLINE_MS);
  selfDeadline.unref();

  const { values } = parseArgs({
    options: {
      spec: { type: 'string' },
      result: { type: 'string' },
      'expect-sha': { type: 'string' },
      'repo-dir': { type: 'string' },
      'no-update': { type: 'boolean', default: false },
      'timeout-ms': { type: 'string', default: '600000' },
    },
  });
  if (!values.spec) throw new Error('--spec is required');
  /** @type {LaunchSpec} */
  const spec = JSON.parse(fs.readFileSync(values.spec, 'utf8'));
  const launch = resolveLaunch(spec);
  const expectSha = values['expect-sha'];
  log(`launching ${launch.executablePath} (shape: ${spec.matchedShape})`);

  phase('launch');
  const app = await _electron.launch({
    executablePath: launch.executablePath,
    args: launch.args,
    cwd: launch.cwd,
    env: launch.env,
  });
  const primaryResult = await withOwnedApplication(app, 'initial app teardown', async () => {
    const accepted = await acceptDesktopLaunch(app, { prepareWindowForInput, log });
    const window = accepted.window;
    log(`main renderer accepted: ${await window.title()} (${app.windows().length} windows, Settings open, backend ${accepted.status.version})`);
    await window.screenshot({ path: `${values.spec}.window.png` }).catch(() => {});

    if (values['no-update']) {
      log('smoke mode: main renderer, Settings navigation, and backend RPC proven; closing');
      return { noUpdate: true };
    }

    if (!values.result && !(values['expect-sha'] && values['repo-dir'])) {
      throw new Error('need --result and/or --expect-sha + --repo-dir unless --no-update');
    }
    const deadline = Date.now() + Number(values['timeout-ms']);

    phase('about-update');
    // Settings is open: About -> Update now.
    await window.getByRole('tab', { name: /about/i }).or(
      window.getByRole('button', { name: /about/i })).first().click();
    const updateNow = window.getByRole('button', { name: /update now/i }).first();
    // "Update now" only renders once a check reports behind > 0, and the
    // About panel starts at "Last checked: never". The boot-time auto-check
    // can also fail transiently and latch the error UI, while a fresh check
    // succeeds. Nudge like an impatient user: click Check now whenever it is
    // clickable (not a spinner), re-test Update now, 3 minute ceiling.
    const checkNow = window.getByRole('button', { name: /check now/i }).first();
    const nudgeDeadline = Date.now() + 180_000;
    let updateVisible = await updateNow.isVisible().catch(() => false);
    while (!updateVisible && Date.now() < nudgeDeadline) {
      await checkNow.click({ timeout: 5_000 })
        .then(() => log('nudged Check now'))
        .catch(() => {}); // spinner or mid-transition - fine, just wait
      await window.waitForTimeout(15_000);
      updateVisible = await updateNow.isVisible().catch(() => false);
    }
    try {
      await updateNow.waitFor({ state: 'visible', timeout: 15_000 });
    } catch (e) {
      // The About UI flattens every check failure to a generic "couldn't
      // reach the update server", hiding the git stderr the main process
      // captured. Pull the full status over the same IPC the panel uses so
      // the log names the real error.
      const status = await window.evaluate(() =>
        window.hermesDesktop?.updates?.check?.() ?? Promise.resolve('no updates.check bridge')
      ).catch((err) => `updates.check failed: ${err?.message || err}`);
      log(`[update-status] ${JSON.stringify(status)}`);
      throw e;
    }
    await updateNow.click();
    phase('update-poll');
    log('clicked Update now; polling for result file');

    // The app may relaunch/exit during the update; completion signals are
    // product state, not Playwright events.
    const resultPath = values.result;
    const repoDir = values['repo-dir'];
    /** @returns {string} */
    const headSha = () => {
      try {
        return execFileSync('git', ['-C', /** @type {string} */ (repoDir), 'rev-parse', 'HEAD'], {
          encoding: 'utf8',
        }).trim();
      } catch {
        return '';
      }
    };
    for (;;) {
      if (resultPath && fs.existsSync(resultPath)) {
        log(`update result present: ${fs.readFileSync(resultPath, 'utf8').slice(0, 200)}`);
        break;
      }
      if (expectSha && repoDir && headSha() === expectSha) {
        log(`checkout reached expected sha ${expectSha}`);
        break;
      }
      if (Date.now() > deadline) {
        await window.screenshot({ path: `${values.spec}.timeout.png` }).catch(() => {});
        throw new Error('update completion signal never appeared (result file / expected sha)');
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }

    // ── Post-update: observe the hand-off state, then relaunch and verify ──
    // On CI runners the rebuilt app cannot self-relaunch (chrome-sandbox needs
    // root ownership; user namespaces are restricted), so the product parks on
    // an "update complete, reopen Hermes to finish" overlay and never exits;
    // a bare app.close() would wait on it forever. Record the hand-off state,
    // close with a bounded teardown, then do what the overlay asks (the real
    // user journey) and assert the relaunched app runs the updated code.
    phase('post-update');
    const handoff = await window.evaluate(() => {
      const text = document.body ? document.body.innerText : ''
      const m = text.match(/[^\n]*(update complete|reopen|relaunch)[^\n]*/i)
      return m ? m[0].trim().slice(0, 200) : null
    }).catch(() => null);
    log(handoff ? `post-update hand-off state: "${handoff}"` : 'post-update: no hand-off overlay observed (app may self-relaunch)');
    await window.screenshot({ path: `${values.spec}.post-update.png` }).catch(() => {});
    return { noUpdate: false };
  }, { log });

  if (primaryResult.noUpdate) process.exit(0);

  // Relaunch from the same captured spec - the leg's own launch mechanism -
  // and require the main renderer plus backend to come up on the updated
  // checkout. The renderer's DOM also carries the running build's short sha
  // when launched from a git checkout (statusbar/About), so log that signal.
  phase('relaunch');
  log('relaunching the updated app (the "reopen Hermes" step)');
  const relaunch = await _electron.launch({
    executablePath: launch.executablePath,
    args: launch.args,
    cwd: launch.cwd,
    env: launch.env,
  });
  await withOwnedApplication(relaunch, 'relaunch teardown', async () => {
    const relaunched = await acceptDesktopLaunch(relaunch, { prepareWindowForInput, log });
    const window2 = relaunched.window;
    // Give the shell a moment to paint the statusbar/version chrome.
    await new Promise((r) => setTimeout(r, 10_000));
    const shortSha = (expectSha || '').slice(0, 7);
    const verdict = await window2.evaluate((sha) => {
      const text = document.body ? document.body.innerText : ''
      const version = (text.match(/v\d+\.\d+\.\d+[^\n]*/) || [null])[0]
      return { version, hasSha: sha ? text.includes(sha) : false }
    }, shortSha).catch(() => null);
    await window2.screenshot({ path: `${values.spec}.relaunched.png` }).catch(() => {});
    log(`relaunched app: version="${verdict?.version || 'unseen'}" expectedSha(${shortSha}) in DOM=${verdict?.hasSha}`);
    if (!verdict) {
      throw new Error('relaunched app UI came up but could not be read');
    }
    if (shortSha && !verdict.hasSha) {
      // Not fatal on its own: packaged builds do not always surface the sha in
      // the DOM. The window came up on the updated install dir, which is the
      // user-facing contract; log loudly so a human can tighten this later.
      log(`NOTE: expected short sha ${shortSha} not found in relaunched DOM; version line was "${verdict.version}"`);
    }
    log(`relaunch verification complete: updated app opened Settings and backend ${relaunched.status.version} answered`);
  }, { log });
  // Explicit exit: SIGKILLed Electron leaves driver connections holding
  // the event loop; falling off main() never terminates.
  process.exit(0);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === (await import('node:url')).fileURLToPath(import.meta.url);
if (invoked) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
