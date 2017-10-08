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

import config                 from '../config'
import Contact                from '../contact'
import Message                from '../message'
import Puppet                 from '../puppet'
import PuppetWebFriendRequest from './friend-request'

config.puppetInstance({
  userId: 'xxx',
} as Puppet)

test('PuppetWebFriendRequest.receive smoke testing', async t => {
  /* tslint:disable:max-line-length */
  const rawMessageData = `
    {"MsgId":"3225371967511173931","FromUserName":"fmessage","ToUserName":"@f7321198e0349f1b38c9f2ef158f70eb","MsgType":37,"Content":"&lt;msg fromusername=\\"wxid_a8d806dzznm822\\" encryptusername=\\"v1_c1e03a32c60dd9a9e14f1092132808a2de0ad363f79b303693654282954fbe4d3e12481166f4b841f28de3dd58b0bd54@stranger\\" fromnickname=\\"李卓桓.PreAngel\\" content=\\"我是群聊&amp;quot;Wechaty&amp;quot;的李卓桓.PreAngel\\"  shortpy=\\"LZHPREANGEL\\" imagestatus=\\"3\\" scene=\\"14\\" country=\\"CN\\" province=\\"Beijing\\" city=\\"Haidian\\" sign=\\"投资人中最会飞的程序员。好友请加 918999 ，因为本号好友已满。\\" percard=\\"1\\" sex=\\"1\\" alias=\\"zixia008\\" weibo=\\"\\" weibonickname=\\"\\" albumflag=\\"0\\" albumstyle=\\"0\\" albumbgimgid=\\"911623988445184_911623988445184\\" snsflag=\\"49\\" snsbgimgid=\\"http://mmsns.qpic.cn/mmsns/zZSYtpeVianSQYekFNbuiajROicLficBzzeGuvQjnWdGDZ4budZovamibQnoKWba7D2LeuQRPffS8aeE/0\\" snsbgobjectid=\\"12183966160653848744\\" mhash=\\"\\" mfullhash=\\"\\" bigheadimgurl=\\"http://wx.qlogo.cn/mmhead/ver_1/xct7OPTbuU6iaS8gTaK2VibhRs3rATwnU1rCUwWu8ic89EGOynaic2Y4MUdKr66khhAplcfFlm7xbXhum5reania3fXDXH6CI9c3Bb4BODmYAh04/0\\" smallheadimgurl=\\"http://wx.qlogo.cn/mmhead/ver_1/xct7OPTbuU6iaS8gTaK2VibhRs3rATwnU1rCUwWu8ic89EGOynaic2Y4MUdKr66khhAplcfFlm7xbXhum5reania3fXDXH6CI9c3Bb4BODmYAh04/132\\" ticket=\\"v2_ba70dfbdb1b10168d61c1ab491be19e219db11ed5c28701f605efb4dccbf132f664d8a4c9ef6e852b2a4e8d8638be81d125c2e641f01903669539c53f1e582b2@stranger\\" opcode=\\"2\\" googlecontact=\\"\\" qrticket=\\"\\" chatroomusername=\\"2332413729@chatroom\\" sourceusername=\\"\\" sourcenickname=\\"\\"&gt;&lt;brandlist count=\\"0\\" ver=\\"670564024\\"&gt;&lt;/brandlist&gt;&lt;/msg&gt;","Status":3,"ImgStatus":1,"CreateTime":1475567560,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"@04a0fa314d0d8d50dc54e2ec908744ebf46b87404d143fd9a6692182dd90bd49","NickName":"李卓桓.PreAngel","Province":"北京","City":"海淀","Content":"我是群聊\\"Wechaty\\"的李卓桓.PreAngel","Signature":"投资人中最会飞的程序员。好友请加 918999 ，因为本号好友已满。","Alias":"zixia008","Scene":14,"AttrStatus":233251,"Sex":1,"Ticket":"v2_ba70dfbdb1b10168d61c1ab491be19e219db11ed5c28701f605efb4dccbf132f664d8a4c9ef6e852b2a4e8d8638be81d125c2e641f01903669539c53f1e582b2@stranger","OpCode":2,"HeadImgUrl":"/cgi-bin/mmwebwx-bin/webwxgeticon?seq=0&username=@04a0fa314d0d8d50dc54e2ec908744ebf46b87404d143fd9a6692182dd90bd49&skey=@crypt_f9cec94b_5b073dca472bd5e41771d309bb8c37bd&msgid=3225371967511173931","MMFromVerifyMsg":true},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":3225371967511174000,"MMPeerUserName":"fmessage","MMDigest":"李卓桓.PreAngel想要将你加为朋友","MMIsSend":false,"MMIsChatRoom":false,"MMUnread":true,"LocalID":"3225371967511173931","ClientMsgId":"3225371967511173931","MMActualContent":"&lt;msg fromusername=\\"wxid_a8d806dzznm822\\" encryptusername=\\"v1_c1e03a32c60dd9a9e14f1092132808a2de0ad363f79b303693654282954fbe4d3e12481166f4b841f28de3dd58b0bd54@stranger\\" fromnickname=\\"李卓桓.PreAngel\\" content=\\"我是群聊&amp;quot;Wechaty&amp;quot;的李卓桓.PreAngel\\"  shortpy=\\"LZHPREANGEL\\" imagestatus=\\"3\\" scene=\\"14\\" country=\\"CN\\" province=\\"Beijing\\" city=\\"Haidian\\" sign=\\"投资人中最会飞的程序员。好友请加 918999 ，因为本号好友已满。\\" percard=\\"1\\" sex=\\"1\\" alias=\\"zixia008\\" weibo=\\"\\" weibonickname=\\"\\" albumflag=\\"0\\" albumstyle=\\"0\\" albumbgimgid=\\"911623988445184_911623988445184\\" snsflag=\\"49\\" snsbgimgid=\\"http://mmsns.qpic.cn/mmsns/zZSYtpeVianSQYekFNbuiajROicLficBzzeGuvQjnWdGDZ4budZovamibQnoKWba7D2LeuQRPffS8aeE/0\\" snsbgobjectid=\\"12183966160653848744\\" mhash=\\"\\" mfullhash=\\"\\" bigheadimgurl=\\"http://wx.qlogo.cn/mmhead/ver_1/xct7OPTbuU6iaS8gTaK2VibhRs3rATwnU1rCUwWu8ic89EGOynaic2Y4MUdKr66khhAplcfFlm7xbXhum5reania3fXDXH6CI9c3Bb4BODmYAh04/0\\" smallheadimgurl=\\"http://wx.qlogo.cn/mmhead/ver_1/xct7OPTbuU6iaS8gTaK2VibhRs3rATwnU1rCUwWu8ic89EGOynaic2Y4MUdKr66khhAplcfFlm7xbXhum5reania3fXDXH6CI9c3Bb4BODmYAh04/132\\" ticket=\\"v2_ba70dfbdb1b10168d61c1ab491be19e219db11ed5c28701f605efb4dccbf132f664d8a4c9ef6e852b2a4e8d8638be81d125c2e641f01903669539c53f1e582b2@stranger\\" opcode=\\"2\\" googlecontact=\\"\\" qrticket=\\"\\" chatroomusername=\\"2332413729@chatroom\\" sourceusername=\\"\\" sourcenickname=\\"\\"&gt;&lt;brandlist count=\\"0\\" ver=\\"670564024\\"&gt;&lt;/brandlist&gt;&lt;/msg&gt;","MMActualSender":"fmessage","MMDigestTime":"15:52","MMDisplayTime":1475567560,"MMTime":"15:52"}
`
  const rawObj = JSON.parse(rawMessageData)
  // const m = new Message(rawObj)
  const fr = new PuppetWebFriendRequest()

  fr.receive(rawObj.RecommendInfo)

  t.true(typeof fr.info === 'object', 'should has info object')
  t.is(fr.hello, '我是群聊"Wechaty"的李卓桓.PreAngel', 'should has right request message')
  t.true(fr.contact instanceof Contact, 'should have a Contact instance')
  t.is(fr.type as any, 'receive', 'should be receive type')
})

test('PuppetWebFriendRequest.confirm smoke testing', async t => {
  /* tslint:disable:max-line-length */
  const rawMessageData = `
    {"MsgId":"3382012679535022763","FromUserName":"@04a0fa314d0d8d50dc54e2ec908744ebf46b87404d143fd9a6692182dd90bd49","ToUserName":"@f7321198e0349f1b38c9f2ef158f70eb","MsgType":10000,"Content":"You have added 李卓桓.PreAngel as your WeChat contact. Start chatting!","Status":4,"ImgStatus":1,"CreateTime":1475569920,"VoiceLength":0,"PlayLength":0,"FileName":"","FileSize":"","MediaId":"","Url":"","AppMsgType":0,"StatusNotifyCode":0,"StatusNotifyUserName":"","RecommendInfo":{"UserName":"","NickName":"","QQNum":0,"Province":"","City":"","Content":"","Signature":"","Alias":"","Scene":0,"VerifyFlag":0,"AttrStatus":0,"Sex":0,"Ticket":"","OpCode":0},"ForwardFlag":0,"AppInfo":{"AppID":"","Type":0},"HasProductId":0,"Ticket":"","ImgHeight":0,"ImgWidth":0,"SubMsgType":0,"NewMsgId":3382012679535022600,"MMPeerUserName":"@04a0fa314d0d8d50dc54e2ec908744ebf46b87404d143fd9a6692182dd90bd49","MMDigest":"You have added 李卓桓.PreAngel as your WeChat contact. Start chatting!","MMIsSend":false,"MMIsChatRoom":false,"LocalID":"3382012679535022763","ClientMsgId":"3382012679535022763","MMActualContent":"You have added 李卓桓.PreAngel as your WeChat contact. Start chatting!","MMActualSender":"@04a0fa314d0d8d50dc54e2ec908744ebf46b87404d143fd9a6692182dd90bd49","MMDigestTime":"16:32","MMDisplayTime":1475569920,"MMTime":"16:32"}
  `
  const rawObj = JSON.parse(rawMessageData)
  const m = new Message(rawObj)

  t.true(/^You have added (.+) as your WeChat contact. Start chatting!$/.test(m.content()), 'should match confirm message')

  const fr = new PuppetWebFriendRequest()
  const contact = m.from()
  fr.confirm(contact || new Contact('xx'))

  t.true(fr.contact instanceof Contact, 'should have a Contact instance')
  t.is(fr.type as any, 'confirm', 'should be confirm type')
})
