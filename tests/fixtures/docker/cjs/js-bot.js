const { WechatyBuilder } = require('wechaty')

const bot = new WechatyBuilder().build()
console.log(bot.version())
