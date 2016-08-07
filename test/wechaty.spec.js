const test = require('tape')
const log = require('../src/npmlog-env')

test('Wechaty Framework', function(t) {
  const Wechaty = require('../')
  t.ok(Wechaty            , 'should export Wechaty')
  t.ok(Wechaty.Message    , 'should export Wechaty.Message')
  t.ok(Wechaty.Contact    , 'should export Wechaty.Contact')
  t.ok(Wechaty.Room       , 'should export Wechaty.Room')

  // t.ok(Wechaty.Puppet     , 'should export Wechaty.Puppet')
  // t.ok(Wechaty.Puppet.Web , 'should export Wechaty.Puppet.Web')

  const bot = new Wechaty()
  t.equal(bot.version(), Wechaty.version, 'should export version in package.json')

  t.end()
})