const test = require('tape')
const Wechaty = require('../')

test('Wechaty Framework', t => {
  t.ok(Wechaty            , 'should export Wechaty')
  t.ok(Wechaty.Message    , 'should export Wechaty.Message')
  t.ok(Wechaty.Contact    , 'should export Wechaty.Contact')
  t.ok(Wechaty.Room       , 'should export Wechaty.Room')

  t.ok(Wechaty.IoBot      , 'should export Wechaty.IoBot')

  t.ok(Wechaty.log        , 'should export Wechaty.log')


  t.ok(Wechaty.Puppet     , 'should export Wechaty.Puppet')
  t.ok(Wechaty.PuppetWeb  , 'should export Wechaty.PuppetWeb')

  const bot = new Wechaty()
  t.equal(bot.version(true), Wechaty.version, 'should export version in package.json')

  t.end()
})

test('Wechaty config setting', t => {
  const Config = Wechaty.Config

  t.ok(Config                 , 'should export Wechaty.Config')
  t.ok(Config.DEFAULT_HEAD    , 'should has DEFAULT_HEAD')
  t.ok(Config.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
  t.ok(Config.DEFAULT_PORT    , 'should has DEFAULT_PORT')
  t.ok(Config.DEFAULT_PUPPET_PORT, 'should has DEFAULT_PUPPET_PORT')

  t.end()
})
