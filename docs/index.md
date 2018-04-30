# Wechaty v0.15.26 Documentation
* https://blog.chatie.io

## Classes

<dl>
<dt><a href="#Wechaty">Wechaty</a></dt>
<dd><p>Main bot class.</p>
<p><a href="#wechatyinstance">The World&#39;s Shortest ChatBot Code: 6 lines of JavaScript</a></p>
<p><a href="https://github.com/lijiarui/wechaty-getting-started">Wechaty Starter Project</a></p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#WechatyEventName">WechatyEventName</a></dt>
<dd><p>Wechaty Class Event Type</p>
</dd>
<dt><a href="#WechatyEventFunction">WechatyEventFunction</a></dt>
<dd><p>Wechaty Class Event Function</p>
</dd>
</dl>

<a name="Wechaty"></a>

## Wechaty
Main bot class.

[The World's Shortest ChatBot Code: 6 lines of JavaScript](#wechatyinstance)

[Wechaty Starter Project](https://github.com/lijiarui/wechaty-getting-started)

**Kind**: global class  

* [Wechaty](#Wechaty)
    * _instance_
        * [.Contact](#Wechaty+Contact)
        * [.version([forceNpm])](#Wechaty+version) ⇒ <code>string</code>
        * [.on(event, listener)](#Wechaty+on) ⇒ [<code>Wechaty</code>](#Wechaty)
        * [.start()](#Wechaty+start) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.stop()](#Wechaty+stop) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logout()](#Wechaty+logout) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logonoff()](#Wechaty+logonoff) ⇒ <code>boolean</code>
        * ~~[.self()](#Wechaty+self)~~
        * [.userSelf()](#Wechaty+userSelf) ⇒ <code>Contact</code>
        * [.say(text)](#Wechaty+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * _static_
        * [.instance()](#Wechaty.instance)

<a name="Wechaty+Contact"></a>

### wechaty.Contact
Clone Classes for this bot and attach the `puppet` to the Class

Fixme:
  https://stackoverflow.com/questions/36886082/abstract-constructor-type-in-typescript
  https://github.com/Microsoft/TypeScript/issues/5843#issuecomment-290972055
  https://github.com/Microsoft/TypeScript/issues/19197

**Kind**: instance property of [<code>Wechaty</code>](#Wechaty)  
<a name="Wechaty+version"></a>

### wechaty.version([forceNpm]) ⇒ <code>string</code>
Return version of Wechaty

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Returns**: <code>string</code> - - the version number  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [forceNpm] | <code>boolean</code> | <code>false</code> | if set to true, will only return the version in package.json.                                      otherwise will return git commit hash if .git exists. |

**Example**  
```js
console.log(Wechaty.instance().version())       // return '#git[af39df]'
console.log(Wechaty.instance().version(true))   // return '0.7.9'
```
<a name="Wechaty+on"></a>

### wechaty.on(event, listener) ⇒ [<code>Wechaty</code>](#Wechaty)
**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Returns**: [<code>Wechaty</code>](#Wechaty) - - this for chain

More Example Gist: [Examples/Friend-Bot](https://github.com/wechaty/wechaty/blob/master/examples/friend-bot.ts)  

| Param | Type | Description |
| --- | --- | --- |
| event | [<code>WechatyEventName</code>](#WechatyEventName) | Emit WechatyEvent |
| listener | [<code>WechatyEventFunction</code>](#WechatyEventFunction) | Depends on the WechatyEvent |

**Example** *(Event:scan )*  
```js
wechaty.on('scan', (url: string, code: number) => {
  console.log(`[${code}] Scan ${url} to login.` )
})
```
**Example** *(Event:login )*  
```js
bot.on('login', (user: Contact) => {
  console.log(`user ${user} login`)
})
```
**Example** *(Event:logout )*  
```js
bot.on('logout', (user: Contact) => {
  console.log(`user ${user} logout`)
})
```
**Example** *(Event:message )*  
```js
wechaty.on('message', (message: Message) => {
  console.log(`message ${message} received`)
})
```
**Example** *(Event:friend )*  
```js
bot.on('friend', (contact: Contact, request: FriendRequest) => {
  if(request){ // 1. request to be friend from new contact
    let result = await request.accept()
      if(result){
        console.log(`Request from ${contact.name()} is accept succesfully!`)
      } else{
        console.log(`Request from ${contact.name()} failed to accept!`)
      }
	  } else { // 2. confirm friend ship
      console.log(`new friendship confirmed with ${contact.name()}`)
   }
 })
```
**Example** *(Event:room-join )*  
```js
bot.on('room-join', (room: Room, inviteeList: Contact[], inviter: Contact) => {
  const nameList = inviteeList.map(c => c.name()).join(',')
  console.log(`Room ${room.topic()} got new member ${nameList}, invited by ${inviter}`)
})
```
**Example** *(Event:room-leave )*  
```js
bot.on('room-leave', (room: Room, leaverList: Contact[]) => {
  const nameList = leaverList.map(c => c.name()).join(',')
  console.log(`Room ${room.topic()} lost member ${nameList}`)
})
```
**Example** *(Event:room-topic )*  
```js
bot.on('room-topic', (room: Room, topic: string, oldTopic: string, changer: Contact) => {
  console.log(`Room ${room.topic()} topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
})
```
<a name="Wechaty+start"></a>

### wechaty.start() ⇒ <code>Promise.&lt;void&gt;</code>
Start the bot, return Promise.

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.start()
// do other stuff with bot here
```
<a name="Wechaty+stop"></a>

### wechaty.stop() ⇒ <code>Promise.&lt;void&gt;</code>
Stop the bot

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.stop()
```
<a name="Wechaty+logout"></a>

### wechaty.logout() ⇒ <code>Promise.&lt;void&gt;</code>
Logout the bot

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.logout()
```
<a name="Wechaty+logonoff"></a>

### wechaty.logonoff() ⇒ <code>boolean</code>
Get the logon / logoff state

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
if (bot.logonoff()) {
  console.log('Bot logined')
} else {
  console.log('Bot not logined')
}
```
<a name="Wechaty+self"></a>

### ~~wechaty.self()~~
***Deprecated***

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
<a name="Wechaty+userSelf"></a>

### wechaty.userSelf() ⇒ <code>Contact</code>
Get current user

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
const contact = bot.userSelf()
console.log(`Bot is ${contact.name()}`)
```
<a name="Wechaty+say"></a>

### wechaty.say(text) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send message to filehelper

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  

| Param | Type |
| --- | --- |
| text | <code>string</code> | 

<a name="Wechaty.instance"></a>

### Wechaty.instance()
get the singleton instance of Wechaty

**Kind**: static method of [<code>Wechaty</code>](#Wechaty)  
**Example** *(The World&#x27;s Shortest ChatBot Code: 6 lines of JavaScript)*  
```js
const { Wechaty } = require('wechaty')

Wechaty.instance() // Singleton
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.on('message',  message => console.log(`Message: ${message}`))
.init()
```
<a name="AppMsgType"></a>

## AppMsgType : <code>enum</code>
Enum for AppMsgType values.

**Kind**: global enum  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| TEXT | <code>number</code> | AppMsgType.TEXT                     (1)     for TEXT |
| IMG | <code>number</code> | AppMsgType.IMG                      (2)      for IMG |
| AUDIO | <code>number</code> | AppMsgType.AUDIO                    (3)      for AUDIO |
| VIDEO | <code>number</code> | AppMsgType.VIDEO                    (4)      for VIDEO |
| URL | <code>number</code> | AppMsgType.URL                      (5)      for URL |
| ATTACH | <code>number</code> | AppMsgType.ATTACH                   (6)      for ATTACH |
| OPEN | <code>number</code> | AppMsgType.OPEN                     (7)      for OPEN |
| EMOJI | <code>number</code> | AppMsgType.EMOJI                    (8)      for EMOJI |
| VOICE_REMIND | <code>number</code> | AppMsgType.VOICE_REMIND             (9)      for VOICE_REMIND |
| SCAN_GOOD | <code>number</code> | AppMsgType.SCAN_GOOD                (10)     for SCAN_GOOD |
| GOOD | <code>number</code> | AppMsgType.GOOD                     (13)     for GOOD |
| EMOTION | <code>number</code> | AppMsgType.EMOTION                  (15)     for EMOTION |
| CARD_TICKET | <code>number</code> | AppMsgType.CARD_TICKET              (16)     for CARD_TICKET |
| REALTIME_SHARE_LOCATION | <code>number</code> | AppMsgType.REALTIME_SHARE_LOCATION  (17)     for REALTIME_SHARE_LOCATION |
| TRANSFERS | <code>number</code> | AppMsgType.TRANSFERS                (2e3)    for TRANSFERS |
| RED_ENVELOPES | <code>number</code> | AppMsgType.RED_ENVELOPES            (2001)   for RED_ENVELOPES |
| READER_TYPE | <code>number</code> | AppMsgType.READER_TYPE              (100001) for READER_TYPE |

<a name="MsgType"></a>

## MsgType : <code>enum</code>
Enum for MsgType values.

**Kind**: global enum  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| TEXT | <code>number</code> | MsgType.TEXT                (1)     for TEXT |
| IMAGE | <code>number</code> | MsgType.IMAGE               (3)     for IMAGE |
| VOICE | <code>number</code> | MsgType.VOICE               (34)    for VOICE |
| VERIFYMSG | <code>number</code> | MsgType.VERIFYMSG           (37)    for VERIFYMSG |
| POSSIBLEFRIEND_MSG | <code>number</code> | MsgType.POSSIBLEFRIEND_MSG  (40)    for POSSIBLEFRIEND_MSG |
| SHARECARD | <code>number</code> | MsgType.SHARECARD           (42)    for SHARECARD |
| VIDEO | <code>number</code> | MsgType.VIDEO               (43)    for VIDEO |
| EMOTICON | <code>number</code> | MsgType.EMOTICON            (47)    for EMOTICON |
| LOCATION | <code>number</code> | MsgType.LOCATION            (48)    for LOCATION |
| APP | <code>number</code> | MsgType.APP                 (49)    for APP |
| VOIPMSG | <code>number</code> | MsgType.VOIPMSG             (50)    for VOIPMSG |
| STATUSNOTIFY | <code>number</code> | MsgType.STATUSNOTIFY        (51)    for STATUSNOTIFY |
| VOIPNOTIFY | <code>number</code> | MsgType.VOIPNOTIFY          (52)    for VOIPNOTIFY |
| VOIPINVITE | <code>number</code> | MsgType.VOIPINVITE          (53)    for VOIPINVITE |
| MICROVIDEO | <code>number</code> | MsgType.MICROVIDEO          (62)    for MICROVIDEO |
| SYSNOTICE | <code>number</code> | MsgType.SYSNOTICE           (9999)  for SYSNOTICE |
| SYS | <code>number</code> | MsgType.SYS                 (10000) for SYS |
| RECALLED | <code>number</code> | MsgType.RECALLED            (10002) for RECALLED |

<a name="WechatyEventName"></a>

## WechatyEventName
Wechaty Class Event Type

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| error | <code>string</code> | When the bot get error, there will be a Wechaty error event fired. |
| login | <code>string</code> | After the bot login full successful, the event login will be emitted, with a Contact of current logined user. |
| logout | <code>string</code> | Logout will be emitted when bot detected log out, with a Contact of the current login user. |
| heartbeat | <code>string</code> | Get bot's heartbeat. |
| friend | <code>string</code> | When someone sends you a friend request, there will be a Wechaty friend event fired. |
| message | <code>string</code> | Emit when there's a new message. |
| room-join | <code>string</code> | Emit when anyone join any room. |
| room-topic | <code>string</code> | Get topic event, emitted when someone change room topic. |
| room-leave | <code>string</code> | Emit when anyone leave the room.<br>                                    If someone leaves the room by themselves, wechat will not notice other people in the room, so the bot will never get the "leave" event. |
| scan | <code>string</code> | A scan event will be emitted when the bot needs to show you a QR Code for scanning. |

<a name="WechatyEventFunction"></a>

## WechatyEventFunction
Wechaty Class Event Function

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| error | <code>function</code> | (this: Wechaty, error: Error) => void callback function |
| login | <code>function</code> | (this: Wechaty, user: Contact)=> void |
| logout | <code>function</code> | (this: Wechaty, user: Contact) => void |
| scan | <code>function</code> | (this: Wechaty, url: string, code: number) => void <br> <ol> <li>URL: {String} the QR code image URL</li> <li>code: {Number} the scan status code. some known status of the code list here is:</li> </ol> <ul> <li>0 initial_</li> <li>200 login confirmed</li> <li>201 scaned, wait for confirm</li> <li>408 waits for scan</li> </ul> |
| heartbeat | <code>function</code> | (this: Wechaty, data: any) => void |
| friend | <code>function</code> | (this: Wechaty, friend: Contact, request?: FriendRequest) => void |
| message | <code>function</code> | (this: Wechaty, message: Message) => void |
| room-join | <code>function</code> | (this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void |
| room-topic | <code>function</code> | (this: Wechaty, room: Room, topic: string, oldTopic: string, changer: Contact) => void |
| room-leave | <code>function</code> | (this: Wechaty, room: Room, leaverList: Contact[]) => void |

