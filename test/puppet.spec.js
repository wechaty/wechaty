import { test } from 'ava'
import { Wechaty, Puppet } from '../'
// const test = require('tape')
// const Wechaty = require('../')
// const Puppet = Wechaty.Puppet

test('Puppet smoking test', t => {
  const p = new Puppet()
  
  t.is(p.readyState(), 'disconnected', 'should be disconnected state after instanciate')
  p.readyState('connecting')
  t.is(p.readyState(), 'connecting', 'should be connecting state after set')

  // t.end()
})
