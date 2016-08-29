'use strict'

const sinon = require('sinon')
const test  = require('tape')

const {execSync} = require('child_process')

const log   = require('../src/npmlog-env')

const docker = !!process.env.WECHATY_DOCKER

!docker && test('Docker test skipped', function(t) {
    t.pass('not in docker, skip docker tests')
    t.end()
})

docker && test('Docker smoking test', function(t) {
  const n = execSync('ps | grep Xvfb | wc -l')
  t.equal(n, 1, 'should has Xvfb started')

  t.end()
})
