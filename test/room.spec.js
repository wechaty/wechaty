import { test } from 'ava'
import {
  Message
  , Room
  , Contact
  , Puppet
  , log
}  from '../'

Room.attach(new Puppet())

// const test = require('tape')
// const Message = require('../src/message')
// const Room = require('../src/room')
// const Contact = require('../src/contact')
// const Puppet = require('../src/puppet')
// const log = require('../src/npmlog-env')


test('Room smoke testing', async t => {

  const UserName = '@0bb3e4dd746fdbd4a80546aef66f4085'
  const NickName = 'Nick Name Test'
  const EncryChatRoomId = '123456abcdef'

  // Mock
  const mockContactGetter = function (id) {
    return new Promise((resolve,reject) => {
      if (id!=UserName) return resolve({});
      setTimeout(() => {
        return resolve({
          UserName: UserName
          , NickName: NickName
          , EncryChatRoomId: EncryChatRoomId
        })
      }, 200)
    })
  }

  const r = new Room(UserName)

  t.is(r.id, UserName, 'id/UserName right')

  await r.ready(mockContactGetter)

  // .then(r => {
    t.is(r.get('id')   , UserName, 'UserName set')
    t.is(r.get('name') , NickName, 'NickName set')
    t.is(r.get('encryId') , EncryChatRoomId, 'EncryChatRoomId set')

    const s = r.toString()
    t.is(typeof s, 'string', 'toString()')
  // })
  // .catch(e => t.fail('ready() rejected: ' + e))
  // .then(_ => t.end()) // test end
})
/*
  const rawData = JSON.parse('{"MsgId":"1120003476579027592","FromUserName":"@@4aa0ae1e1ebc568b613fa43ce93b478df0339f73340d87083822c2016d2e53d9","ToUserName":"@94e4b0db79ccc844d7bb4a2b1efac3ff","MsgType":1,"Content":"@9ad4ba13fac52c55d323521b67f7cc39:<br/>[Strong]","Status":3,"ImgStatus":1,"CreateTime":1462889712,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":1120003476579027600,"MMPeerUserName":"@@4aa0ae1e1ebc568b613fa43ce93b478df0339f73340d87083822c2016d2e53d9","MMDigest":"感恩的心 ","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":false,"LocalID":"1120003476579027592","ClientMsgId":"1120003476579027592","MMActualContent":"HTML-CODE","MMActualSender":"@9ad4ba13fac52c55d323521b67f7cc39","MMDigestTime":"22:15","MMDisplayTime":1462889712,"MMTime":"22:15","_h":126,"_index":0,"_offsetTop":0,"$$hashKey":"0QK", "MemberList": [{"Uin":0,"UserName":"@94e4b0db79ccc844d7bb4a2b1efac3ff","NickName":"李卓桓","AttrStatus":37996631,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"北京阿布","KeyWord":"liz"},{"Uin":0,"UserName":"@34887973779b7dd827366a31772cd83df223e6f71d9a79e44fe619aafe2901a4","NickName":"Tiger","AttrStatus":4292711,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"DisplayNameTiger","KeyWord":"","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@34887973779b7dd827366a31772cd83df223e6f71d9a79e44fe619aafe2901a4&skey=@crypt_f9cec94b_8517b7f9fec85f5a78a804c4f45f5536&chatroomid=@7b3dcd218431d79045cda3493c3179ae"}]}')

  const EXPECTED = {
    id:       '1120003476579027592'
    , from:   '@0bb3e4dd746fdbd4a80546aef66f4085'
  }
  const g = new Room(rawData)

  t.is(g.id      , EXPECTED.id   , 'id right')
  t.is(g.from.id , EXPECTED.from , 'from right')

  const s = g.toString()
  t.is(typeof s, 'string', 'toString()')

  t.end()
})
*/

test('TBW: Room static method', t => {
  const r = Room.find({
    id: 'xxx'
  }, {
    limit: 1
  })

  t.truthy(r.id, 'Room.find')

  const rs = Room.findAll({
    from: 'yyy'
  }, {
    limit: 2
  })

  t.is(rs.length, 2, 'Room.findAll with limit 2')

  // t.end()
})
