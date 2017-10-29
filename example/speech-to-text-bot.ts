/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

import { createWriteStream }  from 'fs'
import {
  PassThrough,
  Readable,
}                             from 'stream'

import request      = require('request')
import Ffmpeg       = require('fluent-ffmpeg')
import querystring  = require('querystring')

/* tslint:disable:variable-name */
const qrcodeTerminal = require('qrcode-terminal')

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  config,
  MediaMessage,
  MsgType,
  Wechaty,
}                 from '../'

const bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })

bot
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    qrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})
.on('login'	  , user => console.log(`${user} logined`))
.on('message', async function(this, msg) {
  console.log(`RECV: ${msg}`)

  if (msg.type() !== MsgType.VOICE) {
    return // skip no-VOICE message
  }

  const mp3Stream = await (msg as MediaMessage).readyStream()

  const file = createWriteStream(msg.filename())
  mp3Stream.pipe(file)

  const text = await speechToText(mp3Stream)
  console.log('VOICE TO TEXT: ' + text)

  if (msg.self()) {
    this.say(text)  // send text to 'filehelper'
  } else {
    msg.say(text)     // to original sender
  }

})
.init()
.catch(e => console.error('bot.init() error: ' + e))

async function speechToText(mp3Stream: Readable): Promise<string> {
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

function mp3ToWav(mp3Stream: Readable): NodeJS.ReadableStream {
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
 * Baidu:
 * export BAIDU_SPEECH_API_KEY=FK58sUlteAuAIXZl5dWzAHCT
 * export BAIDU_SPEECH_SECRET_KEY=feaf24adcc5b8f02b147e7f7b1953030
 * curl "https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_SPEECH_API_KEY}&client_secret=${BAIDU_SPEECH_SECRET_KEY}"
 *
 * OAuth: http://developer.baidu.com/wiki/index.php?title=docs/oauth/overview
 * ASR: http://yuyin.baidu.com/docs/asr/57
 */

/**
 * YunZhiSheng:
 * http://dev.hivoice.cn/download_file/USC_DevelGuide_WebAPI_audioTranscription.pdf
 */

/**
 * Google:
 * http://blog.csdn.net/dlangu0393/article/details/7214728
 * http://elric2011.github.io/a/using_speech_recognize_service.html
 */
async function wavToText(wavStream: NodeJS.ReadableStream): Promise<string> {
  const params = {
    'cuid': 'wechaty',
    'lan': 'zh',
    'token': '24.8c6a25b5dcfb41af189a97d9e0b7c076.2592000.1482571685.282335-8943256',
  }

  const apiUrl = 'http://vop.baidu.com/server_api?'
                + querystring.stringify(params)

  const options = {
    headers: {
      'Content-Type': 'audio/wav; rate=8000',
    },
  }

  return new Promise<string>((resolve, reject) => {
    wavStream.pipe(request.post(apiUrl, options, (err, httpResponse, body) => {
      // "err_msg":"success.","err_no":0,"result":["这是一个测试测试语音转文字，"]
      if (err) {
        return reject(err)
      }
      try {
        const obj = JSON.parse(body)
        if (obj.err_no !== 0) {
          throw new Error(obj.err_msg)
        }

        return resolve(obj.result[0])

      } catch (err) {
        return reject(err)
      }
    }))
  })
}
