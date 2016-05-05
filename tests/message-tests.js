const test = require('tape')
const Message = require('../lib/message')

test('Message constructor parser test', t => {
  const rawData = JSON.parse('{"MsgId":"179242112323992762","FromUserName":"@0bb3e4dd746fdbd4a80546aef66f4085","ToUserName":"@16d20edf23a3bf3bc71bb4140e91619f3ff33b4e33f7fcd25e65c1b02c7861ab","MsgType":1,"Content":"test123","Status":3,"ImgStatus":1,"CreateTime":1461652670,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":179242112323992770,"MMPeerUserName":"@0bb3e4dd746fdbd4a80546aef66f4085","MMDigest":"test123","MMIsSend":false,"MMIsChatRoom":false,"MMUnread":true,"LocalID":"179242112323992762","ClientMsgId":"179242112323992762","MMActualContent":"test123","MMActualSender":"@0bb3e4dd746fdbd4a80546aef66f4085","MMDigestTime":"14:37","MMDisplayTime":1461652670,"MMTime":"14:37"}')

  const EXPECTED = {
    id:       '179242112323992762'
    , from:   '@0bb3e4dd746fdbd4a80546aef66f4085'
  }
  const m = new Message(rawData)

  t.equal(m.get('id')   , EXPECTED.id, 'id right')
  t.equal(m.get('from') , EXPECTED.from, 'from right')

  t.end()
})

test('TBW: Message static method', t => {
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
