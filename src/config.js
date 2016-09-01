const Config = require('../package.json').wechaty

Object.assign(Config, {
  isDocker: !!process.env.WECHATY_DOCKER
  , head: process.env.WECHATY_HEAD || Config.DEFAULT_HEAD
})

module.exports = Config.default = Config.Config = Config
