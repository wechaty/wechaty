import { test } from 'ava'

import { execSync } from 'child_process'
import sinon from 'sinon'

import { Config, log } from '../'

/**
 * need keep this !Config.isDocker because ava need at least one test() inside.
 *   × No tests found in test\docker.spec.js
 */
!Config.isDocker && test('Docker test skipped', function(t) {
  t.pass('not in docker. this test is to prevent AVA `× No tests found in test\docker.spec.js` error.')
})

Config.isDocker && test('Docker smoking test', function(t) {
  // const n = execSync('ps a | grep Xvfb | grep -v grep | wc -l').toString().replace(/\n/, '', 'g')
  // t.is(parseInt(n), 1, 'should has Xvfb started')
  t.notThrows(_ => {
    fs.accessSync(Config.BINARY_CHROMIUM, fs.X_OK)
  }, 'should exist xvfb-chrome exectable')
})
