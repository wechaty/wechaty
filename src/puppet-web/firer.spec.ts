/**
 *
 * Wechaty: * * Wechaty - Wechat for Bot. Connecting ChatBots
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

import { Firer }  from './firer'

test('Firer smoking test', t => {
  t.true(true, 'should be true')
})

test('parseFriendConfirm()', t => {
  const contentList = [
    [
        'You have added 李卓桓 as your WeChat contact. Start chatting!'
      , '李卓桓'
    ]
    , [
        '你已添加了李卓桓，现在可以开始聊天了。'
      , '李卓桓'
    ]
  ]
  let result: boolean

  contentList.forEach(([content]) => {
    result = Firer.parseFriendConfirm(content)
    t.true(result, 'should be truthy for confirm msg: ' + content)
  })

  result = Firer.parseFriendConfirm('fsdfsdfasdfasdfadsa')
  t.false(result, 'should be falsy for other msg')
})

test('parseRoomJoin()', t => {
  const contentList: [string, string, string[]][] = [
    [
      `You've invited "李卓桓" to the group chat`
      , `You've`
      , [`李卓桓`]
    ]
    , [
      `You've invited "李卓桓.PreAngel、Bruce LEE" to the group chat`
      , `You've`
      , [`李卓桓.PreAngel`, `Bruce LEE`]
    ]
    , [
      `"李卓桓.PreAngel" invited "Bruce LEE" to the group chat`
      , `李卓桓.PreAngel`
      , [`Bruce LEE`]
    ]
    , [
      `"凌" invited "庆次、小桔妹" to the group chat`
      , `凌`
      , ['庆次', '小桔妹']
    ]
    , [
      `你邀请"李佳芮"加入了群聊`
      , '你'
      , ['李佳芮']
    ]
  ]

  let result
  contentList.forEach(([content, inviter, inviteeList]) => {
    result = Firer.parseRoomJoin(content)
    t.truthy(result, 'should check room join message right for ' + content)
    t.deepEqual(result[0], inviteeList, 'should get inviteeList right')
    t.is(result[1], inviter, 'should get inviter right')
  })

  t.throws(() => {
    Firer.parseRoomJoin('fsadfsadfsdfsdfs')
  }, Error, 'should throws if message is not expected')
})

test('parseRoomLeave()', t => {
  const contentList = [
    [
        `You removed "Bruce LEE" from the group chat`
      , `Bruce LEE`
    ]
    , [
      '你将"李佳芮"移出了群聊'
      , '李佳芮'
    ]
  ]

  let result
  contentList.forEach(([content, leaver]) => {
    result = Firer.parseRoomLeave(content)
    t.truthy(result, 'should get leaver for leave message: ' + content)
    t.is(result, leaver, 'should get leaver name right')
  })

  t.throws(() => {
    Firer.parseRoomLeave('fafdsfsdfafa')
  }, Error, 'should throw if message is not expected')
})

test('parseRoomTopic()', t => {
  const contentList = [
    [
        `"李卓桓.PreAngel" changed the group name to "ding"`
      , `李卓桓.PreAngel`
      , `ding`
    ]
    , [
      '"李佳芮"修改群名为“dong”'
      , '李佳芮'
      , 'dong'
    ]
  ]

  let result
  contentList.forEach(([content, changer, topic]) => {
    result = Firer.parseRoomTopic(content)
    t.truthy(result, 'should check topic right for content: ' + content)
    t.is(topic  , result[0], 'should get right topic')
    t.is(changer, result[1], 'should get right changer')
  })

  t.throws(() => {
    Firer.parseRoomTopic('fafdsfsdfafa')
  }, Error, 'should throw if message is not expected')

})
