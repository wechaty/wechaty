/**
 * Runs the Puppet TCK contract suites against `PuppetMock`.
 */

import * as PUPPET from 'wechaty-puppet'

import { PuppetMock } from '../puppet-mock.ts'
import { runPuppetTCK } from './puppet-tck.ts'

runPuppetTCK({
  createHangingPuppet: (options) => {
    class HangingPuppetMock extends PuppetMock {

      override async onStart (signal?: AbortSignal): Promise<void> {
        await new Promise<void>((resolve) => {
          if (signal?.aborted) {
            resolve()
            return
          }
          signal?.addEventListener('abort', () => resolve(), { once: true })
        })
      }

    }
    return new HangingPuppetMock(options)
  },
  createPuppet: (options) => new PuppetMock(options),
  name: 'PuppetMock',
  seedDomain: async (puppet) => {
    const mock = puppet as PuppetMock
    const botUser = mock.mocker.createContact({ name: 'TCK Bot' })
    const contact = mock.mocker.createContact({ name: 'TCK Friend' })
    const room = mock.mocker.createRoom({
      memberIdList: [botUser.id],
      ownerId: botUser.id,
      topic: 'TCK Room',
    })
    mock.mocker.login(botUser)
    mock.dispatchEvent(new PUPPET.WechatyEvent('ready', { detail: { data: 'ready' } }))
    await mock.ready()
    return {
      contactId: contact.id,
      roomId: room.id,
      userId: botUser.id,
    }
  },
})
