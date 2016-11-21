/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'
import { PuppetWeb } from './puppet-web'

test('Puppet smoking test', t => {
  const p = new PuppetWeb()

  t.is(p.state.target(), 'dead', 'should be dead target state after instanciate')
  t.is(p.state.current(), 'dead', 'should be dead current state after instanciate')
  p.state.target('live')
  p.state.current('live', false)
  t.is(p.state.target(), 'live', 'should be live target state after set')
  t.is(p.state.current(), 'live', 'should be live current state after set')
  t.is(p.state.inprocess(), true, 'should be inprocess current state after set')
})
