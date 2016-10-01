import { test }   from 'ava'
import { Config } from './config'

test('Config list vars', t => {
  t.truthy(Config.default   , 'should export default')
  t.truthy(Config.Config    , 'should export Config')

  t.true('head'     in Config, 'should exist `head` in Config')
  t.true('puppet'   in Config, 'should exist `puppet` in Config')
  t.true('apihost'  in Config, 'should exist `apihost` in Config')
  t.true('port'     in Config, 'should exist `port` in Config')
  t.true('profile'  in Config, 'should exist `profile` in Config')
  t.true('token'    in Config, 'should exist `token` in Config')

  t.truthy(Config.DEFAULT_PUPPET      , 'should export DEFAULT_PUPPET')
  t.truthy(Config.DEFAULT_PORT        , 'should export DEFAULT_PORT')
  t.truthy(Config.DEFAULT_PROFILE     , 'should export DEFAULT_PROFILE')
  t.truthy(Config.DEFAULT_HEAD        , 'should export DEFAULT_HEAD')
  t.truthy(Config.DEFAULT_PROTOCOL    , 'should export DEFAULT_PROTOCOL')
  t.truthy(Config.DEFAULT_APIHOST     , 'should export DEFAULT_APIHOST')
  t.truthy(Config.CMD_CHROMIUM        , 'should export CMD_CHROMIUM')
})

test('Config methods', t => {
  const OK_APIHOSTS = [
    'api.wechaty.io'
    , 'wechaty.io:8080'
  ]
  const ERR_APIHOSTS = [
    'https://api.wechaty.io'
    , 'wechaty.io/'
  ]
  OK_APIHOSTS.forEach(apihost => {
    t.notThrows(_ => {
      Config.validApiHost(apihost)
    })
  }, 'should not row for right apihost')
  ERR_APIHOSTS.forEach(apihost => { 
    t.throws(_ => {
      Config.validApiHost(apihost)
    })
  }, 'should throw for error apihost')

  t.true('isDocker' in Config, 'should identify docker env by `isDocker`')

})