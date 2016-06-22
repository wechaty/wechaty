const log = require('npmlog')

const level = process.env.WECHATY_LOG || process.env.WECHATY_DEBUG
const levelRegexStr = 'silly|verbose|info|warn|error'
const levelRegex = new RegExp(levelRegexStr, 'i')
if (levelRegex.test(level)) {
  log.level = level.toLowerCase()
  log.verbose('Npmlog', 'WECHATY_LOG set level to %s', level)
}
else if (level){
  log.warn('NpmLog', 'env WECHATY_LOG(%s) must be one of silly|verbose|info|warn|error', level)
}

module.exports = log
