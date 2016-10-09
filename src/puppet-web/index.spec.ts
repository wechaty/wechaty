import { test }   from 'ava'
import PuppetWeb  from './'

test('PuppetWeb Module Exports', t => {
  t.truthy(PuppetWeb.default    , 'should export default')
  t.truthy(PuppetWeb.PuppetWeb  , 'should export PuppetWeb')
  t.truthy(PuppetWeb.Event      , 'should export Event')
  t.truthy(PuppetWeb.Watchdog   , 'should export Watchdog')
  t.truthy(PuppetWeb.Server     , 'should export Server')
  t.truthy(PuppetWeb.Browser    , 'should export Browser')
  t.truthy(PuppetWeb.Bridge     , 'should export Bridge')
})


