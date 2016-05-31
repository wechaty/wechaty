const test = require('tap').test

test('Wechaty Library', function(t) {
  const Wechaty = require('../')
  t.ok(Wechaty            , 'should have Wechaty exports')
  t.ok(Wechaty.Message    , 'should have Wechaty.Message exports')
  t.ok(Wechaty.Contact    , 'should have Wechaty.Contact exports')
  t.ok(Wechaty.Group      , 'should have Wechaty.Group exports')
  
  t.ok(Wechaty.Puppet     , 'should have Wechaty.Puppet exports')
  t.ok(Wechaty.Puppet.Web , 'should have Wechaty.Puppet.Web exports')
  
  t.end()
})