/**
 * Smoke test verifying CommonJS execution in Node.js 26+.
 *
 * In Node.js 26+, require(esm) natively supports loading ES modules from CommonJS
 * when export conditions map to WinterTC standard "node" targets.
 */
const { WechatyBuilder } = require('wechaty')

const bot = WechatyBuilder.build()
console.log(bot.version())
