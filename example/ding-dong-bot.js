const log = require('npmlog')

const Wechaty = require('..')

const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
-------- https://github.com/zixia/wechaty --------

I'm a bot, my super power is talk in Wechat.

If you send me a 'ding', I will reply you a 'dong'!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me for more super powers!

Please wait... I'm trying to login in...

`
var loginname = ''

var querystring = require('querystring')
  , req = require('request')

var wxurl = 'http://45.113.70.237:8079/WeiXinServer/openWeChatServer';

console.log(welcome)
const bot = new Wechaty({ session: 'example-bot.wechaty.json' })

bot
.on('login'	  , user => {
  loginname = user.name()
  log.info('Bot', `${user.name()} logined`)
})
.on('logout'	, user => {
  log.info('Bot', `${user.name()} logouted`)
  loginname = ''
})
.on('scan', ({url, code}) => {
  console.log(`Scan QR Code in url to login: ${code}\n${url}`)
  if (!/201|200/.test(code)) {
    //调用接口
    console.log('开始调用接口')
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    //connJumposServer(loginUrl)
    // console.log("decodeURI:" + )
    var connectUrl = wxurl + "?type=wxlogin&url=" + url
    console.log("connectUrl:" + connectUrl)
    req.get(connectUrl, {}, function( err, res, body ){
      console.log("body:" + body );
    })
    require('qrcode-terminal').generate(loginUrl)
  }
})
.on('message', m => {
  m.ready()
  .then(msg => {
    log.info('Bot', 'recv1: %s', msg.getJumposStringEx())
    // log.info('Bot', 'recv1: %s', msg.getJumposString())
    var connectUrl = wxurl + "?type=wxmsg&msg=" + encodeURI(encodeURI('{\"loginname\":\"' + loginname + '\",' + msg.getJumposStringEx() + '}', 'UTF-8'), 'UTF-8')
    console.log("connectUrl:" + connectUrl)
    req.get(connectUrl, {}, function( err, res, body ){
      console.log("body:" + body ); 
    })

    if (/^(ding|ping|bing)$/i.test(m.get('content')) && !m.self()) {
      bot.reply(m, 'dong')
      .then(() => { log.warn('Bot', 'REPLY: dong') })
    }
  })
  .catch(e => log.error('Bot', 'ready: %s' , e))
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})

function logToFile(data) {
require('fs').appendFile('message.log', data + '\n\n#############################\n\n', err => {
  if (err) { log.error('LogToFile: %s', err) }
})
}

function connJumposServer(data) {
  console.log('connJumposServer:' + data)
}

  