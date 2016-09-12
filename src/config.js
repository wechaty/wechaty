/**
 * Wechaty - Wechaty for Bot, Connect ChatBots, Chat as a Service
 * 
 * https://github.com/wechaty/wechaty/
 */
const Config = require('../package.json').wechaty

/**
 * 1. ENVIRONMENT VARIABLES + PACKAGES.JSON (default)
 */
Object.assign(Config, {
  head:       process.env.WECHATY_HEAD      || Config.DEFAULT_HEAD
  , puppet:   process.env.WECHATY_PUPPET    || Config.DEFAULT_PUPPET
  , apihost:  process.env.WECHATY_APIHOST   || Config.DEFAULT_APIHOST
  , validApiHost
})

function validApiHost(apihost) {
  if (/^[a-zA-Z0-9\.\-\_]+:?[0-9]*$/.test(apihost)) {
    return true
  }
  throw new Error('validApiHost() fail for ' + apihost)
}
validApiHost(Config.apihost)

/**
 * 2. ENVIRONMENT VARIABLES (only)
 */
Object.assign(Config, {
  port:       process.env.WECHATY_PORT      || null // 0 for disable port
  , profile:  process.env.WECHATY_PROFILE   || null // DO NOT set DEFAULT_PROFILE, because sometimes user do not want to save session
  , token:    process.env.WECHATY_TOKEN     || null // DO NOT set DEFAULT, because sometimes user do not want to connect to io cloud service
})

/**
 * 3. Service Settings
 */
Object.assign(Config, {
  // get PORT form cloud service env, ie: heroku
  httpPort: process.env.PORT || process.env.WECHATY_PORT || Config.DEFAULT_PORT
})

/**
 * 4. Envioronment Identify
 */
Object.assign(Config, {
  isDocker:   !!(process.env.WECHATY_DOCKER)
})

module.exports = Config.default = Config.Config = Config
