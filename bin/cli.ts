#!/usr/bin/env node
/**
 * https://github.com/wechaty/wechaty
 *
 * Author: Huan <zixia@zixia.net>
 * License: Apache-2.0
 *
 * CLI Apps in TypeScript with `cmd-ts` (Part 1)
 *  Using `cmd-ts` to easily build a type-safe TypeScript CLI app
 *
 *  https://gal.hagever.com/posts/type-safe-cli-apps-in-typescript-with-cmd-ts-part-1/
 */
/* eslint-disable sort-keys */
import 'dotenv/config.js'

import {
  binary,
  run,
  subcommands,
}                     from 'cmd-ts'

import { VERSION } from '../src/config.js'

import * as cmds     from '../src/cli/mod.js'

const wechatyCli = subcommands({
  name: 'wechaty',
  description: 'Wechaty CLI Utility',
  version: VERSION,
  cmds,
})

run(
  binary(wechatyCli),
  process.argv,
).catch(console.error)
