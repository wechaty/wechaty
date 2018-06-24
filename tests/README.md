# TESTS

Run unit tests

```shell
$ npm test
...

```

If you want to see full log messages

```shell
$ WECHATY_LOG=silly npm test
...

```

## EXAMPLE OUTPUT

```bash


> wechaty@0.17.11 test /home/zixia/chatie/wechaty
> npm run clean && npm run lint && npm run test:unit:retry && npm run test:shell && npm run sloc


> wechaty@0.17.11 clean /home/zixia/chatie/wechaty
> shx rm -fr dist/*


> wechaty@0.17.11 lint /home/zixia/chatie/wechaty
> npm run check-node-version && npm run lint:ts && npm run lint:es && npm run lint:sh


> wechaty@0.17.11 check-node-version /home/zixia/chatie/wechaty
> check-node-version --node ">= 8.5"


> wechaty@0.17.11 lint:ts /home/zixia/chatie/wechaty
> tslint --project tsconfig.json && tsc --noEmit


> wechaty@0.17.11 lint:es /home/zixia/chatie/wechaty
> eslint "{bin,examples,scripts,src,tests}/**/*.js" --ignore-pattern="tests/fixtures/**"


> wechaty@0.17.11 lint:sh /home/zixia/chatie/wechaty
> bash -n bin/*.sh


> wechaty@0.17.11 test:unit:retry /home/zixia/chatie/wechaty
> ts-node scripts/retry-unit-tests

Safe Test: starting...
Safe Test: running for round #0

> wechaty@0.17.11 test:unit /home/zixia/chatie/wechaty
> TS_NODE_FILES=1 blue-tape -r ts-node/register "src/**/*.spec.ts" "src/*.spec.ts" "tests/*.spec.ts" "tests/**/*.spec.ts"

TAP version 13
# Accessory smoke testing
ok 1 should throw if read static puppet before initialize
ok 2 should throw if read instance puppet before initialization
ok 3 should get EXPECTED_PUPPET1 from static puppet after set static puppet
ok 4 should get EXPECTED_PUPPET1 from instance puppet after set static puppet
# Two clone-ed classes have different static puppet value
ok 5 should get the puppet as 1 from 1st cloned class
ok 6 should get the puppet as 2 from 2nd cloned class
# Throw error when set the value again
ok 7 instance: should not throw when set at 1st time
ok 8 instance: should throw when set at 2nd time
ok 9 static: should not throw when set at 1st time
ok 10 static: should throw when set at 2nd time
# important variables
ok 11 should exist `puppet` in Config
ok 12 should exist `apihost` in Config
ok 13 should exist `profile` in Config
ok 14 should exist `token` in Config
ok 15 should export DEFAULT_PUPPET
ok 16 should export DEFAULT_PROFILE
ok 17 should export DEFAULT_PROTOCOL
ok 18 should export DEFAULT_APIHOST
# validApiHost()
ok 19 should not throw
ok 20 should not throw
ok 21 should throw
ok 22 should throw
# Io restart without problem
ok 23 start/stop-ed at #0
ok 24 start/stop-ed at #1
ok 25 start/restart successed.
# stripHtml()
ok 26 should strip html as expected
# unescapeHtml()
ok 27 should unescape html as expected
# plainText()
ok 28 should convert plain text as expected
# digestEmoji()
ok 29 should digest emoji string 0 as expected
ok 30 should digest emoji string 1 as expected
ok 31 should digest emoji string 2 as expected
ok 32 should digest emoji string 3 as expected
# unifyEmoji()
ok 33 should convert the emoji xml to the expected unified xml
ok 34 should convert the emoji xml to the expected unified xml
# stripEmoji()
ok 35 should strip to the expected str
ok 36 should strip to the expected str
ok 37 should return empty string for `undefined`
# downloadStream() for media
ok 38 should has cookies in req
ok 39 should has a cookie named life value 42
ok 40 should success download dong from downloadStream()
# getPort() for an available socket port
ok 41 should not be same port even it is available(to provent conflict between concurrency tests in AVA)
ok 42 should has no exception after loop test
# promiseRetry()
ok 43 should got EXPECTED_REJECT when wait not enough
ok 44 should got EXPECTED_RESOLVE when wait enough
# retry()
ok 45 should got EXPECTED_RESOLVE when wait enough
# PuppetMock restart without problem
ok 46 start/stop-ed at #0
ok 47 start/stop-ed at #1
ok 48 start/stop-ed at #2
ok 49 PuppetMock() start/restart successed.
# PadchatManager() cache should be release and can be re-init again.
ok 50 init/release-ed at #0
ok 51 init/release-ed at #1
ok 52 init/release-ed at #2
ok 53 PadchatManager() cache init/release/init successed.
# PadchatManager() cache release 10 instances for the same time
ok 54 release 10 at the same time success
# PadchatManager() should can be able to restart() many times for one instance
ok 55 restarted at #0
ok 56 restarted at #1
ok 57 restarted at #2
ok 58 PadchatManager() restart successed.
# PadchatManager() stop many instances for the same time
ok 59 stop3 at the same time success
# PuppetPadchat() throw exception when instanciate the second instance without options.token
ok 60 should instance the 1st puppet without problem
ok 61 should throw when instance the 2nd instance without the token option
ok 62 should instance the 3rd puppet with token option
# stripBugChatroomId()
ok 63 should return pure user_name for RAW_USER_NAME_1
ok 64 should return pure user_name for RAW_USER_NAME_2
ok 65 should return empty string for undifined
# contactRawPayloadParser
ok 66 should parse ContactPayload for personal account payload
ok 67 should parse ContactPayload for official account payload
ok 68 should throw exception for invalid object
ok 69 should throw exception for undifined
# imageBase64ToQrCode()
ok 70 should decode qrcode image base64
# friendshipConfirmEventMessageParser() EN-confirm-by-other
ok 71 should parse message to contact id
# friendshipConfirmEventMessageParser() EN-confirm-by-bot
ok 72 should parse message to contact id
# friendshipConfirmEventMessageParser() ZH-confirm-by-other
ok 73 tbw # SKIP
# friendshipConfirmEventMessageParser() ZH-confirm-by-bot
ok 74 should parse message to contact id
# friendshipReceiveEventMessageParser()
ok 75 should parse message to receive contact id
# friendshipConfirmEventMessageParser()
ok 76 should parse `undefined`
ok 77 should parse `null`
ok 78 should parse `{}`
ok 79 should parse invalid content
# friendshipReceiveEventMessageParser()
ok 80 should parse `undefined`
ok 81 should parse `null`
ok 82 should parse `{}`
ok 83 should parse invalid content
# friendshipVerifyEventMessageParser()
ok 84 should parse `undefined`
ok 85 should parse `null`
ok 86 should parse `{}`
ok 87 should parse invalid content
# friendshipVerifyEventMessageParser() EN
ok 88 should parse verify message to contact id
# friendshipVerifyEventMessageParser() ZH
ok 89 should parse verify message to contact id
# friendshipRawPayloadParser()
ok 90 should parse friendshipPayload right
# isRoomId()
ok 91 should return true for ROOM_ID
ok 92 should return false for ROOM_ID
ok 93 should return false for undifined
# isContactId()
ok 94 should return true for CONTACT_ID
ok 95 should return false for CONTACT_ID
ok 96 should return false for undifined
# isContactOfficialId()
ok 97 should return true for OFFICIAL_CONTACT_ID
ok 98 should return false for NOT_OFFICIAL_CONTACT_ID
ok 99 should return false for undifined
# isStrangerV1()
ok 100 should return true for STRANGER_V1
ok 101 should return false for NOT_STRANGER_V1
# isStrangerV2()
ok 102 should return true for STRANGER_V2
ok 103 should return false for NOT_STRANGER_V2
# isPayload()
ok 104 undefined is not payload
ok 105 null is not payload
ok 106 {} is not payload
ok 107 valid payload
# messageRawPayloadParser
ok 108 tbw # SKIP
# sys
ok 109 should parse sys message payload
# status notify
ok 110 should parse status notify message payload
# room invitation created by bot
ok 111 should parse room invitation message payload
# room ownership transfer message
ok 112 should parse ower transfer message
# StatusNotify to roomId
ok 113 should parse status notify message to room id
# share card peer to peer
ok 114 should parse share card message peer to peer
# share card in room
ok 115 should parse share card message peer to peer
# padchatDecode() uri decode with +
ok 116 should parse json text with "+" right
# padchatDecode() plain json text
ok 117 should decode invalid uridecode text
# roomJoinEventMessageParser() EN-other-invite-other
ok 118 should parse event
# roomJoinEventMessageParser() EN-other-invite-others
ok 119 should parse event
# roomJoinEventMessageParser() EN-other-invite-bot
ok 120 should parse event
# roomJoinEventMessageParser() EN-other-invite-bot-with-2-others
ok 121 should parse event
# roomJoinEventMessageParser() EN-bot-invite-one
ok 122 should parse event
# roomJoinEventMessageParser() EN-bot-invite-three-bot-is-owner
ok 123 should parse event
# roomJoinEventMessageParser() EN-bot-invite-three-bot-is-not-owner
ok 124 should parse event
# roomJoinEventMessageParser() EN-other-invite-bot-and-two
ok 125 should parse event
# roomJoinEventMessageParser() EN-scan-qrcode-shared-by-bot-when-bot-is-owner
ok 126 should parse event
# roomJoinEventMessageParser() EN-scan-qrcode-shared-by-bot-when-bot-not-owner
ok 127 should parse event
# roomJoinEventMessageParser() EN-scan-qrcode-shared-by-other-when-bot-is-owner
ok 128 should parse event
# roomJoinEventMessageParser() EN-scan-qrcode-shared-by-other-when-bot-no-owner
ok 129 should parse event
# roomJoinEventMessageParser() EN-bot-invite-many
ok 130 should be the same as the bot-invite-many # SKIP
# roomJoinEventMessageParser() EN-room-create
ok 131 to be confirm # SKIP
# roomJoinEventMessageParser() not detected
ok 132 should return null for undefined
ok 133 should return null for null
ok 134 should return null for string
ok 135 should return null for empty object
ok 136 should return null for PadchatMessagePayload with unknown content
# roomJoinEventMessageParser() Recall Message
ok 137 should return null for a normal message recall payload
# roomJoinEventMessageParser() ZH-other-invite-other
ok 138 should parse room join message payload
# roomJoinEventMessageParser() ZH-other-invite-others
ok 139 tbw # SKIP
# roomJoinEventMessageParser() ZH-other-invite-bot
ok 140 should parse event
# roomJoinEventMessageParser() ZH-other-invite-bot-with-other
ok 141 should parse event
# roomJoinEventMessageParser() ZH-bot-invite-one
ok 142 should parse event
# roomJoinEventMessageParser() ZH-bot-invite-three-bot-is-owner
ok 143 should parse event
# roomJoinEventMessageParser() ZH-bot-invite-three-bot-is-not-owner
ok 144 should parse event
# roomJoinEventMessageParser() ZH-other-invite-bot-and-two
ok 145 should parse event
# roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-bot-when-bot-not-owner
ok 146 should parse event
# roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-bot-when-bot-is-owner
ok 147 should parse event
# roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-other-when-bot-no-owner
ok 148 should parse event
# roomJoinEventMessageParser() ZH-scan-qrcode-shared-by-other-when-bot-is-owner
ok 149 should parse event
# roomJoinEventMessageParser() ZH-bot-invite-three
ok 150 tbw # SKIP
# roomJoinEventMessageParser() ZH-room-create
ok 151 can not get create sys message, because room will not sync or appear before the creater send the first message # SKIP
# roomLeaveEventMessageParser() EN-bot-delete-other
ok 152 should parse room leave message payload
# roomLeaveEventMessageParser() EN-bot-delete-others
ok 153 the same as bot-delete-other # SKIP
# roomLeaveEventMessageParser() EN-other-delete-bot
ok 154 should parse event
# roomLeaveEventMessageParser() EN-other-delete-other
ok 155 can not detect # SKIP
# roomLeaveEventMessageParser() EN-other-delete-others
ok 156 can not detect # SKIP
# roomLeaveEventMessageParser() not detected
ok 157 should return null for undefined
ok 158 should return null for null
ok 159 should return null for string
ok 160 should return null for empty object
ok 161 should return null for PadchatMessagePayload with unknown content
# roomLeaveEventMessageParser() ZH-bot-delete-other
ok 162 should parse room leave message payload
# roomLeaveEventMessageParser() ZH-bot-delete-others
ok 163 the same as bot-delete-other # SKIP
# roomLeaveEventMessageParser() ZH-other-delete-bot
ok 164 should parse room leave message payload
# roomLeaveEventMessageParser() ZH-other-delete-other
ok 165 bot will not see any message, can not detected # SKIP
# roomLeaveEventMessageParser() ZH-other-delete-others
ok 166 bot will not see any message, can not detected # SKIP
# roomTopicEventMessageParser() EN-other-modify-topic
ok 167 should parse event
# roomTopicEventMessageParser() EN-bot-modify-topic
ok 168 should parse event
# roomTopicEventMessageParser() not detected
ok 169 should return null for undefined
ok 170 should return null for null
ok 171 should return null for string
ok 172 should return null for empty object
ok 173 should return null for PadchatMessagePayload with unknown content
# roomTopicEventMessageParser() ZH-bot-modify-topic
ok 174 should parse room topic message payload
# roomTopicEventMessageParser() ZH-other-modify-topic
ok 175 should parse room topic message payload
# splitChineseNameList()
ok 176 should split chinese name list
# splitEnglihshNameList()
ok 177 should split english name list
# PuppetPuppeteerBridge
ok 178 Bridge instnace
# preHtmlToXml()
ok 179 should parse html to xml
# testBlockedMessage()
# not blocked
ok 180 should return false when no block message
# html
ok 181 should get zh blocked message
# zh
ok 182 should get zh blocked message
# clickSwitchAccount()
# switch account needed
ok 183 should click the switch account button
# switch account not needed
ok 184 should no button found
# WechatyBro.ding()
ok 185 should instanciated a bridge
ok 186 should init Bridge
ok 187 should got dong after execute WechatyBro.ding()
ok 188 should got a boolean after call proxyWechaty(loginState)
ok 189 b.quit()
# Puppet Puppeteer Event smoke testing
ok 190 should be inited
ok 191 should be quited
# parseFriendConfirm()
ok 192 should be truthy for confirm msg: You have added 李卓桓 as your WeChat contact. Start chatting!
ok 193 should be truthy for confirm msg: 你已添加了李卓桓，现在可以开始聊天了。
ok 194 should be truthy for confirm msg: johnbassserver@gmail.com just added you to his/her contacts list. Send a message to him/her now!
ok 195 should be truthy for confirm msg: johnbassserver@gmail.com刚刚把你添加到通讯录，现在可以开始聊天了。
ok 196 should be falsy for other msg
# parseRoomJoin()
ok 197 should check room join message right for You invited 管理员 to the group chat. 
ok 198 should get inviteeList right
ok 199 should get inviter right
ok 200 should check room join message right for You invited 李卓桓.PreAngel、Bruce LEE to the group chat. 
ok 201 should get inviteeList right
ok 202 should get inviter right
ok 203 should check room join message right for 管理员 invited 小桔建群助手 to the group chat
ok 204 should get inviteeList right
ok 205 should get inviter right
ok 206 should check room join message right for 管理员 invited 庆次、小桔妹 to the group chat
ok 207 should get inviteeList right
ok 208 should get inviter right
ok 209 should check room join message right for 你邀请"管理员"加入了群聊 
ok 210 should get inviteeList right
ok 211 should get inviter right
ok 212 should check room join message right for "管理员"邀请"宁锐锋"加入了群聊
ok 213 should get inviteeList right
ok 214 should get inviter right
ok 215 should check room join message right for "管理员"通过扫描你分享的二维码加入群聊 
ok 216 should get inviteeList right
ok 217 should get inviter right
ok 218 should check room join message right for " 桔小秘"通过扫描"李佳芮"分享的二维码加入群聊
ok 219 should get inviteeList right
ok 220 should get inviter right
ok 221 should check room join message right for "管理员" joined group chat via the QR code you shared. 
ok 222 should get inviteeList right
ok 223 should get inviter right
ok 224 should check room join message right for "宁锐锋" joined the group chat via the QR Code shared by "管理员".
ok 225 should get inviteeList right
ok 226 should get inviter right
ok 227 should throws if message is not expected
# parseRoomLeave()
ok 228 should get leaver for leave message: You removed "Bruce LEE" from the group chat
ok 229 should get leaver name right
ok 230 should get leaver for leave message: 你将"李佳芮"移出了群聊
ok 231 should get leaver name right
ok 232 should get remover for leave message: You were removed from the group chat by "桔小秘"
ok 233 should get leaver name right
ok 234 should get remover for leave message: 你被"李佳芮"移出群聊
ok 235 should get leaver name right
ok 236 should throw if message is not expected
# parseRoomTopic()
ok 237 should check topic right for content: "李卓桓.PreAngel" changed the group name to "ding"
ok 238 should get right topic
ok 239 should get right changer
ok 240 should check topic right for content: "李佳芮"修改群名为“dong”
ok 241 should get right topic
ok 242 should get right changer
ok 243 should throw if message is not expected
# PuppetPuppeteer Module Exports
ok 244 should export PuppetPuppeteer
# login/logout events
ok 245 should be inited
ok 246 should be not logined
ok 247 should be logined
ok 248 bridge.getUserName should be called
ok 249 puppet.contactRawPayload should be called
ok 250 contactList stub should be called
ok 251 should call stubContacList 4 times
ok 252 should fire logout event
ok 253 should be logouted
# Contact smoke testing
ok 254 id/UserName right
ok 255 NickName set
ok 256 should get the right alias from Contact
# PuppetPuppeteerFriendship.receive smoke testing
ok 257 should has right request message
ok 258 should have a Contact instance
ok 259 should be receive type
# PuppetPuppeteerFriendship.confirm smoke testing
ok 260 should match confirm message
ok 261 should have a Contact instance
ok 262 should be confirm type
# constructor()
ok 263 id right
ok 264 from right
ok 265 toString()
# ready()
ok 266 id/MsgId right
ok 267 contact ready for FromUserName
ok 268 contact ready for FromNickName
ok 269 contact ready for ToUserName
ok 270 contact ready for ToNickName
# find()
ok 271 Message found
ok 272 Message.id is ok
# findAll()
ok 273 Message.findAll with limit 2
# self()
ok 274 should identify self message true where message from MOCK_CONTACT
ok 275 should identify self message false when from a different fromId
# mentioned()
ok 276 @_@ in message should not be treat as contact
ok 277 user@email.com in message should not be treat as contact
ok 278 @_@ wow! my email is ruiruibupt@gmail.com in message should not be treat as contact
ok 279 @小桔同学 is a contact
ok 280 should get 小桔同学 id right in rawPayload21
ok 281 @小桔同学 and @wuli舞哩客服 is a contact
ok 282 should get 小桔同学 id right in rawPayload22
ok 283 should get wuli舞哩客服 id right in rawPayload22
ok 284 @wuli舞哩客服 is a contact
ok 285 should get wuli舞哩客服 id right in rawPayload31
ok 286 @小桔同学 and @wuli舞哩客服 is a contact
ok 287 should get wuli舞哩客服 id right in rawPayload32
ok 288 should get 小桔同学 id right in rawPayload32
# Room smok testing
ok 289 should set id/UserName right
ok 290 should set topic/NickName
ok 291 should get roomAlias
ok 292 should return null if not set roomAlias
ok 293 should has contact1
ok 294 should has no this member
12:02:13 INFO Room owner()
ok 295 should get Contact instance for owner, or null
ok 296 should get the right id from @ad85207730aa94e006ddce28f74e6878, find member by default
ok 297 should get the right id from @72c4767ce32db488871fdd1c27173b81, find member by default
ok 298 should get the right id from @ecff4a7a86f23455dc42317269aa36ab, find member by default
ok 299 should get the right id from @ad85207730aa94e006ddce28f74e6878, find member by roomAlias
ok 300 toString()
# Room iterator for contact in it
ok 301 should get one of the room member: @ecff4a7a86f23455dc42317269aa36ab
ok 302 should get one of the room member: @eac4377ecfd59e4321262f892177169f
ok 303 should get one of the room member: @ad85207730aa94e006ddce28f74e6878
ok 304 should get one of the room member: @33cc239d22b20d56395bbbd0967b28b9
ok 305 should get one of the room member: @5e77381e1e3b5641ddcee44670b6e83a
ok 306 should get one of the room member: @56941ef97f3e9c70af88667fdd613b44
ok 307 should get one of the room member: @72c4767ce32db488871fdd1c27173b81
ok 308 should get one of the room member: @0b0e2eb9501ab2d84f9f800f6a0b4216
ok 309 should get one of the room member: @4bfa767be0cd3fb78409b9735d1dcc57
ok 310 should get one of the room member: @ad954bf2159a572b7743a5bc134739f4
ok 311 should iterate all the members of the room
# contactQueryFilterFunction()
# filter name by regex
ok 312 should filter the query to id list
# filter name by text
ok 313 should filter query to id list
# filter alias by regex
ok 314 should filter query to id list
# filter alias by text
ok 315 should filter query to id list
# throw if filter key unknown
ok 316 should throw
# throw if filter key are more than one
ok 317 should throw
# roomQueryFilterFunction()
# filter name by regex
ok 318 should filter the query to id list
# filter name by text
ok 319 should filter query to id list
# throw if filter key unknown
ok 320 should throw
# throw if filter key are more than one
ok 321 should throw
# Should not be able to instanciate directly
ok 322 should throw when `Contact.load()`
ok 323 should throw when `Contact.load()`
# Should not be able to instanciate through cloneClass without puppet
ok 324 should throw when `MyContact.load()` without puppet
ok 325 should throw when `MyContact.load()` without puppet
# should be able to instanciate through cloneClass with puppet
ok 326 should get contact instance from `MyContact.load()
ok 327 should not throw when `MyContact().load`
ok 328 should get contact instance from `MyContact.load()`
ok 329 should not throw when `MyContact.load()`
# should throw when instanciate the global class
ok 330 should throw when we instanciate a global class
# Export of the Framework
ok 331 should export Contact
ok 332 should export Friendship
ok 333 should export IoClient
ok 334 should export Message
ok 335 should export Puppet
ok 336 should export Room
ok 337 should export Wechaty
ok 338 should export log
ok 339 should return version as the same in package.json
ok 340 should export version in package.json
# Config setting
ok 341 should export Config
ok 342 should has DEFAULT_PUPPET
# event:start/stop
12:02:13 INFO Wechaty start() v#git[2b61db2] is starting...
12:02:13 INFO Wechaty initPuppet() using puppet: puppeteer
12:02:15 INFO Wechaty stop() v#git[2b61db2] is stoping ...
ok 343 should get event:start once
ok 344 should get event:stop once
# on(event, Function)
12:02:15 INFO Wechaty stop() v#git[2b61db2] is stoping ...
ok 345 should get event:error once
ok 346 should get error from message listener
# initPuppetAccessory()
ok 347 should not throw for the 1st time init
ok 348 should throw for the 2nd time init
# Wechaty restart for many times
12:02:15 INFO Wechaty start() v#git[2b61db2] is starting...
12:02:15 INFO Wechaty stop() v#git[2b61db2] is stoping ...
ok 349 start/stop-ed at #0
12:02:15 INFO Wechaty start() v#git[2b61db2] is starting...
12:02:15 INFO Wechaty stop() v#git[2b61db2] is stoping ...
ok 350 start/stop-ed at #1
12:02:15 INFO Wechaty start() v#git[2b61db2] is starting...
12:02:15 INFO Wechaty stop() v#git[2b61db2] is stoping ...
ok 351 start/stop-ed at #2
ok 352 Wechaty start/restart successed.
# Electron smoke testing
ok 353 test
# Node.js function params destructuring behaviour test
ok 354 should be equal to default args
ok 355 should be equal to default s args
ok 356 should be equal to default n args
# Puppeteer smoke testing
ok 357 Browser instnace
ok 358 should get version
ok 359 should create newPage for browser
ok 360 should open wx.qq.com
ok 361 should get 42
# evaluate() a function that returns a Promise
ok 362 should get resolved value of promise inside browser
# evaluate() a file and get the returns value
ok 363 should inject file inside browser and return the value
ok 364 should no wechaty by default
ok 365 should has window by default
# page.on(console)
ok 366 should be called once
ok 367 should get log type
ok 368 should get console.log 1st/2nd arg
# page.exposeFunction()
ok 369 should be called once inside browser
ok 370 should be called with 42
# other demos
ok 371 should get version
ok 372 should get cookies
ok 373 should get cookies with name
ok 374 should evaluated function for () => 8 * 7 = 56
ok 375 should evaluated 1 + 2 = 3
ok 376 should get the url right
# en
ok 377 should get en blocked message

1..377
# tests 377
# pass  377

# ok

Safe Test: successed at round #0!

> wechaty@0.17.11 test:shell /home/zixia/chatie/wechaty
> shellcheck bin/*.sh


> wechaty@0.17.11 sloc /home/zixia/chatie/wechaty
> sloc bin examples scripts src tests --details --format cli-table --keys total,source,comment && sloc bin examples scripts src tests

┌──────────────────────────────────────────────────────────────────────────────────────────┬──────────┬────────┬─────────┐
│ Path                                                                                     │ Physical │ Source │ Comment │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ bin/doctor.ts                                                                            │ 54       │ 27     │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ bin/io-client.ts                                                                         │ 76       │ 43     │ 20      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ bin/version.ts                                                                           │ 23       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/api-ai-bot.ts                                                                   │ 217      │ 131    │ 62      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/busy-bot.ts                                                                     │ 172      │ 101    │ 35      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/contact-bot.ts                                                                  │ 136      │ 72     │ 40      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/ding-dong-bot.ts                                                                │ 211      │ 130    │ 52      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/friend-bot.ts                                                                   │ 128      │ 67     │ 43      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/media-file-bot.ts                                                               │ 55       │ 24     │ 25      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/roger-bot.ts                                                                    │ 45       │ 17     │ 27      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/room-bot.ts                                                                     │ 434      │ 249    │ 124     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/self-testing-bot.ts                                                             │ 301      │ 158    │ 102     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/speech-to-text-bot.ts                                                           │ 184      │ 93     │ 68      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/telegram-roger-bot.js                                                           │ 55       │ 19     │ 33      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/the-worlds-shortest-chatbot-code-in-6-lines.js                                  │ 25       │ 6      │ 20      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/tuling123-bot.ts                                                                │ 97       │ 42     │ 44      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/blessed-twins-bot/index.ts                                                      │ 344      │ 230    │ 65      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/index.ts                                                               │ 65       │ 31     │ 24      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/on-friend.ts                                                           │ 78       │ 37     │ 34      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/on-message.ts                                                          │ 82       │ 38     │ 33      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/on-room-join.ts                                                        │ 80       │ 36     │ 33      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/index.js                                                         │ 42       │ 7      │ 33      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/config.js                                                               │ 21       │ 12     │ 7       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/index.js                                                                │ 69       │ 23     │ 36      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/index.js                                                         │ 120      │ 69     │ 37      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-friend.js                                           │ 26       │ 6      │ 19      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-login.js                                            │ 21       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-message.js                                          │ 21       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-scan.js                                             │ 26       │ 7      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-friend.js                                                  │ 40       │ 9      │ 26      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-login.js                                                   │ 21       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-message.js                                                 │ 86       │ 47     │ 28      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-scan.js                                                    │ 26       │ 7      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/friend.js                                               │ 26       │ 7      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/login.js                                                │ 21       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/message.js                                              │ 40       │ 17     │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/scan.js                                                 │ 23       │ 5      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/development-release.ts                                                           │ 18       │ 9      │ 8       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/package-publish-config-tag-next.ts                                               │ 19       │ 12     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/retry-unit-tests.ts                                                              │ 54       │ 42     │ 10      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/sort-contributiveness.ts                                                         │ 114      │ 85     │ 12      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/update-license.ts                                                                │ 155      │ 117    │ 28      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/accessory.spec.ts                                                                    │ 84       │ 39     │ 25      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/accessory.ts                                                                         │ 172      │ 83     │ 60      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/config.spec.ts                                                                       │ 86       │ 33     │ 43      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/config.ts                                                                            │ 235      │ 127    │ 77      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/deprecated.ts                                                                        │ 6        │ 6      │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/doctor.ts                                                                            │ 91       │ 45     │ 37      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/index.ts                                                                             │ 46       │ 33     │ 5       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/io-client.ts                                                                         │ 224      │ 135    │ 45      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/io.spec.ts                                                                           │ 25       │ 20     │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/io.ts                                                                                │ 521      │ 340    │ 91      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/misc.spec.ts                                                                         │ 252      │ 198    │ 23      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/misc.ts                                                                              │ 313      │ 177    │ 118     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-config.ts                                                                     │ 28       │ 12     │ 13      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/typings.d.ts                                                                         │ 13       │ 9      │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/wechaty.spec.ts                                                                      │ 184      │ 93     │ 55      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/wechaty.ts                                                                           │ 976      │ 553    │ 305     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/index.ts                                                                      │ 10       │ 8      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/puppet.spec.ts                                                                │ 283      │ 210    │ 25      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/puppet.ts                                                                     │ 906      │ 551    │ 196     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-mock/index.ts                                                                 │ 25       │ 5      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-mock/puppet-mock.spec.ts                                                      │ 27       │ 21     │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-mock/puppet-mock.ts                                                           │ 433      │ 306    │ 50      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/config.ts                                                             │ 28       │ 20     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/index.ts                                                              │ 25       │ 5      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/padchat-manager.spec.ts                                               │ 129      │ 108    │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/padchat-manager.ts                                                    │ 979      │ 660    │ 140     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/padchat-rpc.ts                                                        │ 1499     │ 959    │ 352     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/padchat-rpc.type.ts                                                   │ 190      │ 148    │ 93      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/padchat-schemas.ts                                                    │ 445      │ 145    │ 320     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/puppet-padchat.spec.ts                                                │ 25       │ 16     │ 3       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/puppet-padchat.ts                                                     │ 1247     │ 850    │ 144     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/index.ts                                                             │ 25       │ 5      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/puppet-wechat4u.ts                                                   │ 883      │ 529    │ 201     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/typings.d.ts                                                         │ 20       │ 15     │ 3       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/web-schemas.ts                                                       │ 294      │ 133    │ 161     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/contact.accessory.spec.ts                                                       │ 76       │ 56     │ 5       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/contact.ts                                                                      │ 661      │ 305    │ 287     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/favorite.ts                                                                     │ 17       │ 10     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/friendship.ts                                                                   │ 248      │ 128    │ 77      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/index.ts                                                                        │ 7        │ 7      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/message.ts                                                                      │ 654      │ 341    │ 235     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/moment.ts                                                                       │ 19       │ 12     │ 4       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/money.ts                                                                        │ 7        │ 5      │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/user/room.ts                                                                         │ 822      │ 377    │ 350     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/bridge.spec.ts                                                      │ 212      │ 155    │ 26      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/bridge.ts                                                           │ 1018     │ 754    │ 122     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/event.spec.ts                                                       │ 49       │ 21     │ 22      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/event.ts                                                            │ 247      │ 133    │ 73      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/firer.spec.ts                                                       │ 209      │ 162    │ 24      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/firer.ts                                                            │ 497      │ 281    │ 132     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/index.spec.ts                                                       │ 30       │ 8      │ 20      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/index.ts                                                            │ 25       │ 5      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppet-puppeteer.spec.ts                                            │ 124      │ 73     │ 33      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppet-puppeteer.ts                                                 │ 1568     │ 1066   │ 292     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-contact.spec.ts                                           │ 88       │ 43     │ 27      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-friendship.spec.ts                                        │ 145      │ 95     │ 23      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-message.spec.ts                                           │ 463      │ 334    │ 32      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-room.spec.ts                                              │ 227      │ 133    │ 49      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/web-schemas.ts                                                      │ 294      │ 133    │ 161     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/wechaty-bro.js                                                      │ 882      │ 605    │ 171     │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/schemas/contact.ts                                                            │ 36       │ 31     │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/schemas/friendship.ts                                                         │ 31       │ 25     │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/schemas/message.ts                                                            │ 38       │ 33     │ 5       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/schemas/puppet.ts                                                             │ 74       │ 53     │ 14      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/schemas/room.ts                                                               │ 32       │ 21     │ 8       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/compatible-wei-bug.spec.ts                      │ 16       │ 13     │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/compatible-wei-bug.ts                           │ 20       │ 6      │ 13      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/contact-raw-payload-parser.spec.ts              │ 103      │ 88     │ 8       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/contact-raw-payload-parser.ts                   │ 69       │ 39     │ 24      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/file-box-to-qrcode.spec.ts                      │ 27       │ 19     │ 3       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/file-box-to-qrcode.ts                           │ 37       │ 29     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/friendship-event-message-parser.confirm.spec.ts │ 80       │ 66     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/friendship-event-message-parser.receive.spec.ts │ 34       │ 25     │ 3       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/friendship-event-message-parser.spec.ts         │ 78       │ 73     │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/friendship-event-message-parser.ts              │ 123      │ 83     │ 16      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/friendship-event-message-parser.verify.spec.ts  │ 56       │ 44     │ 4       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/friendship-raw-payload-parser.spec.ts           │ 41       │ 26     │ 4       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/friendship-raw-payload-parser.ts                │ 97       │ 72     │ 9       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/index.ts                                        │ 28       │ 14     │ 13      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/is-type.spec.ts                                 │ 65       │ 49     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/is-type.ts                                      │ 49       │ 39     │ 5       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/message-file-name.ts                            │ 9        │ 8      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/message-raw-payload-parser.spec.ts              │ 304      │ 225    │ 51      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/message-raw-payload-parser.ts                   │ 191      │ 104    │ 50      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/message-type.ts                                 │ 64       │ 45     │ 5       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/padchat-decode.spec.ts                          │ 59       │ 49     │ 4       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/padchat-decode.ts                               │ 22       │ 14     │ 5       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-join-message-parser.en.spec.ts       │ 328      │ 292    │ 7       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-join-message-parser.spec.ts          │ 65       │ 52     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-join-message-parser.ts               │ 316      │ 214    │ 56      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-join-message-parser.zh.spec.ts       │ 309      │ 272    │ 8       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-leave-message-parser.en.spec.ts      │ 81       │ 65     │ 3       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-leave-message-parser.spec.ts         │ 47       │ 35     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-leave-message-parser.ts              │ 93       │ 64     │ 14      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-leave-message-parser.zh.spec.ts      │ 82       │ 65     │ 4       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-topic-message-parser.en.spec.ts      │ 67       │ 56     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-topic-message-parser.spec.ts         │ 47       │ 35     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-topic-message-parser.ts              │ 70       │ 50     │ 5       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-event-topic-message-parser.zh.spec.ts      │ 71       │ 56     │ 4       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-raw-payload-parser.spec.ts                 │ 4        │ 0      │ 3       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/room-raw-payload-parser.ts                      │ 19       │ 16     │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/split-name.spec.ts                              │ 25       │ 18     │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/split-name.ts                                   │ 9        │ 6      │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-padchat/pure-function-helpers/t.ts                                            │ 33       │ 25     │ 3       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/pure-function-helpers/index.ts                                       │ 4        │ 4      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/pure-function-helpers/is-type.ts                                     │ 7        │ 6      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/pure-function-helpers/message-file-name.ts                           │ 73       │ 58     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/pure-function-helpers/message-payload-parser.ts                      │ 148      │ 91     │ 26      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-wechat4u/pure-function-helpers/message-type.ts                                │ 54       │ 30     │ 16      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/pure-function-helpers/index.ts                                      │ 5        │ 5      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/pure-function-helpers/is-type.ts                                    │ 7        │ 6      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/pure-function-helpers/message-extname.ts                            │ 57       │ 44     │ 2       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/pure-function-helpers/message-filename.ts                           │ 25       │ 20     │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/pure-function-helpers/message-raw-payload-parser.ts                 │ 86       │ 69     │ 9       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/pure-function-helpers/web-message-type.ts                           │ 51       │ 27     │ 16      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/electron.spec.ts                                                                   │ 32       │ 8      │ 21      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/node.spec.ts                                                                       │ 53       │ 23     │ 22      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/puppeteer.spec.ts                                                                  │ 251      │ 172    │ 35      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/inject-file.js                                                            │ 7        │ 7      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/smoke-testing.ts                                                          │ 27       │ 23     │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/es6-import.js                                                      │ 3        │ 2      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/import-require.ts                                                  │ 22       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/js-bot.js                                                          │ 4        │ 3      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/syntax-error.js                                                    │ 1        │ 1      │ 0       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/ts-bot.ts                                                          │ 22       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/type-error.ts                                                      │ 21       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-import-error.ts                             │ 22       │ 3      │ 19      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-import.ts                                   │ 22       │ 3      │ 18      │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-require-error.js                            │ 4        │ 3      │ 1       │
├──────────────────────────────────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-require.js                                  │ 4        │ 3      │ 0       │
└──────────────────────────────────────────────────────────────────────────────────────────┴──────────┴────────┴─────────┘

---------- Result ------------

            Physical :  27630
              Source :  17120
             Comment :  6772
 Single-line comment :  2313
       Block comment :  4459
               Mixed :  417
               Empty :  4173
               To Do :  77

Number of files read :  172

------------------------------
```
