const Wechaty = require('..')

const log = Wechaty.log
const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
       -------- https://wechaty.io --------

I'm a bot, my super power is download cloud bot from wechaty.io

__________________________________________________

Starting...

`

console.log(welcome)
const bot = new Wechaty({ profile: 'io-bot' })

bot
.on('login'	  , user => log.info('Bot', `${user.name()} logined`))
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('scan'    , ({url, code}) => log.info('Bot', `${url}\n[${code}] Scan QR Code in above url to login: `))
.on('message', m => {
  m.ready()
    .then(onMessage)
    .catch(e => log.error('Bot', 'ready: %s' , e))
})

bot.init()
.catch(e => {
  log.error('Bot', 'init() fail: %s', e)
  bot.quit()
  process.exit(-1)
})

const onMessage = function(m) {
  const from = m.from()
  const to = m.to()
  const content = m.toString()
  const room = m.room()

  log.info('Bot', '%s<%s>:%s'
                , (room ? '['+room.name()+']' : '')
                , from.name()
                , m.toStringDigest()
          )

  if (/^(ding|ping|bing)$/i.test(m.get('content')) && !bot.self(m)) {
    bot.reply(m, 'dong')
        .then(() => { log.info('Bot', 'REPLY: dong') })
  }

}
/**
 *
 * To make heroku happy
 *
 */
const app = require('express')()

app.get('/', function (req, res) {
  res.send('Wechaty Deployed on Heroku Succeed!')
})

app.listen(process.env.PORT, function () {
  console.log('Wechaty IO Bot listening on port ' + process.env.PORT + '!')
})