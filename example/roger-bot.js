const Wechaty = require('../wechaty')
const bot = new Wechaty()

bot.init()
.then(bot.puppet.getLoginQrImgUrl.bind(bot.puppet))
.then(url => console.log(`Scan qrcode in url to login: \n${url}`))

bot.on('message', m => {
  console.log('RECV: ' + m.get('content'))  // 1. print received message

  const reply = new Wechaty.Message()       // 2. create reply message
  .set('to', m.get('from'))                 //    1) set receipt
  .set('content', 'roger.')                 //    2) set content

  bot.send(reply)                           // 3. do reply!
  .then(() => console.log('REPLY: roger.')) // 4. print reply message
})
