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

  const upStream = new WebSocket(
    ENDPOINT,
    { perMessageDeflate: true },
  )

  upStream.on('open',     () => console.log('dstWs on(open)'))
  upStream.on('error',    e => {
    console.error('dstWs on(error) ' + e)
    downStream.close()
  })
  upStream.on('close',    (code, reason) => {
    console.log('dstWs on(close) ' + code + ' ' + reason)
    downStream.close()
  })
  upStream.on('message',  downStream.send)

  downStream.on('close', function () {
    console.log('client connection closed')
    upStream.close()
  })

  downStream.on('message', (clientData: string) => {
    const payload: PadchatRpcRequest = JSON.parse(clientData)

    if (!validToken(payload.userId)) {
      downStream.close()
    }

    payload.userId = weiId

    upStream.send(JSON.stringify(payload))
  })
}

const VALID_TOKEN_DICT = {
  'padchat-token-zixia'     : '@zixia',
  'padchat-token-zixia-c9'  : '@zixia',
  'padchat-token-zixia-mac' : '@zixia',
}

function validToken(token: string) {
  if (token in VALID_TOKEN_DICT) {
    return true
  }
  return false
}

main()
