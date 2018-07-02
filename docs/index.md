# Wechaty v0.17.60 Documentation

* <https://blog.chatie.io>


## Classes

<dl>
<dt><a href="#Wechaty">Wechaty</a></dt>
<dd><p>Main bot class.</p>
<p><a href="#wechatyinstance">The World&#39;s Shortest ChatBot Code: 6 lines of JavaScript</a></p>
<p><a href="https://github.com/lijiarui/wechaty-getting-started">Wechaty Starter Project</a></p>
</dd>
<dt><a href="#Room">Room</a></dt>
<dd><p>All wechat rooms(groups) will be encapsulated as a Room.</p>
<p><code>Room</code> is <code>Sayable</code>,
<a href="https://github.com/Chatie/wechaty/blob/master/examples/room-bot.ts">Examples/Room-Bot</a></p>
</dd>
<dt><a href="#Contact">Contact</a></dt>
<dd><p>All wechat contacts(friend) will be encapsulated as a Contact.</p>
<p><code>Contact</code> is <code>Sayable</code>,
<a href="https://github.com/Chatie/wechaty/blob/master/examples/contact-bot.ts">Examples/Contact-Bot</a></p>
</dd>
<dt><a href="#Friendship">Friendship</a></dt>
<dd><p>Send, receive friend request, and friend confirmation events.</p>
<ol>
<li>send request</li>
<li>receive request(in friend event)</li>
<li>confirmation friendship(friend event)</li>
</ol>
<p><a href="https://github.com/Chatie/wechaty/blob/master/examples/friend-bot.ts">Examples/Friend-Bot</a></p>
</dd>
<dt><a href="#Message">Message</a></dt>
<dd><p>All wechat messages will be encapsulated as a Message.</p>
<p><code>Message</code> is <code>Sayable</code>,
<a href="https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts">Examples/Ding-Dong-Bot</a></p>
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
<dt><a href="#RoomEventName">RoomEventName</a></dt>
<dd><p>Room Class Event Type</p>
</dd>
<dt><a href="#RoomEventFunction">RoomEventFunction</a></dt>
<dd><p>Room Class Event Function</p>
</dd>
<dt><a href="#MemberQueryFilter">MemberQueryFilter</a></dt>
<dd><p>The way to search member by Room.member()</p>
</dd>
<dt><a href="#ContactQueryFilter">ContactQueryFilter</a></dt>
<dd><p>The way to search Contact</p>
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
            * [.wechaty](#Wechaty+Contact.wechaty)
            * [.puppet](#Wechaty+Contact.puppet)
        * [.version([forceNpm])](#Wechaty+version) ⇒ <code>string</code>
        * [.on(event, listener)](#Wechaty+on) ⇒ [<code>Wechaty</code>](#Wechaty)
        * [.start()](#Wechaty+start) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.stop()](#Wechaty+stop) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logout()](#Wechaty+logout) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logonoff()](#Wechaty+logonoff) ⇒ <code>boolean</code>
        * ~~[.self()](#Wechaty+self)~~
        * [.userSelf()](#Wechaty+userSelf) ⇒ [<code>Contact</code>](#Contact)
        * [.say(textOrContactOrFile)](#Wechaty+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * _static_
        * [.instance()](#Wechaty.instance)

<a name="Wechaty+Contact"></a>

### wechaty.Contact
Clone Classes for this bot and attach the `puppet` to the Class

  https://stackoverflow.com/questions/36886082/abstract-constructor-type-in-typescript
  https://github.com/Microsoft/TypeScript/issues/5843#issuecomment-290972055
  https://github.com/Microsoft/TypeScript/issues/19197

**Kind**: instance property of [<code>Wechaty</code>](#Wechaty)  

* [.Contact](#Wechaty+Contact)
    * [.wechaty](#Wechaty+Contact.wechaty)
    * [.puppet](#Wechaty+Contact.puppet)

<a name="Wechaty+Contact.wechaty"></a>

#### Contact.wechaty
1. Set Wechaty

**Kind**: static property of [<code>Contact</code>](#Wechaty+Contact)  
<a name="Wechaty+Contact.puppet"></a>

#### Contact.puppet
2. Set Puppet

**Kind**: static property of [<code>Contact</code>](#Wechaty+Contact)  
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

More Example Gist: [Examples/Friend-Bot](https://github.com/Chatie/wechaty/blob/master/examples/friend-bot.ts)  

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
bot.on('login', (user: ContactSelf) => {
  console.log(`user ${user} login`)
})
```
**Example** *(Event:logout )*  
```js
bot.on('logout', (user: ContactSelf) => {
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
bot.on('friend', (request: Friendship) => {
  if(request.type === Friendship.Type.RECEIVE){ // 1. receive new friend request from new contact
    const contact = request.contact()
    let result = await request.accept()
      if(result){
        console.log(`Request from ${contact.name()} is accept succesfully!`)
      } else{
        console.log(`Request from ${contact.name()} failed to accept!`)
      }
	  } else if (request.type === Friendship.Type.CONFIRM) { // 2. confirm friend ship
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

### wechaty.userSelf() ⇒ [<code>Contact</code>](#Contact)
Get current user

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
const contact = bot.userSelf()
console.log(`Bot is ${contact.name()}`)
```
<a name="Wechaty+say"></a>

### wechaty.say(textOrContactOrFile) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send message to userSelf

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  

| Param | Type |
| --- | --- |
| textOrContactOrFile | <code>string</code> | 

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
<a name="Room"></a>

## Room
All wechat rooms(groups) will be encapsulated as a Room.

`Room` is `Sayable`,
[Examples/Room-Bot](https://github.com/Chatie/wechaty/blob/master/examples/room-bot.ts)

**Kind**: global class  

* [Room](#Room)
    * _instance_
        * [.say(textOrContactOrFile, [replyTo])](#Room+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.on(event, listener)](#Room+on) ⇒ <code>this</code>
        * [.add(contact)](#Room+add) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.del(contact)](#Room+del) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.topic([newTopic])](#Room+topic) ⇒ <code>Promise.&lt;(string\|void)&gt;</code>
        * [.qrcode()](#Room+qrcode)
        * [.alias(contact)](#Room+alias) ⇒ <code>string</code> \| <code>null</code>
        * [.roomAlias(contact)](#Room+roomAlias) ⇒ <code>string</code> \| <code>null</code>
        * [.has(contact)](#Room+has) ⇒ <code>boolean</code>
        * [.memberAll(query)](#Room+memberAll) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
        * [.member(queryArg)](#Room+member) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
        * [.memberList()](#Room+memberList) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
        * [.sync()](#Room+sync) ⇒ <code>Promise.&lt;void&gt;</code>
    * _static_
        * [.create(contactList, [topic])](#Room.create) ⇒ [<code>Promise.&lt;Room&gt;</code>](#Room)
        * [.findAll([query])](#Room.findAll) ⇒ <code>Promise.&lt;Array.&lt;Room&gt;&gt;</code>
        * [.find(query)](#Room.find) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>

<a name="Room+say"></a>

### room.say(textOrContactOrFile, [replyTo]) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send message inside Room, if set [replyTo], wechaty will mention the contact as well.

**Kind**: instance method of [<code>Room</code>](#Room)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - If bot send message successfully, it will return true. If the bot failed to send for blocking or any other reason, it will return false  

| Param | Type | Description |
| --- | --- | --- |
| textOrContactOrFile | <code>string</code> \| <code>MediaMessage</code> | Send `text` or `media file` inside Room. |
| [replyTo] | [<code>Contact</code>](#Contact) \| [<code>Array.&lt;Contact&gt;</code>](#Contact) | Optional parameter, send content inside Room, and mention @replyTo contact or contactList. |

**Example** *(Send text inside Room)*  
```js
const room = await Room.find({name: 'wechaty'})        // change 'wechaty' to any of your room in wechat
await room.say('Hello world!')
```
**Example** *(Send media file inside Room)*  
```js
const room = await Room.find({name: 'wechaty'})        // change 'wechaty' to any of your room in wechat
await room.say(new MediaMessage('/test.jpg'))          // put the filePath you want to send here
```
**Example** *(Send text inside Room, and mention @replyTo contact)*  
```js
const contact = await Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any of the room member
const room = await Room.find({name: 'wechaty'})        // change 'wechaty' to any of your room in wechat
await room.say('Hello world!', contact)
```
<a name="Room+on"></a>

### room.on(event, listener) ⇒ <code>this</code>
**Kind**: instance method of [<code>Room</code>](#Room)  
**Returns**: <code>this</code> - - this for chain  

| Param | Type | Description |
| --- | --- | --- |
| event | [<code>RoomEventName</code>](#RoomEventName) | Emit WechatyEvent |
| listener | [<code>RoomEventFunction</code>](#RoomEventFunction) | Depends on the WechatyEvent |

**Example** *(Event:join )*  
```js
const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
if (room) {
  room.on('join', (room: Room, inviteeList: Contact[], inviter: Contact) => {
    const nameList = inviteeList.map(c => c.name()).join(',')
    console.log(`Room ${room.topic()} got new member ${nameList}, invited by ${inviter}`)
  })
}
```
**Example** *(Event:leave )*  
```js
const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
if (room) {
  room.on('leave', (room: Room, leaverList: Contact[]) => {
    const nameList = leaverList.map(c => c.name()).join(',')
    console.log(`Room ${room.topic()} lost member ${nameList}`)
  })
}
```
**Example** *(Event:topic )*  
```js
const room = await Room.find({topic: 'event-room'}) // change `event-room` to any room topic in your wechat
if (room) {
  room.on('topic', (room: Room, topic: string, oldTopic: string, changer: Contact) => {
    console.log(`Room ${room.topic()} topic changed from ${oldTopic} to ${topic} by ${changer.name()}`)
  })
}
```
<a name="Room+add"></a>

### room.add(contact) ⇒ <code>Promise.&lt;number&gt;</code>
Add contact in a room

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example**  
```js
const contact = await Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any contact in your wechat
const room = await Room.find({topic: 'wechat'})        // change 'wechat' to any room topic in your wechat
if (room) {
  const result = await room.add(contact)
  if (result) {
    console.log(`add ${contact.name()} to ${room.topic()} successfully! `)
  } else{
    console.log(`failed to add ${contact.name()} to ${room.topic()}! `)
  }
}
```
<a name="Room+del"></a>

### room.del(contact) ⇒ <code>Promise.&lt;number&gt;</code>
Delete a contact from the room
It works only when the bot is the owner of the room

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example**  
```js
const room = await Room.find({topic: 'wechat'})          // change 'wechat' to any room topic in your wechat
const contact = await Contact.find({name: 'lijiarui'})   // change 'lijiarui' to any room member in the room you just set
if (room) {
  const result = await room.del(contact)
  if (result) {
    console.log(`remove ${contact.name()} from ${room.topic()} successfully! `)
  } else{
    console.log(`failed to remove ${contact.name()} from ${room.topic()}! `)
  }
}
```
<a name="Room+topic"></a>

### room.topic([newTopic]) ⇒ <code>Promise.&lt;(string\|void)&gt;</code>
SET/GET topic from the room

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| [newTopic] | <code>string</code> | If set this para, it will change room topic. |

**Example** *(When you say anything in a room, it will get room topic. )*  
```js
const bot = Wechaty.instance()
bot
.on('message', async m => {
  const room = m.room()
  if (room) {
    const topic = await room.topic()
    console.log(`room topic is : ${topic}`)
  }
})
```
**Example** *(When you say anything in a room, it will change room topic. )*  
```js
const bot = Wechaty.instance()
bot
.on('message', async m => {
  const room = m.room()
  if (room) {
    const oldTopic = room.topic()
    room.topic('change topic to wechaty!')
    console.log(`room topic change from ${oldTopic} to ${room.topic()}`)
  }
})
```
<a name="Room+qrcode"></a>

### room.qrcode()
Room QR Code

**Kind**: instance method of [<code>Room</code>](#Room)  
<a name="Room+alias"></a>

### room.alias(contact) ⇒ <code>string</code> \| <code>null</code>
Return contact's roomAlias in the room, the same as roomAlias

**Kind**: instance method of [<code>Room</code>](#Room)  
**Returns**: <code>string</code> \| <code>null</code> - - If a contact has an alias in room, return string, otherwise return null  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example**  
```js
const bot = Wechaty.instance()
bot
.on('message', async m => {
  const room = m.room()
  const contact = m.from()
  if (room) {
    const alias = room.alias(contact)
    console.log(`${contact.name()} alias is ${alias}`)
  }
})
```
<a name="Room+roomAlias"></a>

### room.roomAlias(contact) ⇒ <code>string</code> \| <code>null</code>
Same as function alias

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

<a name="Room+has"></a>

### room.has(contact) ⇒ <code>boolean</code>
Check if the room has member `contact`, the return is a Promise and must be `await`-ed

**Kind**: instance method of [<code>Room</code>](#Room)  
**Returns**: <code>boolean</code> - Return `true` if has contact, else return `false`.  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example** *(Check whether &#x27;lijiarui&#x27; is in the room &#x27;wechaty&#x27;)*  
```js
const contact = await Contact.find({name: 'lijiarui'})   // change 'lijiarui' to any of contact in your wechat
const room = await Room.find({topic: 'wechaty'})         // change 'wechaty' to any of the room in your wechat
if (contact && room) {
  if (await room.has(contact)) {
    console.log(`${contact.name()} is in the room ${room.topic()}!`)
  } else {
    console.log(`${contact.name()} is not in the room ${room.topic()} !`)
  }
}
```
<a name="Room+memberAll"></a>

### room.memberAll(query) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
Find all contacts in a room

#### definition
- `name`                 the name-string set by user-self, should be called name, equal to `Contact.name()`
- `roomAlias`            the name-string set by user-self in the room, should be called roomAlias
- `contactAlias`         the name-string set by bot for others, should be called alias, equal to `Contact.alias()`

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>RoomMemberQueryFilter</code> \| <code>string</code> | When use memberAll(name:string), return all matched members, including name, roomAlias, contactAlias |

<a name="Room+member"></a>

### room.member(queryArg) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
Find all contacts in a room, if get many, return the first one.

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| queryArg | <code>RoomMemberQueryFilter</code> \| <code>string</code> | When use member(name:string), return all matched members, including name, roomAlias, contactAlias |

**Example** *(Find member by name)*  
```js
const room = await Room.find({topic: 'wechaty'})           // change 'wechaty' to any room name in your wechat
if (room) {
  const member = room.member('lijiarui')                   // change 'lijiarui' to any room member in your wechat
  if (member) {
    console.log(`${room.topic()} got the member: ${member.name()}`)
  } else {
    console.log(`cannot get member in room: ${room.topic()}`)
  }
}
```
**Example** *(Find member by MemberQueryFilter)*  
```js
const room = await Room.find({topic: 'wechaty'})          // change 'wechaty' to any room name in your wechat
if (room) {
  const member = room.member({name: 'lijiarui'})          // change 'lijiarui' to any room member in your wechat
  if (member) {
    console.log(`${room.topic()} got the member: ${member.name()}`)
  } else {
    console.log(`cannot get member in room: ${room.topic()}`)
  }
}
```
<a name="Room+memberList"></a>

### room.memberList() ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
Get all room member from the room

**Kind**: instance method of [<code>Room</code>](#Room)  
<a name="Room+sync"></a>

### room.sync() ⇒ <code>Promise.&lt;void&gt;</code>
Sync data for Room

**Kind**: instance method of [<code>Room</code>](#Room)  
<a name="Room.create"></a>

### Room.create(contactList, [topic]) ⇒ [<code>Promise.&lt;Room&gt;</code>](#Room)
Create a new room.

**Kind**: static method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| contactList | [<code>Array.&lt;Contact&gt;</code>](#Contact) | 
| [topic] | <code>string</code> | 

**Example** *(Creat a room with &#x27;lijiarui&#x27; and &#x27;juxiaomi&#x27;, the room topic is &#x27;ding - created&#x27;)*  
```js
const helperContactA = await Contact.find({ name: 'lijiarui' })  // change 'lijiarui' to any contact in your wechat
const helperContactB = await Contact.find({ name: 'juxiaomi' })  // change 'juxiaomi' to any contact in your wechat
const contactList = [helperContactA, helperContactB]
console.log('Bot', 'contactList: %s', contactList.join(','))
const room = await Room.create(contactList, 'ding')
console.log('Bot', 'createDingRoom() new ding room created: %s', room)
await room.topic('ding - created')
await room.say('ding - created')
```
<a name="Room.findAll"></a>

### Room.findAll([query]) ⇒ <code>Promise.&lt;Array.&lt;Room&gt;&gt;</code>
Find room by topic, return all the matched room

**Kind**: static method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| [query] | <code>RoomQueryFilter</code> | 

**Example**  
```js
const roomList = await Room.findAll()                    // get the room list of the bot
const roomList = await Room.findAll({name: 'wechaty'})   // find all of the rooms with name 'wechaty'
```
<a name="Room.find"></a>

### Room.find(query) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>
Try to find a room by filter: {topic: string | RegExp}. If get many, return the first one.

**Kind**: static method of [<code>Room</code>](#Room)  
**Returns**: <code>Promise.&lt;(Room\|null)&gt;</code> - If can find the room, return Room, or return null  

| Param | Type |
| --- | --- |
| query | <code>RoomQueryFilter</code> | 

<a name="Contact"></a>

## Contact
All wechat contacts(friend) will be encapsulated as a Contact.

`Contact` is `Sayable`,
[Examples/Contact-Bot](https://github.com/Chatie/wechaty/blob/master/examples/contact-bot.ts)

**Kind**: global class  

* [Contact](#Contact)
    * _instance_
        * [.payload](#Contact+payload)
        * [.name()](#Contact+name) ⇒ <code>string</code>
        * [.alias(newAlias)](#Contact+alias) ⇒ <code>string</code> \| <code>null</code> \| <code>Promise.&lt;boolean&gt;</code>
        * ~~[.stranger()](#Contact+stranger) ⇒ <code>boolean</code> \| <code>null</code>~~
        * [.friend()](#Contact+friend) ⇒ <code>boolean</code> \| <code>null</code>
        * ~~[.official()](#Contact+official) ⇒ <code>boolean</code> \| <code>null</code>~~
        * ~~[.personal()](#Contact+personal) ⇒ <code>boolean</code>~~
        * [.type()](#Contact+type) ⇒
        * [.star()](#Contact+star) ⇒ <code>boolean</code> \| <code>null</code>
        * [.gender()](#Contact+gender) ⇒ <code>ContactGender.Male(2)</code> \| <code>Gender.Female(1)</code> \| <code>Gender.Unknown(0)</code>
        * [.province()](#Contact+province) ⇒ <code>string</code> \| <code>null</code>
        * [.city()](#Contact+city) ⇒ <code>string</code> \| <code>null</code>
        * [.avatar()](#Contact+avatar) ⇒ <code>Promise.&lt;FileBox&gt;</code>
        * ~~[.refresh()](#Contact+refresh) ⇒ <code>Promise.&lt;this&gt;</code>~~
        * [.sync()](#Contact+sync) ⇒ <code>Promise.&lt;this&gt;</code>
        * [.self()](#Contact+self) ⇒ <code>boolean</code>
    * _static_
        * [.find(query)](#Contact.find) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
        * [.findAll([queryArg])](#Contact.findAll) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>

<a name="Contact+payload"></a>

### contact.payload
Instance properties

**Kind**: instance property of [<code>Contact</code>](#Contact)  
<a name="Contact+name"></a>

### contact.name() ⇒ <code>string</code>
Get the name from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const name = contact.name()
```
<a name="Contact+alias"></a>

### contact.alias(newAlias) ⇒ <code>string</code> \| <code>null</code> \| <code>Promise.&lt;boolean&gt;</code>
GET / SET / DELETE the alias for a contact

Tests show it will failed if set alias too frequently(60 times in one minute).

**Kind**: instance method of [<code>Contact</code>](#Contact)  

| Param | Type |
| --- | --- |
| newAlias | <code>none</code> \| <code>string</code> \| <code>null</code> | 

**Example** *( GET the alias for a contact, return {(string | null)})*  
```js
const alias = contact.alias()
if (alias === null) {
  console.log('You have not yet set any alias for contact ' + contact.name())
} else {
  console.log('You have already set an alias for contact ' + contact.name() + ':' + alias)
}
```
**Example** *(SET the alias for a contact)*  
```js
try {
  await contact.alias('lijiarui')
  console.log(`change ${contact.name()}'s alias successfully!`)
} catch (e) {
  console.log(`failed to change ${contact.name()} alias!`)
}
```
**Example** *(DELETE the alias for a contact)*  
```js
try {
  const oldAlias = await contact.alias(null)
  console.log(`delete ${contact.name()}'s alias successfully!`)
  console.log('old alias is ${oldAlias}`)
} catch (e) {
  console.log(`failed to delete ${contact.name()}'s alias!`)
}
```
<a name="Contact+stranger"></a>

### ~~contact.stranger() ⇒ <code>boolean</code> \| <code>null</code>~~
***Deprecated***

Check if contact is stranger

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - - True for not friend of the bot, False for friend of the bot, null for unknown.  
**Example**  
```js
const isStranger = contact.stranger()
```
<a name="Contact+friend"></a>

### contact.friend() ⇒ <code>boolean</code> \| <code>null</code>
Check if contact is friend

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - - True for friend of the bot, False for not friend of the bot, null for unknown.  
**Example**  
```js
const isFriend = contact.friend()
```
<a name="Contact+official"></a>

### ~~contact.official() ⇒ <code>boolean</code> \| <code>null</code>~~
***Deprecated***

Check if it's a offical account

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - - True for official account, Flase for contact is not a official account, null for unknown  
**See**

- [webwxApp.js#L324](https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3243)
- [Urinx/WeixinBot/README](https://github.com/Urinx/WeixinBot/blob/master/README.md)

**Example**  
```js
const isOfficial = contact.official()
```
<a name="Contact+personal"></a>

### ~~contact.personal() ⇒ <code>boolean</code>~~
***Deprecated***

Check if it's a personal account

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> - - True for personal account, Flase for contact is not a personal account  
**Example**  
```js
const isPersonal = contact.personal()
```
<a name="Contact+type"></a>

### contact.type() ⇒
Return the type of the Contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: ContactType - Contact.Type.PERSONAL for personal account, Contact.Type.OFFICIAL for official account  
**Example**  
```js
const isOfficial = contact.type() === Contact.Type.OFFICIAL
```
<a name="Contact+star"></a>

### contact.star() ⇒ <code>boolean</code> \| <code>null</code>
Check if the contact is star contact.

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - - True for star friend, False for no star friend.  
**Example**  
```js
const isStar = contact.star()
```
<a name="Contact+gender"></a>

### contact.gender() ⇒ <code>ContactGender.Male(2)</code> \| <code>Gender.Female(1)</code> \| <code>Gender.Unknown(0)</code>
Contact gender

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const gender = contact.gender()
```
<a name="Contact+province"></a>

### contact.province() ⇒ <code>string</code> \| <code>null</code>
Get the region 'province' from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const province = contact.province()
```
<a name="Contact+city"></a>

### contact.city() ⇒ <code>string</code> \| <code>null</code>
Get the region 'city' from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const city = contact.city()
```
<a name="Contact+avatar"></a>

### contact.avatar() ⇒ <code>Promise.&lt;FileBox&gt;</code>
Get avatar picture file stream

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const avatarFileName = contact.name() + `.jpg`
const fileBox = await contact.avatar()
const avatarWriteStream = createWriteStream(avatarFileName)
fileBox.pipe(avatarWriteStream)
log.info('Bot', 'Contact: %s: %s with avatar file: %s', contact.weixin(), contact.name(), avatarFileName)
```
<a name="Contact+refresh"></a>

### ~~contact.refresh() ⇒ <code>Promise.&lt;this&gt;</code>~~
***Deprecated***

Force reload(re-ready()) data for Contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
await contact.refresh()
```
<a name="Contact+sync"></a>

### contact.sync() ⇒ <code>Promise.&lt;this&gt;</code>
sycc data for Contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
await contact.sync()
```
<a name="Contact+self"></a>

### contact.self() ⇒ <code>boolean</code>
Check if contact is self

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> - True for contact is self, False for contact is others  
**Example**  
```js
const isSelf = contact.self()
```
<a name="Contact.find"></a>

### Contact.find(query) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
Try to find a contact by filter: {name: string | RegExp} / {alias: string | RegExp}

Find contact by name or alias, if the result more than one, return the first one.

**Kind**: static method of [<code>Contact</code>](#Contact)  
**Returns**: <code>Promise.&lt;(Contact\|null)&gt;</code> - If can find the contact, return Contact, or return null  

| Param | Type |
| --- | --- |
| query | [<code>ContactQueryFilter</code>](#ContactQueryFilter) | 

**Example**  
```js
const contactFindByName = await Contact.find({ name:"ruirui"} )
const contactFindByAlias = await Contact.find({ alias:"lijiarui"} )
```
<a name="Contact.findAll"></a>

### Contact.findAll([queryArg]) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
Find contact by `name` or `alias`

If use Contact.findAll() get the contact list of the bot.

#### definition
- `name`   the name-string set by user-self, should be called name
- `alias`  the name-string set by bot for others, should be called alias

**Kind**: static method of [<code>Contact</code>](#Contact)  

| Param | Type |
| --- | --- |
| [queryArg] | [<code>ContactQueryFilter</code>](#ContactQueryFilter) | 

**Example**  
```js
const contactList = await Contact.findAll()                    // get the contact list of the bot
const contactList = await Contact.findAll({name: 'ruirui'})    // find allof the contacts whose name is 'ruirui'
const contactList = await Contact.findAll({alias: 'lijiarui'}) // find all of the contacts whose alias is 'lijiarui'
```
<a name="Friendship"></a>

## Friendship
Send, receive friend request, and friend confirmation events.

1. send request
2. receive request(in friend event)
3. confirmation friendship(friend event)

[Examples/Friend-Bot](https://github.com/Chatie/wechaty/blob/master/examples/friend-bot.ts)

**Kind**: global class  

* [Friendship](#Friendship)
    * _instance_
        * [.payload](#Friendship+payload)
        * [.ready()](#Friendship+ready)
    * _static_
        * ~~[.send()](#Friendship.send)~~
        * [.add(contact, hello)](#Friendship.add)

<a name="Friendship+payload"></a>

### friendship.payload
Instance Properties

**Kind**: instance property of [<code>Friendship</code>](#Friendship)  
<a name="Friendship+ready"></a>

### friendship.ready()
no `dirty` support because Friendship has no rawPayload(yet)

**Kind**: instance method of [<code>Friendship</code>](#Friendship)  
<a name="Friendship.send"></a>

### ~~Friendship.send()~~
***Deprecated***

**Kind**: static method of [<code>Friendship</code>](#Friendship)  
<a name="Friendship.add"></a>

### Friendship.add(contact, hello)
Send a Friend Request to a `contact` with message `hello`.

**Kind**: static method of [<code>Friendship</code>](#Friendship)  

| Param |
| --- |
| contact | 
| hello | 

<a name="Message"></a>

## Message
All wechat messages will be encapsulated as a Message.

`Message` is `Sayable`,
[Examples/Ding-Dong-Bot](https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts)

**Kind**: global class  

* [Message](#Message)
    * _instance_
        * [.payload](#Message+payload)
        * [.from()](#Message+from) ⇒ [<code>Contact</code>](#Contact)
        * [.to()](#Message+to) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
        * [.room()](#Message+room) ⇒ [<code>Room</code>](#Room) \| <code>null</code>
        * ~~[.content()](#Message+content)~~
        * [.text()](#Message+text) ⇒ <code>string</code>
        * [.say(textOrContactOrFile, [mention])](#Message+say) ⇒ <code>Promise.&lt;void&gt;</code>
        * ~~[.file()](#Message+file)~~
        * [.type()](#Message+type) ⇒ <code>WebMsgType</code>
        * [.self()](#Message+self) ⇒ <code>boolean</code>
        * [.mention()](#Message+mention) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
        * [.mentioned()](#Message+mentioned)
        * [.forward(to)](#Message+forward) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.age()](#Message+age)
    * _static_
        * [.Type](#Message.Type)
        * [.find()](#Message.find)
        * [.findAll()](#Message.findAll)
        * [.create()](#Message.create)

<a name="Message+payload"></a>

### message.payload
Instance Properties

**Kind**: instance property of [<code>Message</code>](#Message)  
<a name="Message+from"></a>

### message.from() ⇒ [<code>Contact</code>](#Contact)
Get the sender from a message.

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+to"></a>

### message.to() ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
Get the destination of the message
Message.to() will return null if a message is in a room, use Message.room() to get the room.

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+room"></a>

### message.room() ⇒ [<code>Room</code>](#Room) \| <code>null</code>
Get the room from the message.
If the message is not in a room, then will return `null`

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+content"></a>

### ~~message.content()~~
***Deprecated***

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+text"></a>

### message.text() ⇒ <code>string</code>
Get the text content of the message

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+say"></a>

### message.say(textOrContactOrFile, [mention]) ⇒ <code>Promise.&lt;void&gt;</code>
Reply a Text or Media File message to the sender.

**Kind**: instance method of [<code>Message</code>](#Message)  
**See**: [Examples/ding-dong-bot](https://github.com/Chatie/wechaty/blob/master/examples/ding-dong-bot.ts)  

| Param | Type |
| --- | --- |
| textOrContactOrFile | <code>string</code> \| <code>FileBox</code> | 
| [mention] | [<code>Contact</code>](#Contact) \| [<code>Array.&lt;Contact&gt;</code>](#Contact) | 

**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  if (/^ding$/i.test(m.text())) {
    await m.say('hello world')
    console.log('Bot REPLY: hello world')
    await m.say(new bot.Message(__dirname + '/wechaty.png'))
    console.log('Bot REPLY: Image')
  }
})
```
<a name="Message+file"></a>

### ~~message.file()~~
***Deprecated***

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+type"></a>

### message.type() ⇒ <code>WebMsgType</code>
Get the type from the message.

If type is equal to `MsgType.RECALLED`, [Message#id](Message#id) is the msgId of the recalled message.

**Kind**: instance method of [<code>Message</code>](#Message)  
**See**: [MsgType](MsgType)  
<a name="Message+self"></a>

### message.self() ⇒ <code>boolean</code>
Check if a message is sent by self.

**Kind**: instance method of [<code>Message</code>](#Message)  
**Returns**: <code>boolean</code> - - Return `true` for send from self, `false` for send from others.  
**Example**  
```js
if (message.self()) {
 console.log('this message is sent by myself!')
}
```
<a name="Message+mention"></a>

### message.mention() ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
Get message mentioned contactList.

Message event table as follows

|                                                                            | Web  |  Mac PC Client | iOS Mobile |  android Mobile |
| :---                                                                       | :--: |     :----:     |   :---:    |     :---:       |
| [You were mentioned] tip ([有人@我]的提示)                                   |  ✘   |        √       |     √      |       √         |
| Identify magic code (8197) by copy & paste in mobile                       |  ✘   |        √       |     √      |       ✘         |
| Identify magic code (8197) by programming                                  |  ✘   |        ✘       |     ✘      |       ✘         |
| Identify two contacts with the same roomAlias by [You were  mentioned] tip |  ✘   |        ✘       |     √      |       √         |

**Kind**: instance method of [<code>Message</code>](#Message)  
**Returns**: [<code>Array.&lt;Contact&gt;</code>](#Contact) - - Return message mentioned contactList  
**Example**  
```js
const contactList = message.mentioned()
console.log(contactList)
```
<a name="Message+mentioned"></a>

### message.mentioned()
**Kind**: instance method of [<code>Message</code>](#Message)  
**Deprecated:**: use mention() instead  
<a name="Message+forward"></a>

### message.forward(to) ⇒ <code>Promise.&lt;void&gt;</code>
Forward the received message.

**Kind**: instance method of [<code>Message</code>](#Message)  

| Param | Type | Description |
| --- | --- | --- |
| to | <code>Sayable</code> \| <code>Array.&lt;Sayable&gt;</code> | Room or Contact The recipient of the message, the room, or the contact |

<a name="Message+age"></a>

### message.age()
Message Age:
 in seconds.

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message.Type"></a>

### Message.Type
Static Properties

**Kind**: static property of [<code>Message</code>](#Message)  
<a name="Message.find"></a>

### Message.find()
**Kind**: static method of [<code>Message</code>](#Message)  
**Todo**

- [ ] add function

<a name="Message.findAll"></a>

### Message.findAll()
**Kind**: static method of [<code>Message</code>](#Message)  
**Todo**

- [ ] add function

<a name="Message.create"></a>

### Message.create()
Create a Mobile Terminated Message

"mobile originated" or "mobile terminated"
https://www.tatango.com/resources/video-lessons/video-mo-mt-sms-messaging/

**Kind**: static method of [<code>Message</code>](#Message)  
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
| login | <code>function</code> | (this: Wechaty, user: ContactSelf)=> void |
| logout | <code>function</code> | (this: Wechaty, user: ContactSelf) => void |
| scan | <code>function</code> | (this: Wechaty, url: string, code: number) => void <br> <ol> <li>URL: {String} the QR code image URL</li> <li>code: {Number} the scan status code. some known status of the code list here is:</li> </ol> <ul> <li>0 initial_</li> <li>200 login confirmed</li> <li>201 scaned, wait for confirm</li> <li>408 waits for scan</li> </ul> |
| heartbeat | <code>function</code> | (this: Wechaty, data: any) => void |
| friend | <code>function</code> | (this: Wechaty, request?: Friendship) => void |
| message | <code>function</code> | (this: Wechaty, message: Message) => void |
| room-join | <code>function</code> | (this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void |
| room-topic | <code>function</code> | (this: Wechaty, room: Room, newTopic: string, oldTopic: string, changer: Contact) => void |
| room-leave | <code>function</code> | (this: Wechaty, room: Room, leaverList: Contact[]) => void |

<a name="RoomEventName"></a>

## RoomEventName
Room Class Event Type

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| join | <code>string</code> | Emit when anyone join any room. |
| topic | <code>string</code> | Get topic event, emitted when someone change room topic. |
| leave | <code>string</code> | Emit when anyone leave the room.<br>                               If someone leaves the room by themselves, wechat will not notice other people in the room, so the bot will never get the "leave" event. |

<a name="RoomEventFunction"></a>

## RoomEventFunction
Room Class Event Function

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| room-join | <code>function</code> | (this: Room, inviteeList: Contact[] , inviter: Contact)  => void |
| room-topic | <code>function</code> | (this: Room, topic: string, oldTopic: string, changer: Contact) => void |
| room-leave | <code>function</code> | (this: Room, leaver: Contact) => void |

<a name="MemberQueryFilter"></a>

## MemberQueryFilter
The way to search member by Room.member()

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Find the contact by wechat name in a room, equal to `Contact.name()`. |
| roomAlias | <code>string</code> | Find the contact by alias set by the bot for others in a room. |
| contactAlias | <code>string</code> | Find the contact by alias set by the contact out of a room, equal to `Contact.alias()`. [More Detail](https://github.com/Chatie/wechaty/issues/365) |

<a name="ContactQueryFilter"></a>

## ContactQueryFilter
The way to search Contact

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name-string set by user-self, should be called name |
| alias | <code>string</code> | The name-string set by bot for others, should be called alias [More Detail](https://github.com/Chatie/wechaty/issues/365) |

