#!/usr/bin/env node
/**
 * Unit test for public browser-compatible entry point (`wechaty/browser`).
 *
 * Why this module exists:
 * Verifies that `packages/wechaty/src/mods/browser.ts` exports the browser-safe SDK surface
 * (builder, user modules, types, payloads) while omitting server-side transports (IoClient).
 *
 * Architectural boundaries:
 * Part of `wechaty`. Portable unit test executed across Node.js, Deno, and Chromium.
 *
 * Relationships:
 * - `browser.ts`: Target module under test.
 * - `web-test-runner.files.ts`: Browser test inventory including this file.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as BROWSER from './browser.ts'

test('wechaty/browser exports browser-safe SDK components', () => {
  assert.ok(typeof BROWSER.Wechaty === 'function', 'Wechaty constructor must be exported')
  assert.equal((BROWSER as any).WechatyBuilder, undefined, 'WechatyBuilder must not be exported')
  assert.ok(BROWSER.ScanStatus, 'ScanStatus must be exported')
  assert.ok(BROWSER.VERSION, 'VERSION must be exported')
  assert.ok(BROWSER.types, 'types must be exported')
  assert.ok(BROWSER.payloads, 'payloads must be exported')
  assert.ok(BROWSER.users, 'users must be exported')
  assert.equal((BROWSER as any).impls, undefined, 'impls must not be exported')
  assert.ok(BROWSER.log, 'log must be exported')
  assert.equal((BROWSER as any).IoClient, undefined, 'IoClient must not be exported in browser entry')
})

test('wechaty/browser allows new Wechaty(options) instantiation', () => {
  const bot = new BROWSER.Wechaty()
  assert.ok(bot, 'new Wechaty() must succeed in browser export')
  assert.ok(BROWSER.Wechaty.valid(bot), 'Wechaty.valid(bot) must return true in browser export')
})
