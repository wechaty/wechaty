/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test }   from 'ava'

import {
    Config 
  , hasDockerContainerId
}                 from './config'
import { Puppet } from './puppet'

test('important variables', t => {
  t.true('head'     in Config, 'should exist `head` in Config')
  t.true('puppet'   in Config, 'should exist `puppet` in Config')
  t.true('apihost'  in Config, 'should exist `apihost` in Config')
  t.true('port'     in Config, 'should exist `port` in Config')
  t.true('profile'  in Config, 'should exist `profile` in Config')
  t.true('token'    in Config, 'should exist `token` in Config')

  t.truthy(Config.DEFAULT_PUPPET      , 'should export DEFAULT_PUPPET')
  t.truthy(Config.DEFAULT_PORT        , 'should export DEFAULT_PORT')
  t.truthy(Config.DEFAULT_PROFILE     , 'should export DEFAULT_PROFILE')
  t.truthy(Config.DEFAULT_HEAD        , 'should export DEFAULT_HEAD')
  t.truthy(Config.DEFAULT_PROTOCOL    , 'should export DEFAULT_PROTOCOL')
  t.truthy(Config.DEFAULT_APIHOST     , 'should export DEFAULT_APIHOST')
  t.truthy(Config.CMD_CHROMIUM        , 'should export CMD_CHROMIUM')
})

test('validApiHost()', t => {
  const OK_APIHOSTS = [
    'api.wechaty.io'
    , 'wechaty.io:8080'
  ]
  const ERR_APIHOSTS = [
    'https://api.wechaty.io'
    , 'wechaty.io/'
  ]
  OK_APIHOSTS.forEach(apihost => {
    t.notThrows(() => {
      Config.validApiHost(apihost)
    })
  }, 'should not row for right apihost')
  ERR_APIHOSTS.forEach(apihost => {
    t.throws(() => {
      Config.validApiHost(apihost)
    })
  }, 'should throw for error apihost')

})

test('puppetInstance()', t => {
  t.throws(() => {
    Config.puppetInstance()
  }, Error, 'should throw when not initialized')

  const EXPECTED = <Puppet>{userId: 'test'}
  const mockPuppet = EXPECTED

  Config.puppetInstance(mockPuppet)
  let instance = Config.puppetInstance()
  t.deepEqual(instance, EXPECTED, 'should equal with initialized data')

  Config.puppetInstance(null)
  t.throws(() => {
    Config.puppetInstance()
  }, Error, 'should throw after set to null')

})

test('isDocker', t => {
  t.true('isDocker' in Config, 'should identify docker env by `isDocker`')

  if ('C9_PORT' in process.env) {
    t.is(Config.isDocker, false, 'should not in docker mode in Cloud9 IDE')
  } else if (require('is-ci')) {
    t.is(Config.isDocker, false, 'should not in docker mode in Continuous Integeration System')
  } else {
    // a custom running envioronment, maybe docker, maybe not
  }

})

/**
 * issue #70 https://github.com/wechaty/wechaty/issues/70#issuecomment-258676376
 */
test('Module Singleton', t => {
  t.is(global['WECHATY_CONFIG_INSTANCE_COUNTER'], 1, 'should only load module for one time')
})

test('hasDockerContainerId()', t => {
  const ID = 'd22ff5ccbf50790c4724e19a30a6a6057d03d684ea3c2b0ddac1bf028e2cf470'
  const LINE = '1:name=systemd:/docker/f6da3e510ff2263a368cc8a57bf35b0d1c92a3d6d387e87de8e98e082af6a41c'
  const UBUNTU = '1:name=systemd:/init.scope'

  t.true(isDockerContainerId(ID)      , 'should identify container id right')
  t.true(isDockerContainerId(LINE)    , 'should identify container id from cgroup file right')
  t.false(isDockerContainerId(UBUNTU) , 'should identify ubuntu cgroup line not docker')
})
