const Config = require('../package.json').wechaty

Object.assign(Config, {
  isDocker:   !!process.env.WECHATY_DOCKER
  
  , head:     process.env.WECHATY_HEAD      || Config.DEFAULT_HEAD
  , puppet:   process.env.WECHATY_PUPPET    || Config.DEFAULT_PUPPET
  , endpoint: process.env.WECHATY_ENDPOINT  || Config.ENDPOINT  // wechaty.io api endpoint
  , port:     process.env.WECHATY_PORT      || 0 // 0 for disable port
  
  , profile:  process.env.WECHATY_PROFILE // DO NOT set to DEFAULT_PROFILE, because sometimes user do not want to save session
  , token:    process.env.WECHATY_TOKEN   // DO NOT set to DEFAULT, because sometimes user do not want to connect to io cloud service
})

module.exports = Config.default = Config.Config = Config
