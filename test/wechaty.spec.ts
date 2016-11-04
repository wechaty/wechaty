/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
    Config
  , Contact
  , FriendRequest
  , IoClient
  , Message
  , Puppet
  , PuppetWeb
  , Room
  , Wechaty

  , log
  , VERSION
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
  t.is(bot.version(true), require('../package.json').version
                        , 'should return version as the same in package.json'
  )
  t.is(VERSION, require('../package.json').version
                , 'should export version in package.json'
  )
})

test('Wechaty Config setting', t => {
  t.truthy(Config                 , 'should export Config')
  t.truthy(Config.DEFAULT_HEAD    , 'should has DEFAULT_HEAD')
  t.truthy(Config.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
  t.truthy(Config.DEFAULT_PORT    , 'should has DEFAULT_PORT')
})
