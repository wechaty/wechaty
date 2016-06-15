const test = require('tap').test
const log = require('../src/npmlog-env')

test('Wechaty Library', function(t) {
  const Wechaty = require('../')
  t.ok(Wechaty            , 'should export Wechaty')
  t.ok(Wechaty.Message    , 'should export Wechaty.Message')
  t.ok(Wechaty.Contact    , 'should export Wechaty.Contact')
  t.ok(Wechaty.Room       , 'should export Wechaty.Room')

  t.ok(Wechaty.Puppet     , 'should export Wechaty.Puppet')
  t.ok(Wechaty.Puppet.Web , 'should export Wechaty.Puppet.Web')

  t.end()
})