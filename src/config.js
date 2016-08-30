const Config = {
  isDocker: !!process.env.WECHATY_DOCKER
}

Object.assign(Config, require('../package.json').wechaty)

module.exports = Config.default = Config.Config = Config
