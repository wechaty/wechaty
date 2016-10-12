import { test } from 'ava'

import {
    Config
  , Contact
  , IoClient
  , Message
  , Puppet
  , PuppetWeb
  , Room
  , Wechaty

  , log
  , version
}               from '../'

test('Wechaty Framework', t => {
  t.truthy(Wechaty    , 'should export Wechaty')
  t.truthy(Message    , 'should export Message')
  t.truthy(Contact    , 'should export Contact')
  t.truthy(Room       , 'should export Room')

  t.truthy(IoClient   , 'should export IoClient')

  t.truthy(log        , 'should export log')


  t.truthy(Puppet     , 'should export Puppet')
  t.truthy(PuppetWeb  , 'should export PuppetWeb')

  const bot = Wechaty.instance()
  t.is(bot.version(true), version, 'should export version in package.json')
})

test('Wechaty Config setting', t => {

  t.truthy(Config                 , 'should export Config')
  t.truthy(Config.DEFAULT_HEAD    , 'should has DEFAULT_HEAD')
  t.truthy(Config.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
  t.truthy(Config.DEFAULT_PORT    , 'should has DEFAULT_PORT')
})
