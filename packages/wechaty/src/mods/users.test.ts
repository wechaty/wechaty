#!/usr/bin/env node
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
/**
 * Unit tests for user module canonical types and backwards-compatible aliases.
 *
 * Why this module exists:
 * Verifies that canonical domain types (Contact, Message, Room, etc.) exported from
 * `mods/users.ts` and `user-modules/mod.ts` are fully compatible with legacy `*Interface` types.
 *
 * Architectural boundaries:
 * Part of `wechaty` test suite.
 *
 * Key relationships:
 * - `mods/users.ts`: Public user module types re-export.
 * - `user-modules/mod.ts`: User module registry.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import type {
  Contact,
  ContactSelf,
  Delay,
  Favorite,
  Friendship,
  Image,
  Location,
  Message,
  MiniProgram,
  Moment,
  Money,
  Post,
  Room,
  RoomInvitation,
  Tag,
  UrlLink,
} from './users.ts'

import type {
  ContactInterface,
  MessageInterface,
  RoomInterface,
} from '../user-modules/mod.ts'

test('canonical types assignability with legacy *Interface aliases', async () => {
  type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false

  const isContactSame: AssertEqual<Contact, ContactInterface> = true
  const isMessageSame: AssertEqual<Message, MessageInterface> = true
  const isRoomSame: AssertEqual<Room, RoomInterface> = true

  assert.ok(isContactSame, 'Contact and ContactInterface must be identical types')
  assert.ok(isMessageSame, 'Message and MessageInterface must be identical types')
  assert.ok(isRoomSame, 'Room and RoomInterface must be identical types')
})

test('compile-time check of all 16 canonical user types', async () => {
  type AllUserTypes = [
    Contact,
    ContactSelf,
    Delay,
    Favorite,
    Friendship,
    Image,
    Location,
    Message,
    MiniProgram,
    Moment,
    Money,
    Post,
    Room,
    RoomInvitation,
    Tag,
    UrlLink,
  ]

  const typeCount: AllUserTypes['length'] = 16
  assert.equal(typeCount, 16, 'should have 16 canonical user types')
})
