#!/usr/bin/env node
/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */

import Wechaty from '../src/wechaty'

const w = Wechaty.instance()
console.log(w.version())
