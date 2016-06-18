const log = require('npmlog')

const level = process.env.WECHATY_DEBUG || process.env.WECHATY_LOG
const levelRegexStr = 'silly|verbose|info|warn|error'
const levelRegex = new RegExp(levelRegexStr, 'i')
if (levelRegex.test(level)) {
  log.level = level.toLowerCase()
  log.verbose('Npmlog', 'WECHATY_DEBUG set level to %s', level)
}
else if (level){
  log.warn('Npmlog', 'env WECHATY_DEBUG(%s) must be one of silly|verbose|info|warn|error', level)
}

module.exports = log
