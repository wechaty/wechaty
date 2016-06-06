const Wechaty = require('..')
const bot = new Wechaty()

bot.init()
.on('scan', ({url, code}) => {
  console.log(`Use Wechat to scan qrcode in url to login: ${code}\n${url}`)
})
.on('message', m => {
  (!m.self()) && bot.send(m.reply('roger'))               // 1. reply others' msg
  .then(() => console.log(`RECV: ${m}, REPLY: "roger"`))  // 2. log message
  .catch(e => console.error(e))                           // 3. catch exception
})
.catch(e => console.error(e))
