/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import { test }   from 'ava'

import { Config } from './config'
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
    'api.wechaty.io',
    'wechaty.io:8080',
  ]
  const ERR_APIHOSTS = [
    'https://api.wechaty.io',
    'wechaty.io/',
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
  const instance = Config.puppetInstance()
  t.deepEqual(instance, EXPECTED, 'should equal with initialized data')

  Config.puppetInstance(null)
  t.throws(() => {
    Config.puppetInstance()
  }, Error, 'should throw after set to null')

})

test('dockerMode', t => {
  t.true('dockerMode' in Config, 'should identify docker env by `dockerMode`')

  if ('C9_PORT' in process.env) {
    t.is(Config.dockerMode, false, 'should not in docker mode in Cloud9 IDE')
  } else if (require('is-ci')) {
    t.is(Config.dockerMode, false, 'should not in docker mode in Continuous Integeration System')
  } else {
    // a custom running envioronment, maybe docker, maybe not
  }

})
