const test = require('tap').test
const Message = require('../src/message')
const Group = require('../src/group')
const Puppet = require('../src/puppet')
const log = require('npmlog')
//log.level = 'silly'
//log.enableColor()

Group.attach(new Puppet())

test('Group smoke testing', t => {
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

  const g = new Group(UserName)

  t.equal(g.id, UserName, 'id/UserName right')
  g.ready(mockContactGetter)
  .then(r => {
    t.equal(r.get('id')   , UserName, 'UserName set')
    t.equal(r.get('name') , NickName, 'NickName set')
    t.equal(r.get('encryId') , EncryChatRoomId, 'EncryChatRoomId set')

    const s = r.toString()
    t.equal(typeof s, 'string', 'toString()')
  })
  .catch(e => t.fail('ready() rejected: ' + e))
  .then(t.end) // test end
})
/*
  const rawData = JSON.parse('{"MsgId":"1120003476579027592","FromUserName":"@@4aa0ae1e1ebc568b613fa43ce93b478df0339f73340d87083822c2016d2e53d9","ToUserName":"@94e4b0db79ccc844d7bb4a2b1efac3ff","MsgType":1,"Content":"@9ad4ba13fac52c55d323521b67f7cc39:<br/>[Strong]","Status":3,"ImgStatus":1,"CreateTime":1462889712,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":1120003476579027600,"MMPeerUserName":"@@4aa0ae1e1ebc568b613fa43ce93b478df0339f73340d87083822c2016d2e53d9","MMDigest":"感恩的心 ","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":false,"LocalID":"1120003476579027592","ClientMsgId":"1120003476579027592","MMActualContent":"HTML-CODE","MMActualSender":"@9ad4ba13fac52c55d323521b67f7cc39","MMDigestTime":"22:15","MMDisplayTime":1462889712,"MMTime":"22:15","_h":126,"_index":0,"_offsetTop":0,"$$hashKey":"0QK", "MemberList": [{"Uin":0,"UserName":"@94e4b0db79ccc844d7bb4a2b1efac3ff","NickName":"李卓桓","AttrStatus":37996631,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"北京阿布","KeyWord":"liz"},{"Uin":0,"UserName":"@34887973779b7dd827366a31772cd83df223e6f71d9a79e44fe619aafe2901a4","NickName":"Tiger","AttrStatus":4292711,"PYInitial":"","PYQuanPin":"","RemarkPYInitial":"","RemarkPYQuanPin":"","MemberStatus":0,"DisplayName":"DisplayNameTiger","KeyWord":"","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@34887973779b7dd827366a31772cd83df223e6f71d9a79e44fe619aafe2901a4&skey=@crypt_f9cec94b_8517b7f9fec85f5a78a804c4f45f5536&chatroomid=@7b3dcd218431d79045cda3493c3179ae"}]}')

  const EXPECTED = {
    id:       '1120003476579027592'
    , from:   '@0bb3e4dd746fdbd4a80546aef66f4085'
  }
  const g = new Group(rawData)

  t.equal(g.id      , EXPECTED.id   , 'id right')
  t.equal(g.from.id , EXPECTED.from , 'from right')

  const s = g.toString()
  t.equal(typeof s, 'string', 'toString()')

  t.end()
})
*/

false && test('Message ready() promise testing', t => {
  // must different with other rawData, because Contact class with load() will cache the result. or use Contact.resetPool()
  const rawData = JSON.parse('{"RemarkPYQuanPin":"","RemarkPYInitial":"","PYInitial":"BJFRHXS","PYQuanPin":"beijingfeirenhuaxiangsan","Uin":0,"UserName":"@@4aa0ae1e1ebc568b613fa43ce93b478df0339f73340d87083822c2016d2e53d9","NickName":"北京飞人滑翔伞","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgetheadimg?seq=649595794&username=@@4aa0ae1e1ebc568b613fa43ce93b478df0339f73340d87083822c2016d2e53d9&skey=","ContactFlag":3,"MemberCount":111,"RemarkName":"","HideInputBarFlag":0,"Sex":0,"Signature":"","VerifyFlag":0,"OwnerUin":2354729644,"StarFriend":0,"AppAccountFlag":0,"Statues":0,"AttrStatus":0,"Province":"","City":"","Alias":"","SnsFlag":0,"UniFriend":0,"DisplayName":"","ChatRoomId":0,"KeyWord":"","EncryChatRoomId":"@7b3dcd218431d79045cda3493c3179ae","MMOrderSymbol":"BEIJINGFEIRENHUAXIANGSAN","MMInChatroom":true,"_index":90,"_h":50,"_offsetTop":4448,"$$hashKey":"01J","MMFromBatchGet":true,"MMFromBatchget":true,"MMBatchgetMember":true,"MMCanCreateChatroom":true}')


  const expectedFromUserName  = '@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823'
  const expectedToUserName    = '@b58f91e0c5c9e841e290d862ddb63c14'
  const expectedFromNickName  = 'From Nick Name Test'
  const expectedToNickName    = 'To Nick Name Test'
  const expectedMsgId        = '3009511950433684462'

  Contact.init()

  // Mock
  const mockContactGetter = function(id) {
    log.silly('MessageTesting', `mocked getContact(${id})`)
    return new Promise((resolve,reject) => {
      let obj = {}
      switch (id) {
        case expectedFromUserName:
          obj = {
            UserName: expectedFromUserName
            , NickName: expectedFromNickName
          }
          break
        case expectedToUserName:
          obj = {
            UserName: expectedToUserName
            , NickName: expectedToNickName
          }
          break
        default:
          log.error('MessageTesting', `mocked getContact(${id}) unknown`)
          break
      }
      log.silly('MessageTesting', 'setTimeout mocked getContact')
      setTimeout(r => {
        log.silly('MessageTesting', 'mocked getContact resolved')
        return resolve(obj)
      }, 200)
    })
  }

  const m = new Message(rawData)

  t.equal(m.get('id'), expectedMsgId, 'id/MsgId right')

  m.ready(mockContactGetter)
  .then(r => {
    /*
    const fromC = m.get('from')
    const toC   = m.get('to')
    fromC.dump()
    toC.dump()
    */
    t.equal(m.get('from').get('id')   , expectedFromUserName, 'contact ready for FromUserName')
    t.equal(m.get('from').get('name') , expectedFromNickName, 'contact ready for FromNickName')
    t.equal(m.get('to').get('id')     , expectedToUserName  , 'contact ready for ToUserName')
    t.equal(m.get('to').get('name')   , expectedToNickName  , 'contact ready for ToNickName')
  })
  .catch(e => t.fail('m.ready() rejected: ' + e))
  .then(t.end) // test end
})

false && test('TBW: Message static method', t => {
  Contact.attach(new Puppet())

  const m = Message.find({
    id: 'xxx'
  }, {
    limit: 1
  })

  t.ok(m.get('id'), 'Message.find')

  const ms = Message.findAll({
    from: 'yyy'
  }, {
    limit: 2
  })

  t.equal(ms.length, 2, 'Message.findAll with limit 2')

  t.end()
})
