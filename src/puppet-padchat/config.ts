import {
  log,
}             from 'brolog'

export const WECHATY_PUPPET_PADCHAT_ENDPOINT = process.env['WECHATY_PUPPET_PADCHAT_ENDPOINT']  || 'ws://54.223.36.77:8080/wx'

function padchatToken() {
  const token = process.env['WECHATY_PUPPET_PADCHAT_TOKEN'] as string
  if (!token) {
    log.error('PuppetPadchatConfig', `

      WECHATY_PUPPET_PADCHAT_TOKEN environment variable not found.

      PuppetPadchat need a token before it can be used,
      Please set WECHATY_PUPPET_PADCHAT_TOKEN then retry again.


      Learn more about it at: https://github.com/Chatie/wechaty/issues/1296

    `)
    throw new Error('You need a valid WECHATY_PUPPET_PADCHAT_TOKEN to use PuppetPadchat')
  }
  return token
}

export {
  padchatToken,
}
