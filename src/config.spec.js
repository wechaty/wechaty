import { test }   from 'ava'
import { Config } from './config'

test('Config Module Exports', t => {
  t.truthy(Config.default   , 'should export default')
  t.truthy(Config.Config    , 'should export Config')

  t.true(typeof Config.isDocker !== 'undefined' , 'should identify docker env by isDocker')

  t.truthy(Config.DEFAULT_PUPPET  , 'should export DEFAULT_PUPPET')
  t.truthy(Config.DEFAULT_PORT    , 'should export DEFAULT_PORT')
  t.truthy(Config.DEFAULT_PROFILE , 'should export DEFAULT_PROFILE')
})


