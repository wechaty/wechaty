# Change Log

## [Unreleased](https://github.com/chatie/wechaty/tree/HEAD)

[Full Changelog](https://github.com/chatie/wechaty/compare/v0.8.2...HEAD)

**Implemented enhancements:**

- Cannot send pdf file using MediaMessage [\#710](https://github.com/Chatie/wechaty/issues/710)
- Use Sentry.io to report exceptions [\#580](https://github.com/Chatie/wechaty/issues/580)
- use babel-node to run javascript\(.js\) file inside docker [\#507](https://github.com/Chatie/wechaty/issues/507)
- License Change: from ISC to Apache-2.0 [\#474](https://github.com/Chatie/wechaty/issues/474)
- requesting a new QR code cost more than 2 minutes [\#434](https://github.com/Chatie/wechaty/issues/434)
- \[Feature request\] @mention support? [\#153](https://github.com/Chatie/wechaty/issues/153)
- \[Docker\] add a `onbuild` image to Wechaty [\#147](https://github.com/Chatie/wechaty/issues/147)

**Fixed bugs:**

- Cannot send pdf file using MediaMessage [\#710](https://github.com/Chatie/wechaty/issues/710)
- \[test\] Unit Test for `mentioned` feature does not run at all [\#623](https://github.com/Chatie/wechaty/issues/623)
- error TS2345: Argument of type 'string | MemberQueryFilter' is not assignable to parameter of type 'MemberQueryFilter' [\#622](https://github.com/Chatie/wechaty/issues/622)
- \[Doc\] Add `say\(new MediaMessage\('/tmp/mediafile.gif'\)\)` documentation [\#587](https://github.com/Chatie/wechaty/issues/587)
- Node Typing BUG: `process.env: any` [\#582](https://github.com/Chatie/wechaty/issues/582)
- wechaty v0.8.54 does not install all required component  [\#522](https://github.com/Chatie/wechaty/issues/522)
- message.mentioned\(\) does not work as expected [\#512](https://github.com/Chatie/wechaty/issues/512)
- ts-node commond not found  after update docker image [\#492](https://github.com/Chatie/wechaty/issues/492)
- may be not need .vscode folder, need .editorconfig [\#489](https://github.com/Chatie/wechaty/issues/489)
- MediaMessage\#filename\(\) should not use timestamp as part of the filename [\#465](https://github.com/Chatie/wechaty/issues/465)
- \[ci\]   × src » message » ready\(\) contact ready for ToNickName [\#445](https://github.com/Chatie/wechaty/issues/445)
- Build Docker image from zixia/wechaty:onbuild,/bot/node\_modules does not exist. [\#436](https://github.com/Chatie/wechaty/issues/436)
- requesting a new QR code cost more than 2 minutes [\#434](https://github.com/Chatie/wechaty/issues/434)
- Concat.avatar\(\)  faild ,when hostname changed from https://wx.qq.com to https://wx2.qq.com [\#418](https://github.com/Chatie/wechaty/issues/418)
- \[test\] Unit Tests under Linux by TravisCI keep failing [\#384](https://github.com/Chatie/wechaty/issues/384)
- Can't get wechaty up and running using phantomjs [\#60](https://github.com/Chatie/wechaty/issues/60)

**Closed issues:**

- if wechaty cannot get inviteeList when emit `room-join` , suggest it emit room-fire and get warning info. [\#671](https://github.com/Chatie/wechaty/issues/671)
- Room.find\(\) 发送消息提示 say is not a function [\#664](https://github.com/Chatie/wechaty/issues/664)
- Modify Function `Room.create` return type, from `Promise\<Room\>` to `Promise\<Room|null\>`  [\#616](https://github.com/Chatie/wechaty/issues/616)
- Bot log out frequently and got some strange error between it logout and relogin automatically [\#612](https://github.com/Chatie/wechaty/issues/612)
- init 后会打开扫码的网页？ [\#601](https://github.com/Chatie/wechaty/issues/601)
- Error: ENOENT: no such file or directory, stat '/wechaty/dist/.git' [\#581](https://github.com/Chatie/wechaty/issues/581)
- 在 Windows Server 上初始化的时候，chromedriver 报错。 [\#574](https://github.com/Chatie/wechaty/issues/574)
- whatever [\#543](https://github.com/Chatie/wechaty/issues/543)
- got \[aq.qq.com\] domain [\#526](https://github.com/Chatie/wechaty/issues/526)
- static Contact.find\(\) / static Contact.findAll\(\) throws exception [\#520](https://github.com/Chatie/wechaty/issues/520)
- Cannot set alias of Contact Object getting from `message.from\(\)` method when Contact is not a friend [\#509](https://github.com/Chatie/wechaty/issues/509)
- An in-range update of brolog is breaking the build 🚨 [\#499](https://github.com/Chatie/wechaty/issues/499)
- room.member\(\) can not return right result [\#437](https://github.com/Chatie/wechaty/issues/437)
- windows run program send images throw out error [\#427](https://github.com/Chatie/wechaty/issues/427)
- group names have HTML in them [\#382](https://github.com/Chatie/wechaty/issues/382)
- jsdoc2md may flush some pieces of the embedded doc [\#378](https://github.com/Chatie/wechaty/issues/378)

**Merged pull requests:**

- fix\(puppet-web\): send any type file. [\#714](https://github.com/Chatie/wechaty/pull/714) ([binsee](https://github.com/binsee))
- add\(example\): add a roger bot runs on wechaty telegram bot adaptor [\#684](https://github.com/Chatie/wechaty/pull/684) ([hczhcz](https://github.com/hczhcz))
- some typo fixes and suggested revisions [\#681](https://github.com/Chatie/wechaty/pull/681) ([lpmi-13](https://github.com/lpmi-13))
- room-join cannot detect inviteeList when people join in the room with qrcode [\#651](https://github.com/Chatie/wechaty/pull/651) ([lijiarui](https://github.com/lijiarui))
- Create CODE\_OF\_CONDUCT.md [\#644](https://github.com/Chatie/wechaty/pull/644) ([zixia](https://github.com/zixia))
- fix\(package\): update brolog to version 1.1.23 [\#643](https://github.com/Chatie/wechaty/pull/643) ([zixia](https://github.com/zixia))
- add documentation TODO entries [\#640](https://github.com/Chatie/wechaty/pull/640) ([hczhcz](https://github.com/hczhcz))
- fix \#623 [\#627](https://github.com/Chatie/wechaty/pull/627) ([lijiarui](https://github.com/lijiarui))
- add log detail tag [\#619](https://github.com/Chatie/wechaty/pull/619) ([lijiarui](https://github.com/lijiarui))
- Create CODE\_OF\_CONDUCT.md [\#608](https://github.com/Chatie/wechaty/pull/608) ([zixia](https://github.com/zixia))
- add the link to media message in the wiki [\#605](https://github.com/Chatie/wechaty/pull/605) ([TingYinHelen](https://github.com/TingYinHelen))
- change outdated qrcode [\#604](https://github.com/Chatie/wechaty/pull/604) ([lijiarui](https://github.com/lijiarui))
- add notice to readme [\#578](https://github.com/Chatie/wechaty/pull/578) ([imerse](https://github.com/imerse))
- chore\(package\): update @types/node to version 7.0.28 [\#569](https://github.com/Chatie/wechaty/pull/569) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/node to version 7.0.26 [\#560](https://github.com/Chatie/wechaty/pull/560) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 5.3.2 [\#542](https://github.com/Chatie/wechaty/pull/542) ([zixia](https://github.com/zixia))
- fix \#512 [\#531](https://github.com/Chatie/wechaty/pull/531) ([FlyingBlazer](https://github.com/FlyingBlazer))
- make dingdong reply more beautiful [\#515](https://github.com/Chatie/wechaty/pull/515) ([lijiarui](https://github.com/lijiarui))
- chore\(package\): update @types/node to version 7.0.18 [\#496](https://github.com/Chatie/wechaty/pull/496) ([zixia](https://github.com/zixia))
- fix\(package\): update brolog to version 1.1.15 [\#495](https://github.com/Chatie/wechaty/pull/495) ([zixia](https://github.com/zixia))
- add contributor lockon [\#490](https://github.com/Chatie/wechaty/pull/490) ([lijiarui](https://github.com/lijiarui))

## [v0.8.2](https://github.com/chatie/wechaty/tree/v0.8.2) (2017-05-03)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.7.0...v0.8.2)

**Implemented enhancements:**

- Promote StateMonitor to a solo NPM module: StateSwitch [\#466](https://github.com/Chatie/wechaty/issues/466)
- Display detailed error trace when an error is caught in async  [\#360](https://github.com/Chatie/wechaty/issues/360)
- Room.find\({topic: topic}\) should allowed to return null [\#291](https://github.com/Chatie/wechaty/issues/291)
- add `room-bot-leave` event [\#250](https://github.com/Chatie/wechaty/issues/250)
- Prepare to rename the nick/remark/display for contact/room [\#217](https://github.com/Chatie/wechaty/issues/217)
- \[new feature\] add function message.mention\(\) [\#216](https://github.com/Chatie/wechaty/issues/216)
- \[new feature\] set bot's nickname in the group [\#201](https://github.com/Chatie/wechaty/issues/201)
- \[feature request\] fire `room-join` when someone joins from a QR Code [\#155](https://github.com/Chatie/wechaty/issues/155)
- \#4 send image/video [\#337](https://github.com/Chatie/wechaty/pull/337) ([mukaiu](https://github.com/mukaiu))

**Fixed bugs:**

- Reuse MediaMessage upload fail.Can be allowed MediaMessage reuse？ [\#439](https://github.com/Chatie/wechaty/issues/439)
- Room.member\(\) cannot find contact correctly [\#365](https://github.com/Chatie/wechaty/issues/365)
- Room.alias\(\) should return null if we have not set the alias in the room  [\#283](https://github.com/Chatie/wechaty/issues/283)
- Cannot read property 'Symbol\(Symbol.iterator\)' of undefined [\#273](https://github.com/Chatie/wechaty/issues/273)
- add sys message in FriendRequest Event  [\#260](https://github.com/Chatie/wechaty/issues/260)
- \[docker\] chromium-browser fail to start after upgrading chromium from v53 to v56 [\#235](https://github.com/Chatie/wechaty/issues/235)
- typo in Wiki [\#205](https://github.com/Chatie/wechaty/issues/205)
- doc bug [\#196](https://github.com/Chatie/wechaty/issues/196)
- Linting Error from PR@lijiarui [\#181](https://github.com/Chatie/wechaty/issues/181)
- \[document\] should list only the public/stable API to users [\#174](https://github.com/Chatie/wechaty/issues/174)

**Closed issues:**

- An in-range update of state-switch is breaking the build 🚨 [\#468](https://github.com/Chatie/wechaty/issues/468)
- An in-range update of state-switch is breaking the build 🚨 [\#467](https://github.com/Chatie/wechaty/issues/467)
- Always getSession timeout [\#463](https://github.com/Chatie/wechaty/issues/463)
- how to create more bots at once [\#460](https://github.com/Chatie/wechaty/issues/460)
- An in-range update of bl is breaking the build 🚨 [\#459](https://github.com/Chatie/wechaty/issues/459)
- how do we get avatar link? [\#424](https://github.com/Chatie/wechaty/issues/424)
- can't run the example [\#423](https://github.com/Chatie/wechaty/issues/423)
- 有没有查找好友的方法？ [\#411](https://github.com/Chatie/wechaty/issues/411)
- ding-dong-bot-ts cannot run normally on Mac [\#410](https://github.com/Chatie/wechaty/issues/410)
- Failed due to EAI\_AGAIN registry.yarnpkg.com:443 [\#408](https://github.com/Chatie/wechaty/issues/408)
- cannot remark friend in centos system [\#406](https://github.com/Chatie/wechaty/issues/406)
- MediaMessage in ding-dong-bot example can not be create [\#399](https://github.com/Chatie/wechaty/issues/399)
- wechaty can auto receive money\(red envolop/transfer\) on account. [\#398](https://github.com/Chatie/wechaty/issues/398)
- An in-range update of chromedriver is breaking the build 🚨 [\#395](https://github.com/Chatie/wechaty/issues/395)
- \[bug\] room.say\(\) return contact's alias when bot set alias for some one [\#394](https://github.com/Chatie/wechaty/issues/394)
- `Room.fresh\(\)`not work; `Room.alias\(\)`returns null [\#391](https://github.com/Chatie/wechaty/issues/391)
- should add`phantomjs-prebuilt` in package.json [\#385](https://github.com/Chatie/wechaty/issues/385)
- error on room join: TypeError: room.topic is not a function [\#383](https://github.com/Chatie/wechaty/issues/383)
- problem starting docker container . SyntaxError: Unexpected token function [\#352](https://github.com/Chatie/wechaty/issues/352)
- \[discuss\] Rename Wechaty to Chatie? [\#346](https://github.com/Chatie/wechaty/issues/346)
- cannot send images / this.puppet.getBaseRequest is not a function [\#338](https://github.com/Chatie/wechaty/issues/338)
- Some strange log warn [\#336](https://github.com/Chatie/wechaty/issues/336)
- run bot in server,about 1 hour ago ,the process will be killed [\#330](https://github.com/Chatie/wechaty/issues/330)
- wechaty 0.7.21 works but 0.7.24 failed with Argument of type 'string | Promise\<boolean\>' is not assignable to parameter of type 'string'. [\#282](https://github.com/Chatie/wechaty/issues/282)
- how i can save avatar without await keywords? [\#278](https://github.com/Chatie/wechaty/issues/278)
- 如何获取MsgType为APP类型的信息,解析不成xml [\#262](https://github.com/Chatie/wechaty/issues/262)
- \[linting\] fix needed for new tslint rule: trailing-comma [\#251](https://github.com/Chatie/wechaty/issues/251)
- Avatar return empty image in example/contact-bot.ts [\#246](https://github.com/Chatie/wechaty/issues/246)
- Room&Contact.find\(\) should throw exception when it get more than one value [\#229](https://github.com/Chatie/wechaty/issues/229)
- Contact.findAll\(\) return contactList includes oa account [\#222](https://github.com/Chatie/wechaty/issues/222)
- timeouts when running unattended [\#184](https://github.com/Chatie/wechaty/issues/184)
- room.member\(\) cannot find contact when contact set whose alias in the room [\#173](https://github.com/Chatie/wechaty/issues/173)

**Merged pull requests:**

- Lazy to create a stream [\#470](https://github.com/Chatie/wechaty/pull/470) ([mukaiu](https://github.com/mukaiu))
- chore\(package\): update state-switch to version 0.1.7 [\#469](https://github.com/Chatie/wechaty/pull/469) ([zixia](https://github.com/zixia))
- chore\(package\): update bl to version 1.2.1 [\#462](https://github.com/Chatie/wechaty/pull/462) ([zixia](https://github.com/zixia))
- fix\(package\): update brolog to version 1.0.13 [\#455](https://github.com/Chatie/wechaty/pull/455) ([zixia](https://github.com/zixia))
- chore\(package\): update fluent-ffmpeg to version 2.1.2 [\#449](https://github.com/Chatie/wechaty/pull/449) ([zixia](https://github.com/zixia))
- add magic code for room.say\(\)  when `@bot ` happen [\#440](https://github.com/Chatie/wechaty/pull/440) ([lijiarui](https://github.com/lijiarui))
- \#3 support send gif [\#438](https://github.com/Chatie/wechaty/pull/438) ([mukaiu](https://github.com/mukaiu))
- Limit video file size [\#421](https://github.com/Chatie/wechaty/pull/421) ([mukaiu](https://github.com/mukaiu))
- add room.say\(MediaMessage\) [\#420](https://github.com/Chatie/wechaty/pull/420) ([mukaiu](https://github.com/mukaiu))
- Fix chrome driver path problem in Windows [\#416](https://github.com/Chatie/wechaty/pull/416) ([xjchengo](https://github.com/xjchengo))
- fix upload media url error [\#415](https://github.com/Chatie/wechaty/pull/415) ([mukaiu](https://github.com/mukaiu))
- support brand checking of contact  [\#404](https://github.com/Chatie/wechaty/pull/404) ([JasLin](https://github.com/JasLin))
- chore\(package\): update chromedriver to version 2.29.0 [\#396](https://github.com/Chatie/wechaty/pull/396) ([zixia](https://github.com/zixia))
- Add missing %s content for leaver not found error [\#388](https://github.com/Chatie/wechaty/pull/388) ([xinbenlv](https://github.com/xinbenlv))
- fix jsdoc flush issue \#378 and minor fix on the doc examples [\#380](https://github.com/Chatie/wechaty/pull/380) ([ax4](https://github.com/ax4))
- Limit the size of the sending file [\#376](https://github.com/Chatie/wechaty/pull/376) ([mukaiu](https://github.com/mukaiu))
- add room-leave event [\#370](https://github.com/Chatie/wechaty/pull/370) ([lijiarui](https://github.com/lijiarui))
- room.memberAll\(\) & change room.member\(\) query to 3 types [\#364](https://github.com/Chatie/wechaty/pull/364) ([lijiarui](https://github.com/lijiarui))
- Add mention [\#362](https://github.com/Chatie/wechaty/pull/362) ([lijiarui](https://github.com/lijiarui))
- Printout entire error trace when unhandledRejection was caught [\#361](https://github.com/Chatie/wechaty/pull/361) ([xinbenlv](https://github.com/xinbenlv))
- first item of memberList as owner is confusion [\#358](https://github.com/Chatie/wechaty/pull/358) ([JasLin](https://github.com/JasLin))
- chore\(package\): update ts-node to version 3.0.2 [\#351](https://github.com/Chatie/wechaty/pull/351) ([zixia](https://github.com/zixia))
- fix room test [\#328](https://github.com/Chatie/wechaty/pull/328) ([lijiarui](https://github.com/lijiarui))
- remove blank [\#324](https://github.com/Chatie/wechaty/pull/324) ([lijiarui](https://github.com/lijiarui))
- remove m.send\(\) fucntion [\#323](https://github.com/Chatie/wechaty/pull/323) ([lijiarui](https://github.com/lijiarui))
- Add JsDoc for Class Contact [\#321](https://github.com/Chatie/wechaty/pull/321) ([lijiarui](https://github.com/lijiarui))
- 291 [\#318](https://github.com/Chatie/wechaty/pull/318) ([lijiarui](https://github.com/lijiarui))
- chore\(package\): update yarn to version 0.21.3 [\#317](https://github.com/Chatie/wechaty/pull/317) ([zixia](https://github.com/zixia))
- chore\(package\): update nyc to version 10.1.2 [\#316](https://github.com/Chatie/wechaty/pull/316) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 4.5.1 [\#315](https://github.com/Chatie/wechaty/pull/315) ([zixia](https://github.com/zixia))
- chore\(package\): update check-node-version to version 2.0.1 [\#314](https://github.com/Chatie/wechaty/pull/314) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/ws to version 0.0.38 [\#313](https://github.com/Chatie/wechaty/pull/313) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/node to version 7.0.7 [\#312](https://github.com/Chatie/wechaty/pull/312) ([zixia](https://github.com/zixia))
- fix\(package\): update @types/selenium-webdriver to version 3.0.0 [\#311](https://github.com/Chatie/wechaty/pull/311) ([zixia](https://github.com/zixia))
- added hot load bots [\#310](https://github.com/Chatie/wechaty/pull/310) ([Gcaufy](https://github.com/Gcaufy))
- \#283 [\#303](https://github.com/Chatie/wechaty/pull/303) ([lijiarui](https://github.com/lijiarui))
- \#291 change `throw error` to `return null` [\#292](https://github.com/Chatie/wechaty/pull/292) ([lijiarui](https://github.com/lijiarui))
- Add print nodejs version [\#280](https://github.com/Chatie/wechaty/pull/280) ([xinbenlv](https://github.com/xinbenlv))
- load all memberList [\#275](https://github.com/Chatie/wechaty/pull/275) ([lijiarui](https://github.com/lijiarui))
- add-sys-message-in-friendrequest [\#266](https://github.com/Chatie/wechaty/pull/266) ([lijiarui](https://github.com/lijiarui))
- fix for new tslint rules [\#264](https://github.com/Chatie/wechaty/pull/264) ([lijiarui](https://github.com/lijiarui))
- roomJoinFailed [\#249](https://github.com/Chatie/wechaty/pull/249) ([lijiarui](https://github.com/lijiarui))
- add warn log when function Room&Contact.find\(\) return more than one value [\#239](https://github.com/Chatie/wechaty/pull/239) ([lijiarui](https://github.com/lijiarui))
- rename the nick/remark/display for contact/room \#217 [\#234](https://github.com/Chatie/wechaty/pull/234) ([lijiarui](https://github.com/lijiarui))
- fix\_function\_room.member\_\#173 [\#211](https://github.com/Chatie/wechaty/pull/211) ([lijiarui](https://github.com/lijiarui))
- friendrequest [\#199](https://github.com/Chatie/wechaty/pull/199) ([lijiarui](https://github.com/lijiarui))
- \#181 fix [\#182](https://github.com/Chatie/wechaty/pull/182) ([lijiarui](https://github.com/lijiarui))
- \[Snyk\] Fix for 4 vulnerable dependency paths [\#169](https://github.com/Chatie/wechaty/pull/169) ([snyk-bot](https://github.com/snyk-bot))
- enhance \#155 fire `room-join` when someone joins from a QR Code [\#162](https://github.com/Chatie/wechaty/pull/162) ([lijiarui](https://github.com/lijiarui))

## [v0.7.0](https://github.com/chatie/wechaty/tree/v0.7.0) (2016-12-29)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.6.32...v0.7.0)

**Implemented enhancements:**

- 请问可以获取联系人或群成员的性别、所属地域、头像吗？ [\#121](https://github.com/Chatie/wechaty/issues/121)
- Function Room.add\(\) should return Promise\<boolean\> [\#119](https://github.com/Chatie/wechaty/issues/119)
- Could you add api to find contact by remark [\#117](https://github.com/Chatie/wechaty/issues/117)
- Need to support AppMsgType: 100001 with MsgType: 49 [\#114](https://github.com/Chatie/wechaty/issues/114)

**Fixed bugs:**

- to silence all the output from webdriver\(chromedriver\) for log level INFO [\#150](https://github.com/Chatie/wechaty/issues/150)
- `tsc` compiling error: Cannot find namespace 'webdriver' [\#136](https://github.com/Chatie/wechaty/issues/136)
- remark\(null\) doesn't work [\#130](https://github.com/Chatie/wechaty/issues/130)
- Cannot identify \['\] in room topic [\#116](https://github.com/Chatie/wechaty/issues/116)
- room.member\(\) cannot get member when bot set remark for friend [\#104](https://github.com/Chatie/wechaty/issues/104)
- Session Cookies not loaded correctly? [\#31](https://github.com/Chatie/wechaty/issues/31)

**Closed issues:**

- too many levels of symbolic links [\#165](https://github.com/Chatie/wechaty/issues/165)
- node dist/example/ding-dong-bot.js example运行异常 [\#159](https://github.com/Chatie/wechaty/issues/159)
- An in-range update of tslint is breaking the build 🚨 [\#157](https://github.com/Chatie/wechaty/issues/157)
- deploying to server problems \(running headless\) [\#154](https://github.com/Chatie/wechaty/issues/154)
- An in-range update of @types/selenium-webdriver is breaking the build 🚨 [\#148](https://github.com/Chatie/wechaty/issues/148)
- An in-range update of tslint is breaking the build 🚨 [\#144](https://github.com/Chatie/wechaty/issues/144)
- An in-range update of tslint is breaking the build 🚨 [\#140](https://github.com/Chatie/wechaty/issues/140)
- An in-range update of @types/node is breaking the build 🚨 [\#137](https://github.com/Chatie/wechaty/issues/137)
- An in-range update of @types/sinon is breaking the build 🚨 [\#135](https://github.com/Chatie/wechaty/issues/135)
- wechaty mybot.js start error [\#126](https://github.com/Chatie/wechaty/issues/126)
- Room-join' para  inviteeList\[\] cannot always work well when contain emoji [\#125](https://github.com/Chatie/wechaty/issues/125)
- \[help\] install wechaty and its types [\#124](https://github.com/Chatie/wechaty/issues/124)
- ERR Message ready\(\) exception: Error: Contact.load\(\): id not found [\#123](https://github.com/Chatie/wechaty/issues/123)
- enhance request.hello function [\#120](https://github.com/Chatie/wechaty/issues/120)
- 无法自动通过好友请求 [\#115](https://github.com/Chatie/wechaty/issues/115)
- \[EVENT INVITATION\] Welcome to join Beijing Node Party 18: Wechaty & ChatBot on 11th Dec. [\#107](https://github.com/Chatie/wechaty/issues/107)
- failed run demo in docker under centos [\#101](https://github.com/Chatie/wechaty/issues/101)

**Merged pull requests:**

- chore\(package\): update @types/node to version 6.0.54 [\#168](https://github.com/Chatie/wechaty/pull/168) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 4.2.0 [\#158](https://github.com/Chatie/wechaty/pull/158) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/selenium-webdriver to version 2.53.37 [\#149](https://github.com/Chatie/wechaty/pull/149) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 4.1.1 [\#146](https://github.com/Chatie/wechaty/pull/146) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/sinon to version 1.16.33 [\#143](https://github.com/Chatie/wechaty/pull/143) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/node to version 6.0.52 [\#142](https://github.com/Chatie/wechaty/pull/142) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 4.1.0 [\#141](https://github.com/Chatie/wechaty/pull/141) ([zixia](https://github.com/zixia))
- Update README.md [\#139](https://github.com/Chatie/wechaty/pull/139) ([lijiarui](https://github.com/lijiarui))
- qrcode [\#112](https://github.com/Chatie/wechaty/pull/112) ([lijiarui](https://github.com/lijiarui))
- Update README.md [\#110](https://github.com/Chatie/wechaty/pull/110) ([lijiarui](https://github.com/lijiarui))

## [v0.6.32](https://github.com/chatie/wechaty/tree/v0.6.32) (2016-11-28)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.6.22...v0.6.32)

**Implemented enhancements:**

- get room owner on event 'room-join','room-topic' [\#105](https://github.com/Chatie/wechaty/pull/105) ([JasLin](https://github.com/JasLin))

**Fixed bugs:**

- contactFind\(function \(c\) { return /.\*/.test\(c\) }\) rejected: javascript error: Unexpected token [\#98](https://github.com/Chatie/wechaty/issues/98)
- Error: Chrome failed to start: was killed [\#95](https://github.com/Chatie/wechaty/issues/95)

**Closed issues:**

- another problem about docker run [\#103](https://github.com/Chatie/wechaty/issues/103)
-  Error: Server terminated early with status 127 [\#102](https://github.com/Chatie/wechaty/issues/102)

**Merged pull requests:**

- fixed javascript error: attempt is not defined [\#100](https://github.com/Chatie/wechaty/pull/100) ([JasLin](https://github.com/JasLin))
- convert wechaty-bro.js to plain old javascript syntax \#60 [\#97](https://github.com/Chatie/wechaty/pull/97) ([cherry-geqi](https://github.com/cherry-geqi))

## [v0.6.22](https://github.com/chatie/wechaty/tree/v0.6.22) (2016-11-14)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.6.21...v0.6.22)

## [v0.6.21](https://github.com/chatie/wechaty/tree/v0.6.21) (2016-11-14)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.6.0...v0.6.21)

**Fixed bugs:**

- Function `message.to\(\): Contact|Room` bug [\#88](https://github.com/Chatie/wechaty/issues/88)

**Closed issues:**

- Wechaty.send\(\) error when send message to the room [\#89](https://github.com/Chatie/wechaty/issues/89)
- 基础运行报错.....我都有点不好意思问了.....汗.... [\#82](https://github.com/Chatie/wechaty/issues/82)

**Merged pull requests:**

- Update README.md [\#93](https://github.com/Chatie/wechaty/pull/93) ([lijiarui](https://github.com/lijiarui))
- Update README.md [\#92](https://github.com/Chatie/wechaty/pull/92) ([lijiarui](https://github.com/lijiarui))
- fix anchor link error [\#91](https://github.com/Chatie/wechaty/pull/91) ([lijiarui](https://github.com/lijiarui))
- fill in the TBW block [\#87](https://github.com/Chatie/wechaty/pull/87) ([lijiarui](https://github.com/lijiarui))

## [v0.6.0](https://github.com/chatie/wechaty/tree/v0.6.0) (2016-11-11)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.5.22...v0.6.0)

**Fixed bugs:**

- \[Docker\] Config.isDocker is not right in some Docker version / Linux distribution [\#84](https://github.com/Chatie/wechaty/issues/84)

## [v0.5.22](https://github.com/chatie/wechaty/tree/v0.5.22) (2016-11-10)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.5.21...v0.5.22)

## [v0.5.21](https://github.com/chatie/wechaty/tree/v0.5.21) (2016-11-09)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.5.9...v0.5.21)

**Implemented enhancements:**

- To Disable WebDriverJS promise manager for Selenium v3.0 [\#72](https://github.com/Chatie/wechaty/issues/72)
- \[Upgrade to v0.5\] Convert code base to Typescript from Javascript [\#40](https://github.com/Chatie/wechaty/issues/40)

**Closed issues:**

- can't run demo in docker under mac [\#80](https://github.com/Chatie/wechaty/issues/80)
- 在windows下运行例子,npm 环境中,报错关于getChromeDriver\(\) [\#77](https://github.com/Chatie/wechaty/issues/77)

## [v0.5.9](https://github.com/chatie/wechaty/tree/v0.5.9) (2016-11-07)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.5.1...v0.5.9)

**Closed issues:**

- run on windows.error [\#75](https://github.com/Chatie/wechaty/issues/75)

**Merged pull requests:**

- fix: memberList Method have no 'name' argument defined ,it'will cause a undefined error. [\#78](https://github.com/Chatie/wechaty/pull/78) ([JasLin](https://github.com/JasLin))
- fix issue \#70  [\#76](https://github.com/Chatie/wechaty/pull/76) ([JasLin](https://github.com/JasLin))

## [v0.5.1](https://github.com/chatie/wechaty/tree/v0.5.1) (2016-11-03)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.4.0...v0.5.1)

**Implemented enhancements:**

- Dockerize Wechaty for easy start [\#66](https://github.com/Chatie/wechaty/issues/66)
- Wechat帐号界面语言设为中文环境下：wechaty的room-join room-leave room-topic 事件无法触发 [\#52](https://github.com/Chatie/wechaty/issues/52)
- test/fix Watchdog with browser dead & timeout conditions [\#47](https://github.com/Chatie/wechaty/issues/47)
- use StateMonitor to record&check wechaty/puppet/bridge/browser state change [\#46](https://github.com/Chatie/wechaty/issues/46)
- \[New Feature\] send message by branding new method: say\(\) [\#41](https://github.com/Chatie/wechaty/issues/41)
- \[New Feature\] Contact.{tag,star,remark,find,findAll} [\#34](https://github.com/Chatie/wechaty/issues/34)
- \[New Feature\] FriendRequest class and event [\#33](https://github.com/Chatie/wechaty/issues/33)
- \[New Feature\] Room.{create,addMember,delMember,quit,modTopic} support [\#32](https://github.com/Chatie/wechaty/issues/32)

**Fixed bugs:**

- Just have a try as example of tuling bot. But method message.self\(\) seems work improper.   [\#68](https://github.com/Chatie/wechaty/issues/68)
- 在cloud9中运行wechaty报错 [\#67](https://github.com/Chatie/wechaty/issues/67)
- 当用户昵称中含有表情时，无法触发room-join 事件 [\#64](https://github.com/Chatie/wechaty/issues/64)
- room-join 事件下，无法通过contact.id 方法获取contact\_id [\#54](https://github.com/Chatie/wechaty/issues/54)
- FriendRequest is not export to npm module  [\#50](https://github.com/Chatie/wechaty/issues/50)
- test/fix Watchdog with browser dead & timeout conditions [\#47](https://github.com/Chatie/wechaty/issues/47)

**Closed issues:**

- Run wechaty occurs chromedriver is still running and the solution [\#62](https://github.com/Chatie/wechaty/issues/62)
- Can't run wechaty with error log [\#61](https://github.com/Chatie/wechaty/issues/61)
- \[design\] new class: BrowserCookie [\#59](https://github.com/Chatie/wechaty/issues/59)
- 在room中通过room.topic\(\)获取不到room的topic [\#55](https://github.com/Chatie/wechaty/issues/55)
- 近期wechaty启动失败次数较多 [\#53](https://github.com/Chatie/wechaty/issues/53)
- TSError: ⨯ Unable to compile TypeScript src/puppet-web/event.ts \(120,12\): Type 'PuppetWeb' is not assignable to type 'void'. \(2322\) [\#51](https://github.com/Chatie/wechaty/issues/51)
- demo 无法运行 [\#49](https://github.com/Chatie/wechaty/issues/49)
- Suggest give an api to get url [\#45](https://github.com/Chatie/wechaty/issues/45)
- element\_wrong----contact.get\('name'\) got room name not contact name [\#43](https://github.com/Chatie/wechaty/issues/43)
- webdrive login always occur error, for one success login always cost 4-5 log trys [\#42](https://github.com/Chatie/wechaty/issues/42)

## [v0.4.0](https://github.com/chatie/wechaty/tree/v0.4.0) (2016-10-08)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.3.12...v0.4.0)

**Implemented enhancements:**

- \[Feature Request\] Add friend\(Contact\) to a group\(Room\) [\#14](https://github.com/Chatie/wechaty/issues/14)
- Support Friend Request / Contact Add & Del [\#6](https://github.com/Chatie/wechaty/issues/6)

**Fixed bugs:**

- Wechaty account logout unexpectedly [\#37](https://github.com/Chatie/wechaty/issues/37)
- google-chrome fails to start in docker [\#26](https://github.com/Chatie/wechaty/issues/26)
- wx.qq.com detect phantomjs and disabled it [\#21](https://github.com/Chatie/wechaty/issues/21)

**Closed issues:**

- get rid of `PuppetWeb.initAttach` [\#35](https://github.com/Chatie/wechaty/issues/35)
- webdriver fail in docker when use ava \(parallel tests mode\) [\#27](https://github.com/Chatie/wechaty/issues/27)
- WARN PuppetWebBridge init\(\) inject FINAL fail [\#22](https://github.com/Chatie/wechaty/issues/22)
- node-tap strange behaviour cause CircleCI & Travis-CI keep failing [\#11](https://github.com/Chatie/wechaty/issues/11)

**Merged pull requests:**

- add hubot introduction in readme [\#38](https://github.com/Chatie/wechaty/pull/38) ([lijiarui](https://github.com/lijiarui))
- Ava [\#25](https://github.com/Chatie/wechaty/pull/25) ([zixia](https://github.com/zixia))

## [v0.3.12](https://github.com/chatie/wechaty/tree/v0.3.12) (2016-08-25)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.2.0...v0.3.12)

**Merged pull requests:**


## [v0.2.0](https://github.com/chatie/wechaty/tree/v0.2.0) (2016-06-28)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.1.7...v0.2.0)

## [v0.1.7](https://github.com/chatie/wechaty/tree/v0.1.7) (2016-06-18)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.1.3...v0.1.7)

## [v0.1.3](https://github.com/chatie/wechaty/tree/v0.1.3) (2016-06-11)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.1.1...v0.1.3)

## [v0.1.1](https://github.com/chatie/wechaty/tree/v0.1.1) (2016-06-09)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.1.0...v0.1.1)

## [v0.1.0](https://github.com/chatie/wechaty/tree/v0.1.0) (2016-06-09)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.0.6...v0.1.0)

**Fixed bugs:**

- ding-dong bot broken due to typo [\#5](https://github.com/Chatie/wechaty/issues/5)

## [v0.0.6](https://github.com/chatie/wechaty/tree/v0.0.6) (2016-05-15)
[Full Changelog](https://github.com/chatie/wechaty/compare/v0.0.5...v0.0.6)

**Closed issues:**

- selenium-webdriver & phantomjs-prebuilt not work together under win32 [\#1](https://github.com/Chatie/wechaty/issues/1)

## [v0.0.5](https://github.com/chatie/wechaty/tree/v0.0.5) (2016-05-11)
**Merged pull requests:**

- Add a Gitter chat badge to README.md [\#3](https://github.com/Chatie/wechaty/pull/3) ([gitter-badger](https://github.com/gitter-badger))



\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*
