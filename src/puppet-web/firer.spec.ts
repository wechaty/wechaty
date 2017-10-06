#!/usr/bin/env ts-node
/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
 * Process the Message to find which event to FIRE
 */

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
// import * as sinon from 'sinon'
// const sinonTest   = require('sinon-test')(sinon)

import { Firer }  from './firer'

test('Firer smoke testing', async t => {
  t.true(true, 'should be true')
})

test('parseFriendConfirm()', async t => {
  const contentList = [
    [
      'You have added 李卓桓 as your WeChat contact. Start chatting!',
      '李卓桓',
    ],
    [
      '你已添加了李卓桓，现在可以开始聊天了。',
      '李卓桓',
    ],
    [
      `johnbassserver@gmail.com just added you to his/her contacts list. Send a message to him/her now!`,
      `johnbassserver@gmail.com`,
    ],
    [
      `johnbassserver@gmail.com刚刚把你添加到通讯录，现在可以开始聊天了。`,
      `johnbassserver@gmail.com`,
    ],
  ]
  let result: boolean

  contentList.forEach(([content]) => {
    result = Firer.parseFriendConfirm(content)
    t.true(result, 'should be truthy for confirm msg: ' + content)
  })

  result = Firer.parseFriendConfirm('fsdfsdfasdfasdfadsa')
  t.false(result, 'should be falsy for other msg')
})

test('parseRoomJoin()', async t => {
  const contentList: [string, string, string[]][] = [
    [
      `You've invited "李卓桓" to the group chat`,
      `You've`,
      [`李卓桓`],
    ],
    [
      `You've invited "李卓桓.PreAngel、Bruce LEE" to the group chat`,
      `You've`,
      [`李卓桓.PreAngel`, `Bruce LEE`],
    ],
    [
      `"李卓桓.PreAngel" invited "Bruce LEE" to the group chat`,
      `李卓桓.PreAngel`,
      [`Bruce LEE`],
    ],
    [
      `"凌" invited "庆次、小桔妹" to the group chat`,
      `凌`,
      ['庆次', '小桔妹'],
    ],
    [
      `你邀请"李佳芮"加入了群聊`,
      `你`,
      ['李佳芮'],
    ],
    [
      `"桔小秘"通过扫描你分享的二维码加入群聊`,
      `你`,
      ['桔小秘'],
    ],
    [
      `" 桔小秘"通过扫描"李佳芮"分享的二维码加入群聊`,
      `李佳芮`,
      ['桔小秘'],
    ],
    [
      `"桔小秘"通过扫描"李佳芮"分享的二维码加入群聊`,
      `李佳芮`,
      ['桔小秘'],
    ],
    [
      `"桔小秘" joined the group chat via your shared QR Code.`,
      `your`,
      ['桔小秘'],
    ],
    [
      `" 桔小秘" joined the group chat via the QR Code shared by "李佳芮".`,
      `李佳芮`,
      ['桔小秘'],
    ],
    [
      `"桔小秘" joined the group chat via the QR Code shared by "李佳芮".`,
      `李佳芮`,
      ['桔小秘'],
    ],
  ]

  let result
  contentList.forEach(([content, inviter, inviteeList]) => {
    result = Firer.parseRoomJoin(content)
    t.ok(result, 'should check room join message right for ' + content)
    t.deepEqual(result[0], inviteeList, 'should get inviteeList right')
    t.is(result[1], inviter, 'should get inviter right')
  })

  t.throws(() => {
    Firer.parseRoomJoin('fsadfsadfsdfsdfs')
  }, Error, 'should throws if message is not expected')
})

test('parseRoomLeave()', async t => {
  const contentLeaverList = [
    [
      `You removed "Bruce LEE" from the group chat`,
      `Bruce LEE`,
    ],
    [
      '你将"李佳芮"移出了群聊',
      '李佳芮',
    ],
  ]

  const contentRemoverList = [
    [
      `You were removed from the group chat by "桔小秘"`,
      `桔小秘`,
    ],
    [
      '你被"李佳芮"移出群聊',
      '李佳芮',
    ],
  ]

  contentLeaverList.forEach(([content, leaver]) => {
    const resultLeaver = Firer.parseRoomLeave(content)[0]
    t.ok(resultLeaver, 'should get leaver for leave message: ' + content)
    t.is(resultLeaver, leaver, 'should get leaver name right')
  })

  contentRemoverList.forEach(([content, remover]) => {
    const resultRemover = Firer.parseRoomLeave(content)[1]
    t.ok(resultRemover, 'should get remover for leave message: ' + content)
    t.is(resultRemover, remover, 'should get leaver name right')
  })

  t.throws(() => {
    Firer.parseRoomLeave('fafdsfsdfafa')
  }, Error, 'should throw if message is not expected')
})

test('parseRoomTopic()', async t => {
  const contentList = [
    [
      `"李卓桓.PreAngel" changed the group name to "ding"`,
      `李卓桓.PreAngel`,
      `ding`,
    ],
    [
      '"李佳芮"修改群名为“dong”',
      '李佳芮',
      'dong',
    ],
  ]

  let result
  contentList.forEach(([content, changer, topic]) => {
    result = Firer.parseRoomTopic(content)
    t.ok(result, 'should check topic right for content: ' + content)
    t.is(topic  , result[0], 'should get right topic')
    t.is(changer, result[1], 'should get right changer')
  })

  t.throws(() => {
    Firer.parseRoomTopic('fafdsfsdfafa')
  }, Error, 'should throw if message is not expected')

})
