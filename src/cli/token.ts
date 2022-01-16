/* eslint-disable sort-keys */
import {
  subcommands,
}                 from 'cmd-ts'

import { cmds } from 'wechaty-token'

import {
  VERSION,
}                           from '../config.js'

const token = subcommands({
  name: 'Token',
  description: 'Generate & Discover TOKEN for Wechaty',
  version: VERSION,
  cmds,
})

export { token }
