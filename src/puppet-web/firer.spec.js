/**
 *
 * Wechaty: Wechat for Bot. Connecting ChatBots
 *
 * Class PuppetWeb Firer
 *
 * Process the Message to find which event to FIRE
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test }   from 'ava'

import Contact from '../contact'
import Message from '../message'

import FriendRequest  from './friend-request'
import Firer          from './firer'

test('Firer smoking test', t => {

  t.true(true, 'should be true')
})

test('Firer.checkFriendConfirm', t => {
  const content = 'You have added 李卓桓 as your WeChat contact. Start chatting!'
  let result

  result = Firer.checkFriendConfirm(content)
  t.truthy(result, 'should be truthy for confirm msg')

  result = Firer.checkFriendConfirm('fsdfsdfasdfasdfadsa')
  t.falsy(result, 'should be falsy for other msg')
})

test('Firer.checkRoomJoin', t => {
  const contentList = [
    [
      `You've invited "李卓桓" to the group chat`
      , `You've`
      , `李卓桓`
    ]
    , [
      `You've invited "李卓桓.PreAngel、Bruce LEE" to the group chat`
      , `You've`
      , `李卓桓.PreAngel、Bruce LEE`
    ]
    , [
      `"李卓桓.PreAngel" invited "Bruce LEE" to the group chat`
      , `李卓桓.PreAngel`
      , `Bruce LEE`
    ]
  ]

  let result
  contentList.forEach(([content, inviter, invitee]) => {
    result = Firer.checkRoomJoin(content)
    t.truthy(result, 'should check room join message right for ' + content)
    t.is(result[0], invitee, 'should get invitee right')
    t.is(result[1], inviter, 'should get inviter right')
  })

  result = Firer.checkRoomJoin('fsadfsadfsdfsdfs')
  t.false(result, 'should get false if message is not expected')
})

test('Firer.checkRoomLeave', t => {
  const data = [
    `You removed "Bruce LEE" from the group chat`
    , `Bruce LEE`
  ]

  let leaver
  leaver = Firer.checkRoomLeave(data[0])
  t.truthy(leaver, 'should get leaver for leave message')
  t.is(leaver, data[1], 'should get leaver name right')

  leaver = Firer.checkRoomLeave('fafdsfsdfafa')
  t.false(leaver, 'should get false if message is not expected')
})
