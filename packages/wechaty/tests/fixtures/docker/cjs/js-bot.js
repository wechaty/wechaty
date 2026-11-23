const { WechatyBuilder } = require('wechaty')

const bot = WechatyBuilder.build()
console.log(bot.version())
