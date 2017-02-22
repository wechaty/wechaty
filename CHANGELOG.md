# Change Log

## [Unreleased](https://github.com/wechaty/wechaty/tree/HEAD)

[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.7.0...HEAD)

**Implemented enhancements:**

- Prepare to rename the nick/remark/display for contact/room [\#217](https://github.com/wechaty/wechaty/issues/217)
- \[feature request\] fire `room-join` when someone joins from a QR Code [\#155](https://github.com/wechaty/wechaty/issues/155)

**Fixed bugs:**

- \[docker\] chromium-browser fail to start after upgrading chromium from v53 to v56 [\#235](https://github.com/wechaty/wechaty/issues/235)
- typo in Wiki [\#205](https://github.com/wechaty/wechaty/issues/205)
- doc bug [\#196](https://github.com/wechaty/wechaty/issues/196)
- Linting Error from PR@lijiarui [\#181](https://github.com/wechaty/wechaty/issues/181)
- \[document\] should list only the public/stable API to users [\#174](https://github.com/wechaty/wechaty/issues/174)

**Closed issues:**

- 如何获取MsgType为APP类型的信息,解析不成xml [\#262](https://github.com/wechaty/wechaty/issues/262)
- \[linting\] fix needed for new tslint rule: trailing-comma [\#251](https://github.com/wechaty/wechaty/issues/251)
- Room&Contact.find\(\) should throw exception when it get more than one value [\#229](https://github.com/wechaty/wechaty/issues/229)
- Contact.findAll\(\) return contactList includes oa account [\#222](https://github.com/wechaty/wechaty/issues/222)
- timeouts when running unattended [\#184](https://github.com/wechaty/wechaty/issues/184)
- room.member\(\) cannot find contact when contact set whose alias in the room [\#173](https://github.com/wechaty/wechaty/issues/173)

**Merged pull requests:**

- add-sys-message-in-friendrequest [\#266](https://github.com/wechaty/wechaty/pull/266) ([lijiarui](https://github.com/lijiarui))
- fix for new tslint rules [\#264](https://github.com/wechaty/wechaty/pull/264) ([lijiarui](https://github.com/lijiarui))
- roomJoinFailed [\#249](https://github.com/wechaty/wechaty/pull/249) ([lijiarui](https://github.com/lijiarui))
- add warn log when function Room&Contact.find\(\) return more than one value [\#239](https://github.com/wechaty/wechaty/pull/239) ([lijiarui](https://github.com/lijiarui))
- rename the nick/remark/display for contact/room \#217 [\#234](https://github.com/wechaty/wechaty/pull/234) ([lijiarui](https://github.com/lijiarui))
- fix\_function\_room.member\_\#173 [\#211](https://github.com/wechaty/wechaty/pull/211) ([lijiarui](https://github.com/lijiarui))
- friendrequest [\#199](https://github.com/wechaty/wechaty/pull/199) ([lijiarui](https://github.com/lijiarui))
- \#181 fix [\#182](https://github.com/wechaty/wechaty/pull/182) ([lijiarui](https://github.com/lijiarui))
- \[Snyk\] Fix for 4 vulnerable dependency paths [\#169](https://github.com/wechaty/wechaty/pull/169) ([snyk-bot](https://github.com/snyk-bot))
- enhance \#155 fire `room-join` when someone joins from a QR Code [\#162](https://github.com/wechaty/wechaty/pull/162) ([lijiarui](https://github.com/lijiarui))

## [v0.7.0](https://github.com/wechaty/wechaty/tree/v0.7.0) (2016-12-29)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.6.32...v0.7.0)

**Implemented enhancements:**

- 请问可以获取联系人或群成员的性别、所属地域、头像吗？ [\#121](https://github.com/wechaty/wechaty/issues/121)
- Function Room.add\(\) should return Promise\<boolean\> [\#119](https://github.com/wechaty/wechaty/issues/119)
- Could you add api to find contact by remark [\#117](https://github.com/wechaty/wechaty/issues/117)
- Need to support AppMsgType: 100001 with MsgType: 49 [\#114](https://github.com/wechaty/wechaty/issues/114)

**Fixed bugs:**

- to silence all the output from webdriver\(chromedriver\) for log level INFO [\#150](https://github.com/wechaty/wechaty/issues/150)
- `tsc` compiling error: Cannot find namespace 'webdriver' [\#136](https://github.com/wechaty/wechaty/issues/136)
- remark\(null\) doesn't work [\#130](https://github.com/wechaty/wechaty/issues/130)
- Cannot identify \['\] in room topic [\#116](https://github.com/wechaty/wechaty/issues/116)
- room.member\(\) cannot get member when bot set remark for friend [\#104](https://github.com/wechaty/wechaty/issues/104)
- Session Cookies not loaded correctly? [\#31](https://github.com/wechaty/wechaty/issues/31)

**Closed issues:**

- too many levels of symbolic links [\#165](https://github.com/wechaty/wechaty/issues/165)
- node dist/example/ding-dong-bot.js example运行异常 [\#159](https://github.com/wechaty/wechaty/issues/159)
- An in-range update of tslint is breaking the build 🚨 [\#157](https://github.com/wechaty/wechaty/issues/157)
- deploying to server problems \(running headless\) [\#154](https://github.com/wechaty/wechaty/issues/154)
- An in-range update of @types/selenium-webdriver is breaking the build 🚨 [\#148](https://github.com/wechaty/wechaty/issues/148)
- An in-range update of tslint is breaking the build 🚨 [\#144](https://github.com/wechaty/wechaty/issues/144)
- An in-range update of tslint is breaking the build 🚨 [\#140](https://github.com/wechaty/wechaty/issues/140)
- An in-range update of @types/node is breaking the build 🚨 [\#137](https://github.com/wechaty/wechaty/issues/137)
- An in-range update of @types/sinon is breaking the build 🚨 [\#135](https://github.com/wechaty/wechaty/issues/135)
- wechaty mybot.js start error [\#126](https://github.com/wechaty/wechaty/issues/126)
- Room-join' para  inviteeList\[\] cannot always work well when contain emoji [\#125](https://github.com/wechaty/wechaty/issues/125)
- \[help\] install wechaty and its types [\#124](https://github.com/wechaty/wechaty/issues/124)
- ERR Message ready\(\) exception: Error: Contact.load\(\): id not found [\#123](https://github.com/wechaty/wechaty/issues/123)
- enhance request.hello function [\#120](https://github.com/wechaty/wechaty/issues/120)
- 无法自动通过好友请求 [\#115](https://github.com/wechaty/wechaty/issues/115)
- \[EVENT INVITATION\] Welcome to join Beijing Node Party 18: Wechaty & ChatBot on 11th Dec. [\#107](https://github.com/wechaty/wechaty/issues/107)
- failed run demo in docker under centos [\#101](https://github.com/wechaty/wechaty/issues/101)

**Merged pull requests:**

- chore\(package\): update @types/node to version 6.0.54 [\#168](https://github.com/wechaty/wechaty/pull/168) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 4.2.0 [\#158](https://github.com/wechaty/wechaty/pull/158) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/selenium-webdriver to version 2.53.37 [\#149](https://github.com/wechaty/wechaty/pull/149) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 4.1.1 [\#146](https://github.com/wechaty/wechaty/pull/146) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/sinon to version 1.16.33 [\#143](https://github.com/wechaty/wechaty/pull/143) ([zixia](https://github.com/zixia))
- chore\(package\): update @types/node to version 6.0.52 [\#142](https://github.com/wechaty/wechaty/pull/142) ([zixia](https://github.com/zixia))
- chore\(package\): update tslint to version 4.1.0 [\#141](https://github.com/wechaty/wechaty/pull/141) ([zixia](https://github.com/zixia))
- Update README.md [\#139](https://github.com/wechaty/wechaty/pull/139) ([lijiarui](https://github.com/lijiarui))
- qrcode [\#112](https://github.com/wechaty/wechaty/pull/112) ([lijiarui](https://github.com/lijiarui))
- Update README.md [\#110](https://github.com/wechaty/wechaty/pull/110) ([lijiarui](https://github.com/lijiarui))

## [v0.6.32](https://github.com/wechaty/wechaty/tree/v0.6.32) (2016-11-28)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.6.22...v0.6.32)

**Implemented enhancements:**

- get room owner on event 'room-join','room-topic' [\#105](https://github.com/wechaty/wechaty/pull/105) ([JasLin](https://github.com/JasLin))

**Fixed bugs:**

- contactFind\(function \(c\) { return /.\*/.test\(c\) }\) rejected: javascript error: Unexpected token [\#98](https://github.com/wechaty/wechaty/issues/98)
- Error: Chrome failed to start: was killed [\#95](https://github.com/wechaty/wechaty/issues/95)

**Closed issues:**

- another problem about docker run [\#103](https://github.com/wechaty/wechaty/issues/103)
-  Error: Server terminated early with status 127 [\#102](https://github.com/wechaty/wechaty/issues/102)
- Selenium WebDriver driver.getSession\(\) wait a long time [\#86](https://github.com/wechaty/wechaty/issues/86)

**Merged pull requests:**

- fixed javascript error: attempt is not defined [\#100](https://github.com/wechaty/wechaty/pull/100) ([JasLin](https://github.com/JasLin))
- convert wechaty-bro.js to plain old javascript syntax \#60 [\#97](https://github.com/wechaty/wechaty/pull/97) ([cherry-geqi](https://github.com/cherry-geqi))

## [v0.6.22](https://github.com/wechaty/wechaty/tree/v0.6.22) (2016-11-14)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.6.21...v0.6.22)

## [v0.6.21](https://github.com/wechaty/wechaty/tree/v0.6.21) (2016-11-14)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.6.0...v0.6.21)

**Fixed bugs:**

- Function `message.to\(\): Contact|Room` bug [\#88](https://github.com/wechaty/wechaty/issues/88)

**Closed issues:**

- Wechaty.send\(\) error when send message to the room [\#89](https://github.com/wechaty/wechaty/issues/89)
- 基础运行报错.....我都有点不好意思问了.....汗.... [\#82](https://github.com/wechaty/wechaty/issues/82)

**Merged pull requests:**

- Update README.md [\#93](https://github.com/wechaty/wechaty/pull/93) ([lijiarui](https://github.com/lijiarui))
- Update README.md [\#92](https://github.com/wechaty/wechaty/pull/92) ([lijiarui](https://github.com/lijiarui))
- fix anchor link error [\#91](https://github.com/wechaty/wechaty/pull/91) ([lijiarui](https://github.com/lijiarui))
- fill in the TBW block [\#87](https://github.com/wechaty/wechaty/pull/87) ([lijiarui](https://github.com/lijiarui))

## [v0.6.0](https://github.com/wechaty/wechaty/tree/v0.6.0) (2016-11-11)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.5.22...v0.6.0)

**Fixed bugs:**

- \[Docker\] Config.isDocker is not right in some Docker version / Linux distribution [\#84](https://github.com/wechaty/wechaty/issues/84)

## [v0.5.22](https://github.com/wechaty/wechaty/tree/v0.5.22) (2016-11-10)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.5.21...v0.5.22)

## [v0.5.21](https://github.com/wechaty/wechaty/tree/v0.5.21) (2016-11-09)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.5.9...v0.5.21)

**Implemented enhancements:**

- To Disable WebDriverJS promise manager for Selenium v3.0 [\#72](https://github.com/wechaty/wechaty/issues/72)
- \[Upgrade to v0.5\] Convert code base to Typescript from Javascript [\#40](https://github.com/wechaty/wechaty/issues/40)

**Closed issues:**

- can't run demo in docker under mac [\#80](https://github.com/wechaty/wechaty/issues/80)
- 在windows下运行例子,npm 环境中,报错关于getChromeDriver\(\) [\#77](https://github.com/wechaty/wechaty/issues/77)

## [v0.5.9](https://github.com/wechaty/wechaty/tree/v0.5.9) (2016-11-07)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.5.1...v0.5.9)

**Closed issues:**

- run on windows.error [\#75](https://github.com/wechaty/wechaty/issues/75)

**Merged pull requests:**

- fix: memberList Method have no 'name' argument defined ,it'will cause a undefined error. [\#78](https://github.com/wechaty/wechaty/pull/78) ([JasLin](https://github.com/JasLin))
- fix issue \#70  [\#76](https://github.com/wechaty/wechaty/pull/76) ([JasLin](https://github.com/JasLin))

## [v0.5.1](https://github.com/wechaty/wechaty/tree/v0.5.1) (2016-11-03)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.4.0...v0.5.1)

**Implemented enhancements:**

- Dockerize Wechaty for easy start [\#66](https://github.com/wechaty/wechaty/issues/66)
- Wechat帐号界面语言设为中文环境下：wechaty的room-join room-leave room-topic 事件无法触发 [\#52](https://github.com/wechaty/wechaty/issues/52)
- test/fix Watchdog with browser dead & timeout conditions [\#47](https://github.com/wechaty/wechaty/issues/47)
- use StateMonitor to record&check wechaty/puppet/bridge/browser state change [\#46](https://github.com/wechaty/wechaty/issues/46)
- \[New Feature\] send message by branding new method: say\(\) [\#41](https://github.com/wechaty/wechaty/issues/41)
- \[New Feature\] Contact.{tag,star,remark,find,findAll} [\#34](https://github.com/wechaty/wechaty/issues/34)
- \[New Feature\] FriendRequest class and event [\#33](https://github.com/wechaty/wechaty/issues/33)
- \[New Feature\] Room.{create,addMember,delMember,quit,modTopic} support [\#32](https://github.com/wechaty/wechaty/issues/32)

**Fixed bugs:**

- Just have a try as example of tuling bot. But method message.self\(\) seems work improper.   [\#68](https://github.com/wechaty/wechaty/issues/68)
- 在cloud9中运行wechaty报错 [\#67](https://github.com/wechaty/wechaty/issues/67)
- 当用户昵称中含有表情时，无法触发room-join 事件 [\#64](https://github.com/wechaty/wechaty/issues/64)
- room-join 事件下，无法通过contact.id 方法获取contact\_id [\#54](https://github.com/wechaty/wechaty/issues/54)
- FriendRequest is not export to npm module  [\#50](https://github.com/wechaty/wechaty/issues/50)
- test/fix Watchdog with browser dead & timeout conditions [\#47](https://github.com/wechaty/wechaty/issues/47)

**Closed issues:**

- Run wechaty occurs chromedriver is still running and the solution [\#62](https://github.com/wechaty/wechaty/issues/62)
- Can't run wechaty with error log [\#61](https://github.com/wechaty/wechaty/issues/61)
- \[design\] new class: BrowserCookie [\#59](https://github.com/wechaty/wechaty/issues/59)
- 在room中通过room.topic\(\)获取不到room的topic [\#55](https://github.com/wechaty/wechaty/issues/55)
- 近期wechaty启动失败次数较多 [\#53](https://github.com/wechaty/wechaty/issues/53)
- TSError: ⨯ Unable to compile TypeScript src/puppet-web/event.ts \(120,12\): Type 'PuppetWeb' is not assignable to type 'void'. \(2322\) [\#51](https://github.com/wechaty/wechaty/issues/51)
- demo 无法运行 [\#49](https://github.com/wechaty/wechaty/issues/49)
- Suggest give an api to get url [\#45](https://github.com/wechaty/wechaty/issues/45)
- element\_wrong----contact.get\('name'\) got room name not contact name [\#43](https://github.com/wechaty/wechaty/issues/43)
- webdrive login always occur error, for one success login always cost 4-5 log trys [\#42](https://github.com/wechaty/wechaty/issues/42)

## [v0.4.0](https://github.com/wechaty/wechaty/tree/v0.4.0) (2016-10-08)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.3.12...v0.4.0)

**Implemented enhancements:**

- \[Feature Request\] Add friend\(Contact\) to a group\(Room\) [\#14](https://github.com/wechaty/wechaty/issues/14)
- Support Friend Request / Contact Add & Del [\#6](https://github.com/wechaty/wechaty/issues/6)

**Fixed bugs:**

- Wechaty account logout unexpectedly [\#37](https://github.com/wechaty/wechaty/issues/37)
- google-chrome fails to start in docker [\#26](https://github.com/wechaty/wechaty/issues/26)
- wx.qq.com detect phantomjs and disabled it [\#21](https://github.com/wechaty/wechaty/issues/21)

**Closed issues:**

- get rid of `PuppetWeb.initAttach` [\#35](https://github.com/wechaty/wechaty/issues/35)
- webdriver fail in docker when use ava \(parallel tests mode\) [\#27](https://github.com/wechaty/wechaty/issues/27)
- WARN PuppetWebBridge init\(\) inject FINAL fail [\#22](https://github.com/wechaty/wechaty/issues/22)
- node-tap strange behaviour cause CircleCI & Travis-CI keep failing [\#11](https://github.com/wechaty/wechaty/issues/11)

**Merged pull requests:**

- add hubot introduction in readme [\#38](https://github.com/wechaty/wechaty/pull/38) ([lijiarui](https://github.com/lijiarui))
- Ava [\#25](https://github.com/wechaty/wechaty/pull/25) ([zixia](https://github.com/zixia))

## [v0.3.12](https://github.com/wechaty/wechaty/tree/v0.3.12) (2016-08-25)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.2.0...v0.3.12)

**Merged pull requests:**


## [v0.2.0](https://github.com/wechaty/wechaty/tree/v0.2.0) (2016-06-28)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.1.7...v0.2.0)

## [v0.1.7](https://github.com/wechaty/wechaty/tree/v0.1.7) (2016-06-18)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.1.3...v0.1.7)

## [v0.1.3](https://github.com/wechaty/wechaty/tree/v0.1.3) (2016-06-11)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.1.1...v0.1.3)

## [v0.1.1](https://github.com/wechaty/wechaty/tree/v0.1.1) (2016-06-09)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.1.0...v0.1.1)

## [v0.1.0](https://github.com/wechaty/wechaty/tree/v0.1.0) (2016-06-09)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.0.6...v0.1.0)

**Fixed bugs:**

- ding-dong bot broken due to typo [\#5](https://github.com/wechaty/wechaty/issues/5)

## [v0.0.6](https://github.com/wechaty/wechaty/tree/v0.0.6) (2016-05-15)
[Full Changelog](https://github.com/wechaty/wechaty/compare/v0.0.5...v0.0.6)

**Closed issues:**

- selenium-webdriver & phantomjs-prebuilt not work together under win32 [\#1](https://github.com/wechaty/wechaty/issues/1)

## [v0.0.5](https://github.com/wechaty/wechaty/tree/v0.0.5) (2016-05-11)
**Merged pull requests:**

- Add a Gitter chat badge to README.md [\#3](https://github.com/wechaty/wechaty/pull/3) ([gitter-badger](https://github.com/gitter-badger))



\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*
