/* eslint-disable sort-keys */
import {
  command,
}                 from 'cmd-ts'

async function handler (_args: any) {
  console.info('this command can help you manage Wechaty Puppet Servivce (WPS).')
  console.info('Not implemented yet, please stay tuned and contribute is welcome!')
  console.info('GitHub repo(source code): https://github.com/wechaty/wechaty/blob/main/src/cli/puppet-service.ts')
}

const service = command({
  name: 'service',
  description: 'Manage Wechaty Puppet Service (WPS)',
  args: {
  },
  handler,
})

export { service }
