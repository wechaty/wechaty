const test = require('tap').test
const log = require('./npmlog-env')

test('Wechaty Library', function(t) {
  const Wechaty = require('../')
  t.ok(Wechaty            , 'should have Wechaty exports')
  t.ok(Wechaty.Message    , 'should have Wechaty.Message exports')
  t.ok(Wechaty.Contact    , 'should have Wechaty.Contact exports')
  t.ok(Wechaty.Room       , 'should have Wechaty.Room exports')

  t.ok(Wechaty.Puppet     , 'should have Wechaty.Puppet exports')
  t.ok(Wechaty.Puppet.Web , 'should have Wechaty.Puppet.Web exports')

  t.end()
})