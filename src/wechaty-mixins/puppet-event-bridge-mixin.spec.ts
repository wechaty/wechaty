#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'

import {
  puppetEventBridgeMixin,
}                           from './puppet-event-bridge-mixin.js'

test('puppetEventBridgeMixin()', async t => {
  t.ok(puppetEventBridgeMixin, 'tbw')
})
