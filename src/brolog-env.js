// const log = require('npmlog')
const log = require('brolog')

const level = process.env.WECHATY_LOG
const levelRegexStr = 'silly|verbose|info|warn|error|silent'
const levelRegex = new RegExp(levelRegexStr, 'i')
if (levelRegex.test(level)) {
  //log.level = level.toLowerCase()
  log.level(level)
  log.verbose('Brolog', 'WECHATY_LOG set level to %s', level)
}
else if (level){
  log.warn('Brolog', 'env WECHATY_LOG(%s) must be one of silly|verbose|info|warn|error|silent', level)
}

module.exports = log.default = log
