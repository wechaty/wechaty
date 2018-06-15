import test  from 'blue-tape'

import {
  stripBugChatroomId,
}                             from './compatible-wei-bug'

test('stripBugChatroomId()', async t => {
  const RAW_USER_NAME_1 = '\n\u00135907139882@chatroom'
  const USER_NAME_1     = '5907139882@chatroom'
  const RAW_USER_NAME_2 = '\n\u001412558026334@chatroom'
  const USER_NAME_2     = '12558026334@chatroom'

  t.equal(stripBugChatroomId(RAW_USER_NAME_1) , USER_NAME_1, 'should return pure user_name for RAW_USER_NAME_1')
  t.equal(stripBugChatroomId(RAW_USER_NAME_2) , USER_NAME_2, 'should return pure user_name for RAW_USER_NAME_2')
  t.equal(stripBugChatroomId(undefined)       , '',          'should return empty string for undifined')
})
