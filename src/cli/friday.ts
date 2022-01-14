/* eslint-disable sort-keys */
import {
  command,
}                 from 'cmd-ts'

async function handler (_args: any) {
  console.info('this command can help you contact Friday BOT and Talk to him.')
  console.info('Not implemented yet, please stay tuned and contribute is welcome!')
  console.info('GitHub repo(source code): https://github.com/wechaty/wechaty/blob/main/src/cli/friday-bot.ts')
}

const friday = command({
  name: 'friday',
  description: 'Contact Friday BOT and talk to him!',
  args: {
  },
  handler,
})

export { friday }
