import WebSocket from 'ws'
import {
  createServer,
}                               from 'http'
import express from 'express'

import cuid from 'cuid'

// import {
//   PadchatPayload,
// }                             from './padchat-schemas'

import {
  PadchatRpcRequest,
}                             from './padchat-rpc.type'

const ENDPOINT = 'ws://54.223.36.77:8080/wx'

function main(): void {
  const app = express()
  const server = createServer()

  // app.use(express.static(path.join(__dirname, '/public')));

  const wss = new WebSocket.Server({server: server})

  wss.on('connection', function (ws) {
    console.log('new connection')

    proxyWs(ws)
  })

  server.on('request', app)
  server.listen(8788, function () {
    console.log('Listening on http://0.0.0.0:8788')
  })

}

function proxyWs(downStream: WebSocket): void {

  const weiId = cuid()
  let buf: string[] = []

  const upStream = new WebSocket(
    ENDPOINT,
    { perMessageDeflate: true },
  )

  upStream.on('open',     () => {
    console.log('upStream on(open)')
    if (buf.length > 0) {
      console.log('upStream on(open) buf.length: ' + buf.length)
      buf.forEach(data => upStream.send(data))
      buf = []
    }
  })
  upStream.on('error',    e => {
    console.error('upStream on(error) ' + e)
    downStream.close()
  })
  upStream.on('close',    (code, reason) => {
    console.log('upStream on(close) ' + code + ' ' + reason)
    downStream.close()
  })
  upStream.on('message',  data => {
    console.log('upStream.on(message) ' + data)
    if (downStream.readyState === 1) {
      downStream.send(data)
    } else {
      console.error('upStream.on(message) downStream not open, readyState: ' + downStream.readyState)
      upStream.close()
    }
  })

  downStream.on('close', function () {
    console.log('downStream connection closed')
    upStream.close()
  })

  downStream.on('message', (clientData: string) => {
    console.log('downStream message: ' + clientData)
    const payload: PadchatRpcRequest = JSON.parse(clientData)

    if (!validToken(payload.userId)) {
      setTimeout(() => {
        downStream.close()
        upStream.close()
      }, 1000)
      return
    }

    payload.userId = weiId

    const text = JSON.stringify(payload)

    if (upStream.readyState === 1) {
      if (buf.length > 0) {
        buf.forEach(data => upStream.send(data))
        buf = []
      }
      upStream.send(text)
    } else {
      buf.push(text)
    }
  })
}

const VALID_TOKEN_DICT = {
  'padchat-token-zixia'              : '@zixia',
  'padchat-token-zixia-c9'           : '@zixia',
  'padchat-token-zixia-mac'          : '@zixia',
  'padchat-token-zixia-mvp-zixia008' : '@zixia',
  'padchat-token-lijiarui'           : '@lijiarui',
}

function validToken(token: string) {
  if (token in VALID_TOKEN_DICT) {
    console.log('token valid: ' + token)
    return true
  }
  console.log('token invalid: ' + token)
  return false
}

main()
