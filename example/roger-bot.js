const log = require('npmlog')
const bot = new Wechaty({head: true})

bot.init()
.then(bot.getLoginQrImgUrl.bind(bot))
.then(url => console.log(`Scan qrcode in url to login: \n${url}`))
.catch(e => console.error(e))

bot.on('message', m => {
  console.log('RECV: ' + m.get('content'))  // 1. print received message

  const reply = new Wechaty.Message()       // 2. create reply message
  .set('to', m.get('from'))                 //    1) set receipt
  .set('content', 'roger.')                 //    2) set content

  bot.send(reply)                           // 3. do reply!
  .then(() => console.log('REPLY: roger.')) // 4. print reply message
  .catch(e => console.error(e))
})
