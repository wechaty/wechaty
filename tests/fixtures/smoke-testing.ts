#!/usr/bin/env ts-node

import {
  Wechaty,
  VERSION,
}           from 'wechaty'

function getBotList (): Wechaty[] {
  const botList = [
    new Wechaty({ puppet: 'wechaty-puppet-mock' }),
    new Wechaty({ puppet: 'wechaty-puppet-wechat4u' }),
    // new Wechaty({ puppet: 'wechaty-puppet-puppeteer' }),
  ]

  if (process.env.WECHATY_PUPPET_HOSTIE_TOKEN) {
    botList.push(
      new Wechaty({
        puppet: 'wechaty-puppet-padplus',
      })
    )
  }
  if (process.env.WECHATY_PUPPET_PADPLUS_TOKEN) {
    botList.push(
      new Wechaty({
        puppet: 'wechaty-puppet-padplus',
      })
    )
  }

  return botList
}

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('VERSION not set!')
  }

  const botList = getBotList()
  try {
    await Promise.all(
      botList.map(bot => bot.start()),
    )
    botList.forEach(
      bot => console.info(`Wechaty v${bot.version()} smoking test passed.`),
    )
  } catch (e) {
    console.error(e)
    // Error!
    return 1
  } finally {
    await Promise.all(
      botList.map(bot => bot.stop()),
    )
  }
  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
