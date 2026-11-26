/**
 * Smoke test for a lockstep release (run by scripts/pack-release.sh in a
 * temporary ESM project that installed only the release tarballs): every
 * package reports RELEASE_VERSION, and a wechaty bot over wechaty-puppet-mock
 * answers `ding` with `dong`.
 */
import assert from 'node:assert/strict'

import { VERSION as SCOPELET_VERSION } from 'scopelet'
import { VERSION as TOKEN_VERSION } from 'wechaty-token'
import { VERSION as PUPPET_VERSION } from 'wechaty-puppet'
import { VERSION as GRPC_VERSION } from 'wechaty-grpc'
import { VERSION as SERVICE_VERSION } from 'wechaty-puppet-service'
import {
  mock,
  PuppetMock,
  VERSION as MOCK_VERSION,
}                             from 'wechaty-puppet-mock'
import {
  WechatyBuilder,
  VERSION as WECHATY_VERSION,
}                             from 'wechaty'

const expected = process.env['RELEASE_VERSION']
assert.ok(expected, 'RELEASE_VERSION must be set')
assert.deepEqual({
  'scopelet'               : SCOPELET_VERSION,
  'wechaty-token'          : TOKEN_VERSION,
  'wechaty-puppet'         : PUPPET_VERSION,
  'wechaty-puppet-mock'    : MOCK_VERSION,
  'wechaty-grpc'           : GRPC_VERSION,
  'wechaty-puppet-service' : SERVICE_VERSION,
  'wechaty'                : WECHATY_VERSION,
}, {
  'scopelet'               : expected,
  'wechaty-token'          : expected,
  'wechaty-puppet'         : expected,
  'wechaty-puppet-mock'    : expected,
  'wechaty-grpc'           : expected,
  'wechaty-puppet-service' : expected,
  'wechaty'                : expected,
}, 'every package should embed the release version')

const mocker = new mock.Mocker()
const bot = WechatyBuilder.build({ puppet: new PuppetMock({ mocker }) })
bot.addEventListener('message', async (event: any) => {
  const message = event.detail
  if (message.text() === 'ding') {
    await message.say('dong')
  }
})
await bot.start()

try {
  const user   = mocker.createContact({ name: 'Bot' })
  const player = mocker.createContact({ name: 'Player' })
  mocker.login(user)

  const reply = new Promise<string | undefined>(resolve => {
    player.on('message', message => {
      if (message.talker().id === user.id) {
        resolve(message.payload.text)
      }
    })
  })
  player.say('ding').to(user)
  assert.equal(await reply, 'dong', 'the bot should answer ding with dong')
} finally {
  await bot.stop()
}

console.info(`Release ${expected}: wechaty ding-dong over wechaty-puppet-mock passed.`)
