import { test }     from 'ava'
import { Wechaty }  from '../'

test('Wechaty Framework', t => {
  t.truthy(Wechaty            , 'should export Wechaty')
  t.truthy(Wechaty.Message    , 'should export Wechaty.Message')
  t.truthy(Wechaty.Contact    , 'should export Wechaty.Contact')
  t.truthy(Wechaty.Room       , 'should export Wechaty.Room')

  t.truthy(Wechaty.IoClient   , 'should export Wechaty.IoClient')

  t.truthy(Wechaty.log        , 'should export Wechaty.log')


  t.truthy(Wechaty.Puppet     , 'should export Wechaty.Puppet')
  t.truthy(Wechaty.PuppetWeb  , 'should export Wechaty.PuppetWeb')

  const bot = new Wechaty()
  t.is(bot.version(true), Wechaty.version, 'should export version in package.json')
})

test('Wechaty Config setting', t => {
  const Config = Wechaty.Config

  t.truthy(Config                 , 'should export Wechaty.Config')
  t.truthy(Config.DEFAULT_HEAD    , 'should has DEFAULT_HEAD')
  t.truthy(Config.DEFAULT_PUPPET  , 'should has DEFAULT_PUPPET')
  t.truthy(Config.DEFAULT_PORT    , 'should has DEFAULT_PORT')
})
