const Wechaty = require('..')
const bot = new Wechaty()

bot
.on('scan', ({url, code}) => {
  console.log(`Use Wechat to Scan QR Code in url to login: ${code}\n${url}`)
})
.on('message', m => {
  (!m.self()) && bot.reply(m, 'roger')               // 1. reply others' msg
  .then(() => console.log(`RECV: ${m}, REPLY: "roger"`))  // 2. log message
  .catch(e => console.error(e))                           // 3. catch exception
})
.init()
.catch(e => console.error(e))
