import { test }   from 'ava'
import {
  Bridge,
  Browser,
  Event,
  PuppetWeb,
  Server,
  Watchdog,
} from './index'

test('PuppetWeb Module Exports', t => {
  t.truthy(PuppetWeb  , 'should export PuppetWeb')
  t.truthy(Event      , 'should export Event')
  t.truthy(Watchdog   , 'should export Watchdog')
  t.truthy(Server     , 'should export Server')
  t.truthy(Browser    , 'should export Browser')
  t.truthy(Bridge     , 'should export Bridge')
})
