const test = require('tape')
const Wechaty = require('../')
const Puppet = Wechaty.Puppet

test('Puppet smoking test', t => {
  const p = new Puppet()
  
  t.equal(p.readyState(), 'disconnected', 'should be disconnected state after instanciate')
  p.readyState('connecting')
  t.equal(p.readyState(), 'connecting', 'should be connecting state after set')

  t.end()
})
