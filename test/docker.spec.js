import { test } from 'ava'

import { execSync } from 'child_process'
import sinon from 'sinon'

import { log } from '../'

const docker = !!process.env.WECHATY_DOCKER

!docker && test('Docker test skipped', function(t) {
    t.pass('not in docker, skip docker tests')
})

docker && test('Docker smoking test', function(t) {
  const n = execSync('ps a | grep Xvfb | grep -v grep | wc -l').toString()
  t.is(n, 1, 'should has Xvfb started')
})
