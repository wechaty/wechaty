/**
 *
 * Wechaty - Wechat for Bot
 *
 * Connecting ChatBots
 * https://github.com/wechaty/wechaty
 *
 */

import { PassThrough }        from 'stream'
// import { createWriteStream }  from 'fs'

import request      = require('request')
import Ffmpeg       = require('fluent-ffmpeg')
import querystring  = require('querystring')

/* tslint:disable:variable-name */
const QrcodeTerminal = require('qrcode-terminal')

import {
  Config,
  MediaMessage,
  MsgType,
  Wechaty,
} from '../'

const bot = Wechaty.instance({ profile: Config.DEFAULT_PROFILE })

bot
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    let loginUrl = url.replace(/\/qrcode\//, '/l/')
    QrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('login'	  , user => console.log(`${user} logined`))
.on('message', async function(this, m) {
  console.log(`RECV: ${m}`)

  if (m.type() !== MsgType.VOICE) {
    return // skip no-VOICE message
  }

  const mp3Stream = await (m as MediaMessage).readyStream()
  const text = await voiceToText(mp3Stream)

  console.log('VOICE TO TEXT: ' + text)

  this.say(text)  // send text to 'filehelper'
})
.init()
.catch(e => console.error('bot.init() error: ' + e))

async function voiceToText(mp3Stream: NodeJS.ReadableStream): Promise<string> {
  const wavStream = mp3ToWav(mp3Stream)

  // const textStream = wavToText(wavStream)

  // textStream.on('data', text => {
  //   console.log(text)
  // })

  try {
    const text = await wavToText(wavStream)
    return text

  } catch (e) {
    console.log(e)
    return ''
  }
}

function mp3ToWav(mp3Stream: NodeJS.ReadableStream): NodeJS.ReadableStream {
  const wavStream = new PassThrough()

  Ffmpeg(mp3Stream)
    .fromFormat('mp3')
    .toFormat('wav')
    .pipe(wavStream as any)

    // .on('start', function(commandLine) {
    //   console.log('Spawned Ffmpeg with command: ' + commandLine);
    // })
    // .on('codecData', function(data) {
    //   console.log('Input is ' + data.audio + ' audio ' +
    //     'with ' + data.video + ' video');
    // })
    // .on('progress', progress => {
    //   console.log('Processing: ' + progress.percent + '% done');
    // })
    // .on('end', function() {
    //   console.log('Finished processing');
    // })
    .on('error', function(err, stdout, stderr) {
      console.log('Cannot process video: ' + err.message);
    })

  return wavStream
}

/**
 * export BAIDU_SPEECH_API_KEY=FK58sUlteAuAIXZl5dWzAHCT
 * export BAIDU_SPEECH_SECRET_KEY=feaf24adcc5b8f02b147e7f7b1953030
 * curl "https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_SPEECH_API_KEY}&client_secret=${BAIDU_SPEECH_SECRET_KEY}"
 */

/**
 * OAuth: http://developer.baidu.com/wiki/index.php?title=docs/oauth/overview
 * ASR: http://yuyin.baidu.com/docs/asr/57
 */
async function wavToText(readableStream: NodeJS.ReadableStream): Promise<string> {
  const params = {
    'cuid': 'wechaty',
    'lan': 'zh',
    'token': '24.8c6a25b5dcfb41af189a97d9e0b7c076.2592000.1482571685.282335-8943256'
  }

  const apiUrl = 'http://vop.baidu.com/server_api?'
                + querystring.stringify(params)

  const options = {
    headers: {
      'Content-Type': 'audio/wav; rate=8000',
    },
  }

  return new Promise<string>((resolve, reject) => {
    readableStream.pipe(request.post(apiUrl, options, (err, httpResponse, body) => {
      // "err_msg":"success.","err_no":0,"result":["这是一个测试测试语音转文字，"]
      if (err) {
        return reject(err)
      }
      try {
        const obj = JSON.parse(body)
        if (obj.err_no !== 0) {
          return reject(new Error(obj.err_msg))
        }

        return resolve(obj.result[0])

      } catch (err) {
        return reject(err)
      }
    }))
  })
}
