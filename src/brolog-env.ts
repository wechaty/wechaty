/**
 * Wechaty - Wechat for Bot
 *
 *  use brolog here is because log in wechaty has to support both nodejs and browser(with electron)
 *
 */
// const log = require('npmlog')
import log from 'brolog'

const level = process.env['WECHATY_LOG']

// use a typescript switch/case/default: never to replace regex
const levelRegexStr = 'silly|verbose|info|warn|error|silent'
const levelRegex = new RegExp(levelRegexStr, 'i')
if (levelRegex.test(level)) {
  log.level(level.toLowerCase())
  log.silly('Brolog', 'WECHATY_LOG set level to %s', level)
} else if (level) {
  log.warn('Brolog', 'env WECHATY_LOG(%s) must be one of silly|verbose|info|warn|error|silent', level)
}

export { log }
export default log
