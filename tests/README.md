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

> wechaty@0.15.74 test /home/zixia/chatie/wechaty
> npm run clean && npm run lint && npm run test:unit:retry && npm run test:shell && npm run sloc


> wechaty@0.15.74 clean /home/zixia/chatie/wechaty
> shx rm -fr dist/*


> wechaty@0.15.74 lint /home/zixia/chatie/wechaty
> npm run check-node-version && npm run lint:ts && npm run lint:es && npm run lint:sh


> wechaty@0.15.74 check-node-version /home/zixia/chatie/wechaty
> check-node-version --node ">= 8.5"


> wechaty@0.15.74 lint:ts /home/zixia/chatie/wechaty
> tslint --project tsconfig.json && tsc --noEmit


> wechaty@0.15.74 lint:es /home/zixia/chatie/wechaty
> eslint "{bin,examples,scripts,src,tests}/**/*.js" --ignore-pattern="tests/fixtures/**"


> wechaty@0.15.74 lint:sh /home/zixia/chatie/wechaty
> bash -n bin/*.sh


> wechaty@0.15.74 test:unit:retry /home/zixia/chatie/wechaty
> ts-node scripts/retry-unit-tests

Safe Test: starting...
Safe Test: running for round #0

> wechaty@0.15.74 test:unit /home/zixia/chatie/wechaty
> blue-tape -r ts-node/register "src/**/*.spec.ts" "src/*.spec.ts" "tests/*.spec.ts" "tests/**/*.spec.ts"

TAP version 13
# important variables
ok 1 should exist `puppet` in Config
ok 2 should exist `apihost` in Config
ok 3 should exist `profile` in Config
ok 4 should exist `token` in Config
ok 5 should export DEFAULT_PUPPET
ok 6 should export DEFAULT_PROFILE
ok 7 should export DEFAULT_PROTOCOL
ok 8 should export DEFAULT_APIHOST
# validApiHost()
ok 9 should not throw
ok 10 should not throw
ok 11 should throw
ok 12 should throw
# Should not be able to instanciate directly
ok 13 should throw when `Contact.load()`
ok 14 should throw when `Contact.load()`
# Should not be able to instanciate through cloneClass without puppet
ok 15 should throw when `MyContact.load()` without puppet
ok 16 should throw when `MyContact.load()` without puppet
# should be able to instanciate through cloneClass with puppet
ok 17 should get contact instance from `MyContact.load()
ok 18 should not throw when `MyContact().load`
ok 19 should get contact instance from `MyContact.load()`
ok 20 should not throw when `MyContact.load()`
# should throw when instanciate the global class
ok 21 should throw when we instanciate a global class
# stripHtml()
ok 22 should strip html as expected
# unescapeHtml()
ok 23 should unescape html as expected
# plainText()
ok 24 should convert plain text as expected
# digestEmoji()
ok 25 should digest emoji string 0 as expected
ok 26 should digest emoji string 1 as expected
ok 27 should digest emoji string 2 as expected
ok 28 should digest emoji string 3 as expected
# unifyEmoji()
ok 29 should convert the emoji xml to the expected unified xml
ok 30 should convert the emoji xml to the expected unified xml
# stripEmoji()
ok 31 should strip to the expected str
ok 32 should strip to the expected str
ok 33 should return empty string for `undefined`
# downloadStream() for media
ok 34 should has cookies in req
ok 35 should has a cookie named life value 42
ok 36 should success download dong from downloadStream()
# getPort() for an available socket port
ok 37 should not be same port even it is available(to provent conflict between concurrency tests in AVA)
ok 38 should has no exception after loop test
# promiseRetry()
ok 39 should got EXPECTED_REJECT when wait not enough
ok 40 should got EXPECTED_RESOLVE when wait enough
# retry()
ok 41 should got EXPECTED_RESOLVE when wait enough
# PuppetAccessory smoke testing
ok 42 should throw if read static puppet before initialize
ok 43 should throw if read instance puppet before initialization
ok 44 should get EXPECTED_PUPPET1 from static puppet after set static puppet
ok 45 should get EXPECTED_PUPPET1 from instance puppet after set static puppet
ok 46 should get EXPECTED_PUPPET1 from static puppet after set instance puppet to EXPECTED_PUPPET2
ok 47 should get EXPECTED_PUPPET2 from instance puppet after set instance puppet to EXPECTED_PUPPET2
# Two clone-ed classes
ok 48 should get the puppet as 1 from 1st cloned class
ok 49 should get the puppet as 2 from 2nd cloned class
# PuppetPuppeteerBridge
ok 50 Bridge instnace
# preHtmlToXml()
ok 51 should parse html to xml
# testBlockedMessage()
# not blocked
ok 52 should return false when no block message
# html
ok 53 should get zh blocked message
# zh
ok 54 should get zh blocked message
# clickSwitchAccount()
# switch account needed
ok 55 should click the switch account button
# switch account not needed
ok 56 should no button found
# WechatyBro.ding()
ok 57 should instanciated a bridge
ok 58 should init Bridge
ok 59 should got dong after execute WechatyBro.ding()
ok 60 should got a boolean after call proxyWechaty(loginState)
ok 61 b.quit()
# Puppet Puppeteer Event smoke testing
ok 62 should be inited
ok 63 should be quited
# parseFriendConfirm()
ok 64 should be truthy for confirm msg: You have added 李卓桓 as your WeChat contact. Start chatting!
ok 65 should be truthy for confirm msg: 你已添加了李卓桓，现在可以开始聊天了。
ok 66 should be truthy for confirm msg: johnbassserver@gmail.com just added you to his/her contacts list. Send a message to him/her now!
ok 67 should be truthy for confirm msg: johnbassserver@gmail.com刚刚把你添加到通讯录，现在可以开始聊天了。
ok 68 should be falsy for other msg
# parseRoomJoin()
ok 69 should check room join message right for You invited 管理员 to the group chat.
ok 70 should get inviteeList right
ok 71 should get inviter right
ok 72 should check room join message right for You invited 李卓桓.PreAngel、Bruce LEE to the group chat.
ok 73 should get inviteeList right
ok 74 should get inviter right
ok 75 should check room join message right for 管理员 invited 小桔建群助手 to the group chat
ok 76 should get inviteeList right
ok 77 should get inviter right
ok 78 should check room join message right for 管理员 invited 庆次、小桔妹 to the group chat
ok 79 should get inviteeList right
ok 80 should get inviter right
ok 81 should check room join message right for 你邀请"管理员"加入了群聊
ok 82 should get inviteeList right
ok 83 should get inviter right
ok 84 should check room join message right for "管理员"邀请"宁锐锋"加入了群聊
ok 85 should get inviteeList right
ok 86 should get inviter right
ok 87 should check room join message right for "管理员"通过扫描你分享的二维码加入群聊
ok 88 should get inviteeList right
ok 89 should get inviter right
ok 90 should check room join message right for " 桔小秘"通过扫描"李佳芮"分享的二维码加入群聊
ok 91 should get inviteeList right
ok 92 should get inviter right
ok 93 should check room join message right for "管理员" joined group chat via the QR code you shared.
ok 94 should get inviteeList right
ok 95 should get inviter right
ok 96 should check room join message right for "宁锐锋" joined the group chat via the QR Code shared by "管理员".
ok 97 should get inviteeList right
ok 98 should get inviter right
ok 99 should throws if message is not expected
# parseRoomLeave()
ok 100 should get leaver for leave message: You removed "Bruce LEE" from the group chat
ok 101 should get leaver name right
ok 102 should get leaver for leave message: 你将"李佳芮"移出了群聊
ok 103 should get leaver name right
ok 104 should get remover for leave message: You were removed from the group chat by "桔小秘"
ok 105 should get leaver name right
ok 106 should get remover for leave message: 你被"李佳芮"移出群聊
ok 107 should get leaver name right
ok 108 should throw if message is not expected
# parseRoomTopic()
ok 109 should check topic right for content: "李卓桓.PreAngel" changed the group name to "ding"
ok 110 should get right topic
ok 111 should get right changer
ok 112 should check topic right for content: "李佳芮"修改群名为“dong”
ok 113 should get right topic
ok 114 should get right changer
ok 115 should throw if message is not expected
# PuppetPuppeteer Module Exports
ok 116 should export PuppetPuppeteer
# Puppet smoke testing
ok 117 should be OFF state after instanciate
ok 118 should be ON state after set
ok 119 should be pending state after set
# login/logout events
ok 120 should instantiated a PuppetPuppeteer
ok 121 should be inited
ok 122 should be not logined
ok 123 should fired login event
ok 124 should be logined
ok 125 bridge.getUserName should be called
ok 126 puppet.contactRawPayload should be called
ok 127 contactFind stub should be called
ok 128 should call stubContactFind 4 times
ok 129 should fire logout event
ok 130 should be logouted
# Contact smoke testing
ok 131 id/UserName right
ok 132 NickName set
ok 133 should get the right alias from Contact
# PuppetPuppeteerFriendRequest.receive smoke testing
ok 134 should has right request message
ok 135 should have a Contact instance
ok 136 should be receive type
# PuppetPuppeteerFriendRequest.confirm smoke testing
ok 137 should match confirm message
ok 138 should have a Contact instance
ok 139 should be confirm type
# constructor()
ok 140 id right
ok 141 from right
ok 142 toString()
# ready()
ok 143 id/MsgId right
ok 144 contact ready for FromUserName
ok 145 contact ready for FromNickName
ok 146 contact ready for ToUserName
ok 147 contact ready for ToNickName
# find()
ok 148 Message found
ok 149 Message.id is ok
# findAll()
ok 150 Message.findAll with limit 2
# self()
ok 151 should identify self message true where message from userId
ok 152 should identify self message false when from a different fromId
# mentioned()
ok 153 @_@ in message should not be treat as contact
ok 154 user@email.com in message should not be treat as contact
ok 155 @_@ wow! my email is ruiruibupt@gmail.com in message should not be treat as contact
ok 156 @小桔同学 is a contact
ok 157 should get 小桔同学 id right in rawPayload21
ok 158 @小桔同学 and @wuli舞哩客服 is a contact
ok 159 should get 小桔同学 id right in rawPayload22
ok 160 should get wuli舞哩客服 id right in rawPayload22
ok 161 @wuli舞哩客服 is a contact
ok 162 should get wuli舞哩客服 id right in rawPayload31
ok 163 @小桔同学 and @wuli舞哩客服 is a contact
ok 164 should get wuli舞哩客服 id right in rawPayload32
ok 165 should get 小桔同学 id right in rawPayload32
# Room smoking test
ok 166 should set id/UserName right
ok 167 should set topic/NickName
ok 168 should get roomAlias
ok 169 should return null if not set roomAlias
ok 170 should has contact1
ok 171 should has no this member
12:43:38 INFO Room owner()
ok 172 should get Contact instance for owner, or null
ok 173 should get the right id from @ad85207730aa94e006ddce28f74e6878, find member by default
ok 174 should get the right id from @72c4767ce32db488871fdd1c27173b81, find member by default
ok 175 should get the right id from @ecff4a7a86f23455dc42317269aa36ab, find member by default
ok 176 should get the right id from @ad85207730aa94e006ddce28f74e6878, find member by roomAlias
ok 177 toString()
# Room static method
ok 178 should return null if cannot find the room
ok 179 should return empty array before login
# Room iterator for contact in it
1
2
ok 180 to be write # SKIP
# Export of the Framework
ok 181 should export Contact
ok 182 should export FriendREquest
ok 183 should export IoClient
ok 184 should export Message
ok 185 should export Puppet
ok 186 should export Room
ok 187 should export Wechaty
ok 188 should export log
ok 189 should return version as the same in package.json
ok 190 should export version in package.json
# Config setting
ok 191 should export Config
ok 192 should has DEFAULT_PUPPET
# event:start/stop
12:43:38 INFO Wechaty v#git[a797626] starting...
12:43:38 INFO Wechaty initPuppet() using default puppet: puppeteer
ok 193 should get event:start once
ok 194 should get event:stop once
# on(event, Function)
ok 195 should get event:error once
ok 196 should get error from message listener
# Electron smoke testing
ok 197 test
# Node.js function params destructuring behaviour test
ok 198 should be equal to default args
ok 199 should be equal to default s args
ok 200 should be equal to default n args
# Puppeteer smoke testing
ok 201 Browser instnace
ok 202 should get version
ok 203 should open wx.qq.com
ok 204 should get 42
# evaluate() a function that returns a Promise
ok 205 should get resolved value of promise inside browser
# evaluate() a file and get the returns value
ok 206 should inject file inside browser and return the value
ok 207 should no wechaty by default
ok 208 should has window by default
# page.on(console)
ok 209 should be called once
ok 210 should get log type
ok 211 should get console.log 1st/2nd arg
# page.exposeFunction()
ok 212 should be called once inside browser
ok 213 should be called with 42
# other demos
ok 214 should get version
ok 215 should get cookies
ok 216 should get cookies with name
ok 217 should evaluated function for () => 8 * 7 = 56
ok 218 should evaluated 1 + 2 = 3
ok 219 should get the url right
# en
ok 220 should get en blocked message

1..220
# tests 220
# pass  220

# ok

Safe Test: successed at round #0!

> wechaty@0.15.74 test:shell /home/zixia/chatie/wechaty
> shellcheck bin/*.sh


> wechaty@0.15.74 sloc /home/zixia/chatie/wechaty
> sloc bin examples scripts src tests --details --format cli-table --keys total,source,comment && sloc bin examples scripts src tests

┌───────────────────────────────────────────────────────────────┬──────────┬────────┬─────────┐
│ Path                                                          │ Physical │ Source │ Comment │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ bin/doctor.ts                                                 │ 54       │ 27     │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ bin/io-client.ts                                              │ 74       │ 41     │ 20      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ bin/version.ts                                                │ 23       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/api-ai-bot.ts                                        │ 217      │ 133    │ 63      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/contact-bot.ts                                       │ 139      │ 75     │ 41      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/ding-dong-bot.ts                                     │ 209      │ 129    │ 53      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/friend-bot.ts                                        │ 129      │ 68     │ 44      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/media-file-bot.ts                                    │ 57       │ 26     │ 26      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/roger-bot.ts                                         │ 48       │ 20     │ 28      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/room-bot.ts                                          │ 399      │ 222    │ 121     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/speech-to-text-bot.ts                                │ 188      │ 97     │ 68      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/telegram-roger-bot.js                                │ 55       │ 19     │ 33      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/the-worlds-shortest-chatbot-code-in-6-lines.js       │ 25       │ 6      │ 20      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/tuling123-bot.ts                                     │ 100      │ 45     │ 45      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/index.js                              │ 42       │ 7      │ 33      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/blessed-twins-bot/index.ts                           │ 348      │ 233    │ 67      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/index.ts                                    │ 68       │ 34     │ 25      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/on-friend.ts                                │ 78       │ 37     │ 34      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/on-message.ts                               │ 81       │ 37     │ 33      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/gist-bot/on-room-join.ts                             │ 80       │ 36     │ 33      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/index.js                              │ 120      │ 69     │ 37      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/config.js                                    │ 21       │ 12     │ 7       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/index.js                                     │ 69       │ 23     │ 36      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-friend.js                │ 26       │ 6      │ 19      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-login.js                 │ 21       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-message.js               │ 21       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-import-bot/listeners/on-scan.js                  │ 26       │ 7      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-friend.js                       │ 40       │ 9      │ 26      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-login.js                        │ 21       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-message.js                      │ 86       │ 47     │ 28      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/monster/listeners/on-scan.js                         │ 26       │ 7      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/friend.js                    │ 26       │ 7      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/login.js                     │ 21       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/message.js                   │ 40       │ 17     │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ examples/hot-reload-bot/listener/scan.js                      │ 23       │ 5      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/development-release.ts                                │ 13       │ 9      │ 3       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/package-publish-config-tag-next.ts                    │ 14       │ 8      │ 1       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/retry-unit-tests.ts                                   │ 54       │ 42     │ 10      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/sort-contributiveness.ts                              │ 110      │ 81     │ 12      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ scripts/update-license.ts                                     │ 149      │ 111    │ 28      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/config.spec.ts                                            │ 86       │ 33     │ 43      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/config.ts                                                 │ 202      │ 104    │ 72      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/contact.spec.ts                                           │ 65       │ 46     │ 5       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/contact.ts                                                │ 624      │ 265    │ 300     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/deprecated.ts                                             │ 6        │ 6      │ 1       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/doctor.ts                                                 │ 91       │ 45     │ 37      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/friend-request.ts                                         │ 243      │ 146    │ 56      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/index.ts                                                  │ 56       │ 45     │ 4       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/io-client.ts                                              │ 252      │ 157    │ 48      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/io.ts                                                     │ 469      │ 300    │ 89      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/message.ts                                                │ 896      │ 298    │ 498     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/misc.spec.ts                                              │ 252      │ 198    │ 23      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/misc.ts                                                   │ 299      │ 172    │ 110     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/profile.ts                                                │ 132      │ 95     │ 19      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-accessory.spec.ts                                  │ 70       │ 32     │ 22      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-accessory.ts                                       │ 103      │ 61     │ 20      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-config.ts                                          │ 24       │ 7      │ 14      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/room.ts                                                   │ 808      │ 363    │ 360     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/typings.d.ts                                              │ 10       │ 7      │ 2       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/wechaty.spec.ts                                           │ 146      │ 63     │ 54      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/wechaty.ts                                                │ 733      │ 365    │ 291     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/index.ts                                           │ 7        │ 7      │ 0       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet/puppet.ts                                          │ 419      │ 255    │ 100     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-hostie/index.ts                                    │ 25       │ 5      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-hostie/puppet-hostie.ts                            │ 293      │ 202    │ 42      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-mock/index.ts                                      │ 25       │ 5      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-mock/puppet-mock.ts                                │ 328      │ 231    │ 42      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/bridge.spec.ts                           │ 248      │ 153    │ 58      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/bridge.ts                                │ 968      │ 726    │ 108     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/event.spec.ts                            │ 47       │ 21     │ 21      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/event.ts                                 │ 228      │ 142    │ 46      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/firer.spec.ts                            │ 200      │ 157    │ 24      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/firer.ts                                 │ 502      │ 340    │ 86      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/index.spec.ts                            │ 30       │ 8      │ 20      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/index.ts                                 │ 25       │ 5      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppet-puppeteer.spec.ts                 │ 118      │ 75     │ 26      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppet-puppeteer.ts                      │ 1611     │ 1169   │ 244     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-contact.spec.ts                │ 83       │ 41     │ 25      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-friend-request.spec.ts         │ 125      │ 76     │ 27      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-message.spec.ts                │ 405      │ 289    │ 41      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/puppeteer-room.spec.ts                   │ 246      │ 124    │ 76      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/web-schemas.ts                           │ 293      │ 132    │ 161     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ src/puppet-puppeteer/wechaty-bro.js                           │ 889      │ 619    │ 163     │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/electron.spec.ts                                        │ 32       │ 8      │ 21      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/node.spec.ts                                            │ 53       │ 23     │ 22      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/puppeteer.spec.ts                                       │ 249      │ 170    │ 35      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/inject-file.js                                 │ 7        │ 7      │ 0       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/smoke-testing.ts                               │ 25       │ 21     │ 1       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/es6-import.js                           │ 3        │ 2      │ 0       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/import-require.ts                       │ 22       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/js-bot.js                               │ 4        │ 3      │ 0       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/syntax-error.js                         │ 1        │ 1      │ 0       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/ts-bot.ts                               │ 22       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/type-error.ts                           │ 21       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-import-error.ts  │ 22       │ 3      │ 19      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-import.ts        │ 22       │ 3      │ 18      │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-require-error.js │ 4        │ 3      │ 1       │
├───────────────────────────────────────────────────────────────┼──────────┼────────┼─────────┤
│ tests/fixtures/docker/with-package-json/with-require.js       │ 4        │ 3      │ 0       │
└───────────────────────────────────────────────────────────────┴──────────┴────────┴─────────┘

---------- Result ------------

            Physical :  16514
              Source :  9613
             Comment :  4795
 Single-line comment :  1446
       Block comment :  3350
               Mixed :  209
               Empty :  2333
               To Do :  16

Number of files read :  98

------------------------------

```
