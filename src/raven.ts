import type Raven from 'raven'

import os from 'os'

import {
  log,
}           from 'wechaty-puppet'
import type { GError } from 'gerror'

import {
  VERSION,
  GIT_COMMIT_HASH,
}                   from './config.js'

let raven: typeof Raven
let enabled = false

function getRavenDsn (): undefined | string {
  // const RAVEN_DSN = 'https://f6770399ee65459a82af82650231b22c:d8d11b283deb441e807079b8bb2c45cd@sentry.io/179672'
  const dsn = process.env['WECHATY_RAVEN_DSN']
  return dsn
}

function enableRaven (dsn: string):void  {
  /**
   * Raven.io
   */
  const ravenOptions = {
    release: VERSION,
    tags: {
      git_commit: GIT_COMMIT_HASH,
      platform: process.env['WECHATY_DOCKER']
        ? 'docker'
        : os.platform(),
    },
  }

  raven.disableConsoleAlerts()
  raven
    .config(dsn, ravenOptions)
    .install()

  enabled = true
}

async function init () {
  try {
    raven = await import('raven')
    log.verbose('Wechaty', 'init() Raven enabled (import("raven") succeed)')
  } catch (e) {
    // It's ok when there's no raven installed
    log.verbose('Wechaty', 'init() Raven disabled (import("raven") failed)')
    return
  }

  const dsn = getRavenDsn()
  if (!dsn) {
    log.verbose('Wechaty', 'init() getRavenDsn() return undefined, skipped.')
    return
  }

  enableRaven(dsn)
}

function wechatyCaptureException (e: GError) {
  if (enabled) {
    raven.captureException(e)
  }
}

init().catch(console.error)

export {
  wechatyCaptureException,
}
