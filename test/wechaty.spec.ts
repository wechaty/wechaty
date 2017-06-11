/**
 *   Chatie - https://github.com/chatie
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
import { test } from 'ava'

import {
  Config,
  Contact,
  FriendRequest,
  IoClient,
  Message,
  Puppet,
  PuppetWeb,
  Room,
  Wechaty,

  log,
  VERSION,
}               from '../'

test('Wechaty Framework', t => {
  t.truthy(Contact      , 'should export Contact')
  t.truthy(FriendRequest, 'should export FriendREquest')
  t.truthy(IoClient     , 'should export IoClient')
  t.truthy(Message      , 'should export Message')
  t.truthy(Puppet       , 'should export Puppet')
  t.truthy(PuppetWeb    , 'should export PuppetWeb')
  t.truthy(Room         , 'should export Room')
  t.truthy(Wechaty      , 'should export Wechaty')
  t.truthy(log          , 'should export log')

  const bot = Wechaty.instance()
  t.is(bot.version(true), require('../package.json').version,
                          'should return version as the same in package.json',
  )
  t.is(VERSION, require('../package.json').version,
                  'should export version in package.json',
  )
})

test('Wechaty Config setting', t => {
  t.truthy(Config                 , 'should export Config')
  t.truthy(Config.DEFAULT_HEAD    , 'should has DEFAULT_HEAD')
  t.truthy(Config.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
  t.truthy(Config.DEFAULT_PORT    , 'should has DEFAULT_PORT')
})
