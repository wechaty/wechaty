import { test } from 'ava'
import { Wechaty, Puppet } from '../'
// const test = require('tape')
// const Wechaty = require('../')
// const Puppet = Wechaty.Puppet

test('Puppet smoking test', t => {
  const p = new Puppet()
  
  t.is(p.targetState(), 'dead', 'should be dead target state after instanciate')
  t.is(p.currentState(), 'dead', 'should be dead current state after instanciate')
  p.targetState('live')
  p.currentState('birthing')
  t.is(p.targetState(), 'live', 'should be live target state after set')
  t.is(p.currentState(), 'birthing', 'should be birthing current state after set')

  // t.end()
})
