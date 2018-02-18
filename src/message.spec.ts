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
// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
// import * as sinon from 'sinon'
// const sinonTest   = require('sinon-test')(sinon)

import {
  config,
  log,
}                 from './config'
import Message    from './message'
import Profile    from './profile'
import PuppetWeb  from './puppet-web/'

const MOCK_USER_ID = 'TEST-USER-ID'

const puppet = new PuppetWeb({
  profile: new Profile(),
})
puppet.userId = MOCK_USER_ID
config.puppetInstance(puppet)

test('constructor()', async t => {
  /* tslint:disable:max-line-length */
  const rawData = JSON.parse('{"MsgId":"179242112323992762","FromUserName":"@0bb3e4dd746fdbd4a80546aef66f4085","ToUserName":"@16d20edf23a3bf3bc71bb4140e91619f3ff33b4e33f7fcd25e65c1b02c7861ab","MsgType":1,"Content":"test123","Status":3,"ImgStatus":1,"CreateTime":1461652670,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":179242112323992770,"MMPeerUserName":"@0bb3e4dd746fdbd4a80546aef66f4085","MMDigest":"test123","MMIsSend":false,"MMIsChatRoom":false,"MMUnread":true,"LocalID":"179242112323992762","ClientMsgId":"179242112323992762","MMActualContent":"test123","MMActualSender":"@0bb3e4dd746fdbd4a80546aef66f4085","MMDigestTime":"14:37","MMDisplayTime":1461652670,"MMTime":"14:37"}')

  const EXPECTED = {
    id:       '179242112323992762',
    from:   '@0bb3e4dd746fdbd4a80546aef66f4085',
  }
  const m = new Message(rawData)

  t.is(m.id         , EXPECTED.id   , 'id right')
  t.is(m.from().id  , EXPECTED.from , 'from right')

  const s = m.toString()
  t.is(typeof s, 'string', 'toString()')
})

// Issue #445
// XXX have to use test.serial() because mockGetContact can not be parallel
test('ready()', async t => {

  // must different with other rawData, because Contact class with load() will cache the result. or use Contact.resetPool()
  /* tslint:disable:max-line-length */
  const rawData = JSON.parse('{"MsgId":"3009511950433684462","FromUserName":"@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823","ToUserName":"@b58f91e0c5c9e841e290d862ddb63c14","MsgType":1,"Content":"哈哈","Status":3,"ImgStatus":1,"CreateTime":1462887888,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":3009511950433684500,"MMPeerUserName":"@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823","MMDigest":"哈哈","MMIsSend":false,"MMIsChatRoom":false,"MMUnread":false,"LocalID":"3009511950433684462","ClientMsgId":"3009511950433684462","MMActualContent":"哈哈","MMActualSender":"@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823","MMDigestTime":"21:44","MMDisplayTime":1462887888,"MMTime":"21:44","_h":104,"_index":0,"_offsetTop":0,"$$hashKey":"098"}')

  const expectedFromUserName = '@0748ee480711bf20af91c298a0d7dcc77c30a680c1004157386b81cf13474823'
  const expectedToUserName   = '@b58f91e0c5c9e841e290d862ddb63c14'
  const expectedFromNickName = 'From Nick Name@Test'
  const expectedToNickName   = 'To Nick Name@Test'
  const expectedMsgId        = '3009511950433684462'

  // Mock
  function mockGetContact(id) {
    log.silly('TestMessage', `mocked getContact(${id})`)
    return new Promise((resolve, reject) => {
      let obj = {}
      switch (id) {
        case expectedFromUserName:
          obj = {
            UserName: expectedFromUserName,
            NickName: expectedFromNickName,
          }
          break
        case expectedToUserName:
          obj = {
            UserName: expectedToUserName,
            NickName: expectedToNickName,
          }
          break
        default:
          log.error('TestMessage', `mocked getContact(${id}) unknown`)
          t.fail('mocked getContact(${id}) unknown')
          break
      }
      log.silly('TestMessage', 'setTimeout mocked getContact')
      setTimeout(r => {
        log.silly('TestMessage', 'mocked getContact resolved')
        return resolve(obj)
      }, 100)
    })
  }

  config.puppetInstance()
        .getContact = mockGetContact

  const m = new Message(rawData)

  t.is(m.id, expectedMsgId, 'id/MsgId right')
  await m.ready()

  const fc = m.from()
  const tc = m.to()

  if (!fc || !tc) {
    throw new Error('no fc or no tc')
  }

  t.is(fc.id      , expectedFromUserName, 'contact ready for FromUserName')
  t.is(fc.name()  , expectedFromNickName, 'contact ready for FromNickName')
  t.is(tc.id      , expectedToUserName  , 'contact ready for ToUserName')
  t.is(tc.name()  , expectedToNickName  , 'contact ready for ToNickName')
})

test('find()', async t => {
  const m = await Message.find({
    id: 'xxx',
  })

  t.ok(m.id, 'Message.find')
})

test('findAll()', async t => {
  const msgList = await Message.findAll({
    from: 'yyy',
  })

  t.is(msgList.length, 2, 'Message.findAll with limit 2')
})

test('self()', async t => {
  config.puppetInstance(puppet)

  const m = new Message()
  m.from(MOCK_USER_ID)

  t.true(m.self(), 'should identify self message true where message from userId')

  m.from('fdsafasfsfa')
  t.false(m.self(), 'should identify self message false when from a different fromId')
})

test('mentioned()', async t => {
  /* tslint:disable:max-line-length */
  const rawObj11 = JSON.parse(`{"MsgId":"6475340302153501409","FromUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","ToUserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","MsgType":1,"Content":"@4c32c97337cbb325442c304d6a44e374:<br/>@_@","Status":3,"ImgStatus":1,"CreateTime":1489823176,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":6475340302153502000,"OriContent":"","MMPeerUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@_@","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"6475340302153501409","ClientMsgId":"6475340302153501409","MMActualContent":"@_@","MMActualSender":"@4c32c97337cbb325442c304d6a44e374","MMDigestTime":"15:46","MMDisplayTime":1489823176,"MMTime":"15:46"}`)

  const rawObj12 = JSON.parse(`{"MsgId":"3670467504370401673","FromUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","ToUserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","MsgType":1,"Content":"@4c32c97337cbb325442c304d6a44e374:<br/>user@email.com","Status":3,"ImgStatus":1,"CreateTime":1489823281,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":3670467504370402000,"OriContent":"","MMPeerUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:user@email.com","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"3670467504370401673","ClientMsgId":"3670467504370401673","MMActualContent":"<a target=\'_blank\' href=\'/cgi-bin/mmwebwx-bin/webwxcheckurl?requrl=http%3A%2F%2Fuser%40email.com&skey=%40crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7&deviceid=e982718209172853&pass_ticket=undefined&opcode=2&scene=1&username=@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2\'>user@email.com</a>","MMActualSender":"@4c32c97337cbb325442c304d6a44e374","MMDigestTime":"15:48","MMDisplayTime":1489823176,"MMTime":""}`)

  const rawObj13 = JSON.parse(`{"MsgId":"6796857876930585020","FromUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","ToUserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","MsgType":1,"Content":"@4c32c97337cbb325442c304d6a44e374:<br/>@_@ wow! my email is ruiruibupt@gmail.com","Status":3,"ImgStatus":1,"CreateTime":1489823387,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":6796857876930585000,"OriContent":"","MMPeerUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@_@ wow! my email is ruiruibupt@gmail.com","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"6796857876930585020","ClientMsgId":"6796857876930585020","MMActualContent":"@_@ wow! my email is<a target=\'_blank\' href=\'/cgi-bin/mmwebwx-bin/webwxcheckurl?requrl=http%3A%2F%2Fruiruibupt%40gmail.com&skey=%40crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7&deviceid=e982718209172853&pass_ticket=undefined&opcode=2&scene=1&username=@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2\'> ruiruibupt@gmail.com</a>","MMActualSender":"@4c32c97337cbb325442c304d6a44e374","MMDigestTime":"15:49","MMDisplayTime":1489823387,"MMTime":"15:49"}`)

  const rawObj21 = JSON.parse(`{"MsgId":"2661793617819734017","FromUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","ToUserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","MsgType":1,"Content":"@4c32c97337cbb325442c304d6a44e374:<br/>@小桔同学 你好啊","Status":3,"ImgStatus":1,"CreateTime":1489823541,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":2661793617819734000,"OriContent":"","MMPeerUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@小桔同学 你好啊","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"2661793617819734017","ClientMsgId":"2661793617819734017","MMActualContent":"@小桔同学 你好啊","MMActualSender":"@4c32c97337cbb325442c304d6a44e374","MMDigestTime":"15:52","MMDisplayTime":1489823387,"MMTime":""}`)

  const rawObj22 = JSON.parse(`{"MsgId":"5278536998175085820","FromUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","ToUserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","MsgType":1,"Content":"@4c32c97337cbb325442c304d6a44e374:<br/>@wuli舞哩客服 和@小桔同学 是好朋友","Status":3,"ImgStatus":1,"CreateTime":1489823598,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":5278536998175086000,"OriContent":"","MMPeerUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@wuli舞哩客服 和@小桔同学 是好朋友","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"5278536998175085820","ClientMsgId":"5278536998175085820","MMActualContent":"@wuli舞哩客服 和@小桔同学 是好朋友","MMActualSender":"@4c32c97337cbb325442c304d6a44e374","MMDigestTime":"15:53","MMDisplayTime":1489823598,"MMTime":"15:53"}`)

  const rawObj31 = JSON.parse(`{"MsgId":"7410792097315403535","FromUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","ToUserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","MsgType":1,"Content":"@4c32c97337cbb325442c304d6a44e374:<br/>@wuli舞哩客服 我的邮箱是 ruiruibupt@gmail.com","Status":3,"ImgStatus":1,"CreateTime":1489823684,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":7410792097315404000,"OriContent":"","MMPeerUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@wuli舞哩客服 我的邮箱是 ruiruibupt@gmail.com","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"7410792097315403535","ClientMsgId":"7410792097315403535","MMActualContent":"@wuli舞哩客服 我的邮箱是<a target=\'_blank\' href=\'/cgi-bin/mmwebwx-bin/webwxcheckurl?requrl=http%3A%2F%2Fruiruibupt%40gmail.com&skey=%40crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7&deviceid=e982718209172853&pass_ticket=undefined&opcode=2&scene=1&username=@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2\'> ruiruibupt@gmail.com</a>","MMActualSender":"@4c32c97337cbb325442c304d6a44e374","MMDigestTime":"15:54","MMDisplayTime":1489823598,"MMTime":""}`)

  const rawObj32 = JSON.parse(`{"MsgId":"3807714644369652210","FromUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","ToUserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","MsgType":1,"Content":"@4c32c97337cbb325442c304d6a44e374:<br/>@_@ wow，@wuli舞哩客服 和@小桔同学 看起来很有默契","Status":3,"ImgStatus":1,"CreateTime":1489823764,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":3807714644369652000,"OriContent":"","MMPeerUserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","MMDigest":"22acb030-ff09-11e6-8a73-cff62d9268c5:@_@ wow，@wuli舞哩客服 和@小桔同学 看起来很有默契","MMIsSend":false,"MMIsChatRoom":true,"MMUnread":true,"LocalID":"3807714644369652210","ClientMsgId":"3807714644369652210","MMActualContent":"@_@ wow，@wuli舞哩客服 和@小桔同学 看起来很有默契","MMActualSender":"@4c32c97337cbb325442c304d6a44e374","MMDigestTime":"15:56","MMDisplayTime":1489823598,"MMTime":""}`)

  const RAW_OBJ = JSON.parse(`{"RemarkPYQuanPin":"22acb030ff0911e68a73cff62d9268c5","RemarkPYInitial":"22ACB030FF0911E68A73CFF62D9268C5","PYInitial":"","PYQuanPin":"","Uin":0,"UserName":"@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4","NickName":"付费入群","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgetheadimg?seq=670397504&username=@@e2355db381dc46a77c0b95516d05e7486135cb6370d8a6af66925d89d50ec278&skey=","ContactFlag":2,"MemberCount":146,"MemberList":[{"Alias":"ruirui_0914","AppAccountFlag":0,"AttrStatus":2147584103,"ChatRoomId":0,"City":"海淀","ContactFlag":3,"DisplayName":"","EncryChatRoomId":"","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=648035215&username=@4c32c97337cbb325442c304d6a44e374&skey=@crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7","HideInputBarFlag":0,"IsOwner":0,"KeyWord":"qq5","MMOrderSymbol":"~","MemberCount":0,"MemberList":[],"NickName":"李佳芮","OwnerUin":0,"PYInitial":"LJR","PYQuanPin":"lijiarui","Province":"北京","RemarkName":"22acb030-ff09-11e6-8a73-cff62d9268c5","RemarkPYInitial":"22ACB030FF0911E68A73CFF62D9268C5","RemarkPYQuanPin":"22acb030ff0911e68a73cff62d9268c5","Sex":2,"Signature":"出洞计划  |  向前一步","SnsFlag":49,"StarFriend":0,"Statues":0,"Uin":0,"UniFriend":0,"UserName":"@4c32c97337cbb325442c304d6a44e374","VerifyFlag":0,"_h":50,"_index":16,"_offsetTop":696,"stranger":false},{"AppAccountFlag":0,"ContactFlag":0,"HeadImgFlag":1,"HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=665886775&username=@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2&skey=@crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7","HideInputBarFlag":0,"MMOrderSymbol":"~","NickName":"小桔同学","PYInitial":"","PYQuanPin":"","RemarkName":"","RemarkPYInitial":"","RemarkPYQuanPin":"","Sex":0,"Signature":"我是一个性感的机器人","SnsFlag":1,"StarFriend":0,"Uin":244009576,"UserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","VerifyFlag":0,"WebWxPluginSwitch":0,"stranger":false},{"$$hashKey":"01J","Alias":"dancewuli","AppAccountFlag":0,"AttrStatus":233509,"ChatRoomId":0,"City":"","ContactFlag":3,"DisplayName":"","EncryChatRoomId":"","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=635310858&username=@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855&skey=@crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7","HideInputBarFlag":0,"IsOwner":0,"KeyWord":"","MMOrderSymbol":"~","MemberCount":0,"MemberList":[],"NickName":"wuli舞哩客服","OwnerUin":0,"PYInitial":"WULIWLKF","PYQuanPin":"wuliwulikefu","Province":"","RemarkName":"50fb16c0-ff09-11e6-9fe5-dda97284d25b","RemarkPYInitial":"50FB16C0FF0911E69FE5DDA97284D25B","RemarkPYQuanPin":"50fb16c0ff0911e69fe5dda97284d25b","Sex":0,"Signature":"","SnsFlag":1,"StarFriend":0,"Statues":0,"Uin":0,"UniFriend":0,"UserName":"@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855","VerifyFlag":0,"_h":50,"_index":10,"_offsetTop":396,"stranger":false}],"RemarkName":"","HideInputBarFlag":0,"Sex":0,"Signature":"","VerifyFlag":0,"OwnerUin":2351423900,"StarFriend":0,"AppAccountFlag":0,"Statues":0,"AttrStatus":0,"Province":"","City":"","Alias":"","SnsFlag":0,"UniFriend":0,"DisplayName":"","ChatRoomId":0,"KeyWord":"","MMFromBatchGet":true,"MMFromBatchget":true,"MMInChatroom":true}`)

  const CONTACT_LIST = JSON.parse(`{"@4c32c97337cbb325442c304d6a44e374":{"Alias":"ruirui_0914","AppAccountFlag":0,"AttrStatus":2147584103,"ChatRoomId":0,"City":"海淀","ContactFlag":3,"DisplayName":"","EncryChatRoomId":"","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=648035215&username=@4c32c97337cbb325442c304d6a44e374&skey=@crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7","HideInputBarFlag":0,"IsOwner":0,"KeyWord":"qq5","MMOrderSymbol":"~","MemberCount":0,"MemberList":[],"NickName":"李佳芮","OwnerUin":0,"PYInitial":"LJR","PYQuanPin":"lijiarui","Province":"北京","RemarkName":"22acb030-ff09-11e6-8a73-cff62d9268c5","RemarkPYInitial":"22ACB030FF0911E68A73CFF62D9268C5","RemarkPYQuanPin":"22acb030ff0911e68a73cff62d9268c5","Sex":2,"Signature":"出洞计划  |  向前一步","SnsFlag":49,"StarFriend":0,"Statues":0,"Uin":0,"UniFriend":0,"UserName":"@4c32c97337cbb325442c304d6a44e374","VerifyFlag":0,"_h":50,"_index":16,"_offsetTop":696,"stranger":false},"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2":{"AppAccountFlag":0,"ContactFlag":0,"HeadImgFlag":1,"HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=665886775&username=@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2&skey=@crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7","HideInputBarFlag":0,"MMOrderSymbol":"~","NickName":"小桔同学","PYInitial":"","PYQuanPin":"","RemarkName":"","RemarkPYInitial":"","RemarkPYQuanPin":"","Sex":0,"Signature":"我是一个性感的机器人","SnsFlag":1,"StarFriend":0,"Uin":244009576,"UserName":"@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2","VerifyFlag":0,"WebWxPluginSwitch":0,"stranger":false},"@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855":{"$$hashKey":"01J","Alias":"dancewuli","AppAccountFlag":0,"AttrStatus":233509,"ChatRoomId":0,"City":"","ContactFlag":3,"DisplayName":"","EncryChatRoomId":"","HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=635310858&username=@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855&skey=@crypt_ee003aea_5265cdd0c2676aab3df86b0249ae90f7","HideInputBarFlag":0,"IsOwner":0,"KeyWord":"","MMOrderSymbol":"~","MemberCount":0,"MemberList":[],"NickName":"wuli舞哩客服","OwnerUin":0,"PYInitial":"WULIWLKF","PYQuanPin":"wuliwulikefu","Province":"","RemarkName":"50fb16c0-ff09-11e6-9fe5-dda97284d25b","RemarkPYInitial":"50FB16C0FF0911E69FE5DDA97284D25B","RemarkPYQuanPin":"50fb16c0ff0911e69fe5dda97284d25b","Sex":0,"Signature":"","SnsFlag":1,"StarFriend":0,"Statues":0,"Uin":0,"UniFriend":0,"UserName":"@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855","VerifyFlag":0,"_h":50,"_index":10,"_offsetTop":396,"stranger":false}}`)

  const ROOM_ID = '@@9cdc696e490bd76c57e7dd54792dc1408e27d65e312178b1943e88579b7939f4'

  // Mock
  const mockContactGetter = function (id) {
    return new Promise((resolve, reject) => {
      if (id !== ROOM_ID && !(id in CONTACT_LIST)) return resolve({})
      if (id === ROOM_ID) {
        resolve(RAW_OBJ)
      }
      if (id in CONTACT_LIST) {
        setTimeout(() => {
          return resolve(CONTACT_LIST[id])
        }, 10)
      }
    })
  }

  let puppet1
  try {
    puppet1 = config.puppetInstance()
    puppet1.getContact = mockContactGetter
  } catch (err) {
    puppet1 = { getContact: mockContactGetter }
    config.puppetInstance(puppet1)
  }
  const msg11 = new Message(rawObj11)
  const room11 = msg11.room()
  if (room11) {
    await room11.ready()
    const mentionContactList11 = msg11.mentioned()
    t.is(mentionContactList11.length, 0, '@_@ in message should not be treat as contact')
  }

  const msg12 = new Message(rawObj12)
  const room12 = msg12.room()
  if (room12) {
    await room12.ready()
    const mentionContactList12 = msg12.mentioned()
    t.is(mentionContactList12.length, 0, 'user@email.com in message should not be treat as contact')
  }

  const msg13 = new Message(rawObj13)
  const room13 = msg13.room()
  if (room13) {
    await room13.ready()
    // setTimeout(function () {
    const mentionContactList13 = msg13.mentioned()
    t.is(mentionContactList13.length, 0, '@_@ wow! my email is ruiruibupt@gmail.com in message should not be treat as contact')
    // }, 1 * 1000)
  }

  const msg21 = new Message(rawObj21)
  const room21 = msg21.room()
  if (room21) {
    await room21.ready()
    const mentionContactList21 = msg21.mentioned()
    t.is(mentionContactList21.length, 1, '@小桔同学 is a contact')
    t.is(mentionContactList21[0].id, '@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2', 'should get 小桔同学 id right in rawObj21')
  }

  const msg22 = new Message(rawObj22)
  const room22 = msg22.room()
  if (room22) {
    await room22.ready()
    const mentionContactList22 = msg22.mentioned()
    t.is(mentionContactList22.length, 2, '@小桔同学 and @wuli舞哩客服 is a contact')
    // not sure the rela serial
    t.is(mentionContactList22[0].id, '@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855', 'should get 小桔同学 id right in rawObj22')
    t.is(mentionContactList22[1].id, '@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2', 'should get wuli舞哩客服 id right in rawObj22')
  }

  const msg31 = new Message(rawObj31)
  const room31 = msg31.room()
  if (room31) {
    await room31.ready()
    const mentionContactList31 = msg31.mentioned()
    t.is(mentionContactList31.length, 1, '@wuli舞哩客服 is a contact')
    t.is(mentionContactList31[0].id, '@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855', 'should get wuli舞哩客服 id right in rawObj31')
  }

  const msg32 = new Message(rawObj32)
  const room32 = msg32.room()
  if (room32) {
    await room32.ready()
    const mentionContactList32 = msg32.mentioned()
    t.is(mentionContactList32.length, 2, '@小桔同学 and @wuli舞哩客服 is a contact')
    t.is(mentionContactList32[0].id, '@36d55130f6a91bae4a2ed2cc5f19c56a9258c65ce3db9777f74f607223ef0855', 'should get wuli舞哩客服 id right in rawObj32')
    t.is(mentionContactList32[1].id, '@cd7d467d7464e8ff6b0acd29364654f3666df5d04551f6082bfc875f90a6afd2', 'should get 小桔同学 id right in rawObj32')
  }
})
