# Wechaty v0.13.50 Documentation

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
<a href="https://github.com/Chatie/wechaty/blob/master/example/room-bot.ts">Example/Room-Bot</a></p>
</dd>
<dt><a href="#Contact">Contact</a></dt>
<dd><p>All wechat contacts(friend) will be encapsulated as a Contact.</p>
<p><code>Contact</code> is <code>Sayable</code>,
<a href="https://github.com/Chatie/wechaty/blob/master/example/contact-bot.ts">Example/Contact-Bot</a></p>
</dd>
<dt><a href="#FriendRequest">FriendRequest</a></dt>
<dd><p>Send, receive friend request, and friend confirmation events.</p>
<ol>
<li>send request</li>
<li>receive request(in friend event)</li>
<li>confirmation friendship(friend event)</li>
</ol>
<p><a href="https://github.com/Chatie/wechaty/blob/master/example/friend-bot.ts">Example/Friend-Bot</a></p>
</dd>
<dt><a href="#Message">Message</a></dt>
<dd><p>All wechat messages will be encapsulated as a Message.</p>
<p><code>Message</code> is <code>Sayable</code>,
<a href="https://github.com/Chatie/wechaty/blob/master/example/ding-dong-bot.ts">Example/Ding-Dong-Bot</a></p>
</dd>
<dt><a href="#MediaMessage">MediaMessage</a></dt>
<dd><p>Meidia Type Message</p>
</dd>
<dt><a href="#FriendRequest">FriendRequest</a></dt>
<dd></dd>
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
        * [.version([forceNpm])](#Wechaty+version) ⇒ <code>string</code>
        * ~~[.init()](#Wechaty+init) ⇒ <code>Promise.&lt;void&gt;</code>~~
        * [.start()](#Wechaty+start) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.on(event, listener)](#Wechaty+on) ⇒ [<code>Wechaty</code>](#Wechaty)
        * ~~[.quit()](#Wechaty+quit) ⇒ <code>Promise.&lt;void&gt;</code>~~
        * [.stop()](#Wechaty+stop) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logout()](#Wechaty+logout) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logonoff()](#Wechaty+logonoff) ⇒ <code>boolean</code>
        * [.self()](#Wechaty+self) ⇒ [<code>Contact</code>](#Contact)
        * [.say(content)](#Wechaty+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * _static_
        * [.instance()](#Wechaty.instance)

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
<a name="Wechaty+init"></a>

### ~~wechaty.init() ⇒ <code>Promise.&lt;void&gt;</code>~~
***Deprecated***

Initialize the bot, return Promise.

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.init()
// do other stuff with bot here
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
<a name="Wechaty+on"></a>

### wechaty.on(event, listener) ⇒ [<code>Wechaty</code>](#Wechaty)
**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Returns**: [<code>Wechaty</code>](#Wechaty) - - this for chain

More Example Gist: [Example/Friend-Bot](https://github.com/wechaty/wechaty/blob/master/example/friend-bot.ts)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>WechatyEvent</code> | Emit WechatyEvent |
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
<a name="Wechaty+quit"></a>

### ~~wechaty.quit() ⇒ <code>Promise.&lt;void&gt;</code>~~
***Deprecated***

Quit the bot

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.quit()
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

### wechaty.self() ⇒ [<code>Contact</code>](#Contact)
Get current user

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
const contact = bot.self()
console.log(`Bot is ${contact.name()}`)
```
<a name="Wechaty+say"></a>

### wechaty.say(content) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send message to filehelper

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  

| Param | Type |
| --- | --- |
| content | <code>string</code> | 

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
[Example/Room-Bot](https://github.com/Chatie/wechaty/blob/master/example/room-bot.ts)

**Kind**: global class  

* [Room](#Room)
    * _instance_
        * [.say(textOrMedia, [replyTo])](#Room+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.on(event, listener)](#Room+on) ⇒ <code>this</code>
        * [.add(contact)](#Room+add) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.del(contact)](#Room+del) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.topic([newTopic])](#Room+topic) ⇒ <code>string</code> \| <code>void</code>
        * [.alias(contact)](#Room+alias) ⇒ <code>string</code> \| <code>null</code>
        * [.roomAlias(contact)](#Room+roomAlias) ⇒ <code>string</code> \| <code>null</code>
        * [.has(contact)](#Room+has) ⇒ <code>boolean</code>
        * [.memberAll(queryArg)](#Room+memberAll) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
        * [.member(queryArg)](#Room+member) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
        * [.memberList()](#Room+memberList) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
        * [.refresh()](#Room+refresh) ⇒ <code>Promise.&lt;void&gt;</code>
    * _static_
        * [.create(contactList, [topic])](#Room.create) ⇒ [<code>Promise.&lt;Room&gt;</code>](#Room)
        * [.findAll([query])](#Room.findAll) ⇒ <code>Promise.&lt;Array.&lt;Room&gt;&gt;</code>
        * [.find(query)](#Room.find) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>

<a name="Room+say"></a>

### room.say(textOrMedia, [replyTo]) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send message inside Room, if set [replyTo], wechaty will mention the contact as well.

**Kind**: instance method of [<code>Room</code>](#Room)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - If bot send message successfully, it will return true. If the bot failed to send for blocking or any other reason, it will return false  

| Param | Type | Description |
| --- | --- | --- |
| textOrMedia | <code>string</code> \| [<code>MediaMessage</code>](#MediaMessage) | Send `text` or `media file` inside Room. |
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

### room.topic([newTopic]) ⇒ <code>string</code> \| <code>void</code>
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
    const topic = room.topic()
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
Check if the room has member `contact`.

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
  if (room.has(contact)) {
    console.log(`${contact.name()} is in the room ${room.topic()}!`)
  } else {
    console.log(`${contact.name()} is not in the room ${room.topic()} !`)
  }
}
```
<a name="Room+memberAll"></a>

### room.memberAll(queryArg) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
Find all contacts in a room

#### definition
- `name`                 the name-string set by user-self, should be called name, equal to `Contact.name()`
- `roomAlias` | `alias`  the name-string set by user-self in the room, should be called roomAlias
- `contactAlias`         the name-string set by bot for others, should be called alias, equal to `Contact.alias()`

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| queryArg | [<code>MemberQueryFilter</code>](#MemberQueryFilter) \| <code>string</code> | When use memberAll(name:string), return all matched members, including name, roomAlias, contactAlias |

<a name="Room+member"></a>

### room.member(queryArg) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
Find all contacts in a room, if get many, return the first one.

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| queryArg | [<code>MemberQueryFilter</code>](#MemberQueryFilter) \| <code>string</code> | When use member(name:string), return all matched members, including name, roomAlias, contactAlias |

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
<a name="Room+refresh"></a>

### room.refresh() ⇒ <code>Promise.&lt;void&gt;</code>
Force reload data for Room

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
[Example/Contact-Bot](https://github.com/Chatie/wechaty/blob/master/example/contact-bot.ts)

**Kind**: global class  

* [Contact](#Contact)
    * _instance_
        * [.say(textOrMedia)](#Contact+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.name()](#Contact+name) ⇒ <code>string</code>
        * [.alias(newAlias)](#Contact+alias) ⇒ <code>string</code> \| <code>null</code> \| <code>Promise.&lt;boolean&gt;</code>
        * [.stranger()](#Contact+stranger) ⇒ <code>boolean</code> \| <code>null</code>
        * [.official()](#Contact+official) ⇒ <code>boolean</code> \| <code>null</code>
        * [.special()](#Contact+special) ⇒ <code>boolean</code> \| <code>null</code>
        * [.personal()](#Contact+personal) ⇒ <code>boolean</code> \| <code>null</code>
        * [.star()](#Contact+star) ⇒ <code>boolean</code>
        * [.gender()](#Contact+gender) ⇒ <code>Gender.Male(2)</code> \| <code>Gender.Female(1)</code> \| <code>Gender.Unknown(0)</code>
        * [.province()](#Contact+province) ⇒ <code>string</code> \| <code>undefined</code>
        * [.city()](#Contact+city) ⇒ <code>string</code> \| <code>undefined</code>
        * [.avatar()](#Contact+avatar) ⇒ <code>Promise.&lt;NodeJS.ReadableStream&gt;</code>
        * [.refresh()](#Contact+refresh) ⇒ <code>Promise.&lt;this&gt;</code>
        * [.self()](#Contact+self) ⇒ <code>boolean</code>
    * _static_
        * [.find(query)](#Contact.find) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
        * [.findAll([queryArg])](#Contact.findAll) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>

<a name="Contact+say"></a>

### contact.say(textOrMedia) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send Text or Media File to Contact.

**Kind**: instance method of [<code>Contact</code>](#Contact)  

| Param | Type |
| --- | --- |
| textOrMedia | <code>string</code> \| [<code>MediaMessage</code>](#MediaMessage) | 

**Example**  
```js
const contact = await Contact.find({name: 'lijiarui'})         // change 'lijiarui' to any of your contact name in wechat
await contact.say('welcome to wechaty!')
await contact.say(new MediaMessage(__dirname + '/wechaty.png') // put the filePath you want to send here
```
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
const ret = await contact.alias('lijiarui')
if (ret) {
  console.log(`change ${contact.name()}'s alias successfully!`)
} else {
  console.log(`failed to change ${contact.name()} alias!`)
}
```
**Example** *(DELETE the alias for a contact)*  
```js
const ret = await contact.alias(null)
if (ret) {
  console.log(`delete ${contact.name()}'s alias successfully!`)
} else {
  console.log(`failed to delete ${contact.name()}'s alias!`)
}
```
<a name="Contact+stranger"></a>

### contact.stranger() ⇒ <code>boolean</code> \| <code>null</code>
Check if contact is stranger

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - - True for not friend of the bot, False for friend of the bot, null for unknown.  
**Example**  
```js
const isStranger = contact.stranger()
```
<a name="Contact+official"></a>

### contact.official() ⇒ <code>boolean</code> \| <code>null</code>
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
<a name="Contact+special"></a>

### contact.special() ⇒ <code>boolean</code> \| <code>null</code>
Check if it's a special contact

The contact who's id in following list will be identify as a special contact
`weibo`, `qqmail`, `fmessage`, `tmessage`, `qmessage`, `qqsync`, `floatbottle`,
`lbsapp`, `shakeapp`, `medianote`, `qqfriend`, `readerapp`, `blogapp`, `facebookapp`,
`masssendapp`, `meishiapp`, `feedsapp`, `voip`, `blogappweixin`, `weixin`, `brandsessionholder`,
`weixinreminder`, `wxid_novlwrv3lqwv11`, `gh_22b87fa7cb3c`, `officialaccounts`, `notification_messages`,

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - True for brand, Flase for contact is not a brand  
**See**

- [webwxApp.js#L3848](https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3848)
- [webwxApp.js#L3246](https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3246)

**Example**  
```js
const isSpecial = contact.special()
```
<a name="Contact+personal"></a>

### contact.personal() ⇒ <code>boolean</code> \| <code>null</code>
Check if it's a personal account

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - - True for personal account, Flase for contact is not a personal account  
**Example**  
```js
const isPersonal = contact.personal()
```
<a name="Contact+star"></a>

### contact.star() ⇒ <code>boolean</code>
Check if the contact is star contact.

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> - - True for star friend, False for no star friend.  
**Example**  
```js
const isStar = contact.star()
```
<a name="Contact+gender"></a>

### contact.gender() ⇒ <code>Gender.Male(2)</code> \| <code>Gender.Female(1)</code> \| <code>Gender.Unknown(0)</code>
Contact gender

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const gender = contact.gender()
```
<a name="Contact+province"></a>

### contact.province() ⇒ <code>string</code> \| <code>undefined</code>
Get the region 'province' from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const province = contact.province()
```
<a name="Contact+city"></a>

### contact.city() ⇒ <code>string</code> \| <code>undefined</code>
Get the region 'city' from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const city = contact.city()
```
<a name="Contact+avatar"></a>

### contact.avatar() ⇒ <code>Promise.&lt;NodeJS.ReadableStream&gt;</code>
Get avatar picture file stream

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const avatarFileName = contact.name() + `.jpg`
const avatarReadStream = await contact.avatar()
const avatarWriteStream = createWriteStream(avatarFileName)
avatarReadStream.pipe(avatarWriteStream)
log.info('Bot', 'Contact: %s: %s with avatar file: %s', contact.weixin(), contact.name(), avatarFileName)
```
<a name="Contact+refresh"></a>

### contact.refresh() ⇒ <code>Promise.&lt;this&gt;</code>
Force reload data for Contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
await contact.refresh()
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
<a name="FriendRequest"></a>

## FriendRequest
Send, receive friend request, and friend confirmation events.

1. send request
2. receive request(in friend event)
3. confirmation friendship(friend event)

[Example/Friend-Bot](https://github.com/Chatie/wechaty/blob/master/example/friend-bot.ts)

**Kind**: global class  

* [FriendRequest](#FriendRequest)
    * [.send(contact, [hello])](#FriendRequest+send) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.accept()](#FriendRequest+accept) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="FriendRequest+send"></a>

### friendRequest.send(contact, [hello]) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send a new friend request

**Kind**: instance method of [<code>FriendRequest</code>](#FriendRequest)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Return a Promise, true for accept successful, false for failure.  

| Param | Type | Default |
| --- | --- | --- |
| contact | [<code>Contact</code>](#Contact) |  | 
| [hello] | <code>string</code> | <code>&quot;&#x27;Hi&#x27;&quot;</code> | 

**Example**  
```js
const from = message.from()
const request = new FriendRequest()
request.send(from, 'hello~')
```
<a name="FriendRequest+accept"></a>

### friendRequest.accept() ⇒ <code>Promise.&lt;boolean&gt;</code>
Accept a friend request

**Kind**: instance method of [<code>FriendRequest</code>](#FriendRequest)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Return a Promise, true for accept successful, false for failure.  
<a name="Message"></a>

## Message
All wechat messages will be encapsulated as a Message.

`Message` is `Sayable`,
[Example/Ding-Dong-Bot](https://github.com/Chatie/wechaty/blob/master/example/ding-dong-bot.ts)

**Kind**: global class  

* [Message](#Message)
    * _instance_
        * [.say(textOrMedia, [replyTo])](#Message+say) ⇒ <code>Promise.&lt;any&gt;</code>
        * [.from()](#Message+from) ⇒ [<code>Contact</code>](#Contact)
        * [.room()](#Message+room) ⇒ [<code>Room</code>](#Room) \| <code>null</code>
        * [.content()](#Message+content) ⇒ <code>string</code>
        * [.type()](#Message+type) ⇒ [<code>MsgType</code>](#MsgType)
        * [.typeSub()](#Message+typeSub) ⇒ [<code>MsgType</code>](#MsgType)
        * [.typeApp()](#Message+typeApp) ⇒ [<code>AppMsgType</code>](#AppMsgType)
        * [.typeEx()](#Message+typeEx) ⇒ [<code>MsgType</code>](#MsgType)
        * [.self()](#Message+self) ⇒ <code>boolean</code>
        * [.mentioned()](#Message+mentioned) ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
        * [.to()](#Message+to) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
        * [.readyStream()](#Message+readyStream) ⇒ <code>Promise.&lt;Readable&gt;</code>
    * _static_
        * [.find()](#Message.find)
        * [.findAll()](#Message.findAll)

<a name="Message+say"></a>

### message.say(textOrMedia, [replyTo]) ⇒ <code>Promise.&lt;any&gt;</code>
Reply a Text or Media File message to the sender.

**Kind**: instance method of [<code>Message</code>](#Message)  
**See**: [Example/ding-dong-bot](https://github.com/Chatie/wechaty/blob/master/example/ding-dong-bot.ts)  

| Param | Type |
| --- | --- |
| textOrMedia | <code>string</code> \| [<code>MediaMessage</code>](#MediaMessage) | 
| [replyTo] | [<code>Contact</code>](#Contact) \| [<code>Array.&lt;Contact&gt;</code>](#Contact) | 

**Example**  
```js
const bot = Wechaty.instance()
bot
.on('message', async m => {
  if (/^ding$/i.test(m.content())) {
    await m.say('hello world')
    console.log('Bot REPLY: hello world')
    await m.say(new MediaMessage(__dirname + '/wechaty.png'))
    console.log('Bot REPLY: Image')
  }
})
```
<a name="Message+from"></a>

### message.from() ⇒ [<code>Contact</code>](#Contact)
Get the sender from a message.

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+room"></a>

### message.room() ⇒ [<code>Room</code>](#Room) \| <code>null</code>
Get the room from the message.
If the message is not in a room, then will return `null`

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+content"></a>

### message.content() ⇒ <code>string</code>
Get the content of the message

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+type"></a>

### message.type() ⇒ [<code>MsgType</code>](#MsgType)
Get the type from the message.

If type is equal to `MsgType.RECALLED`, [Message#id](Message#id) is the msgId of the recalled message.

**Kind**: instance method of [<code>Message</code>](#Message)  
**See**: [MsgType](#MsgType)  
<a name="Message+typeSub"></a>

### message.typeSub() ⇒ [<code>MsgType</code>](#MsgType)
Get the typeSub from the message.

If message is a location message: `m.type() === MsgType.TEXT && m.typeSub() === MsgType.LOCATION`

**Kind**: instance method of [<code>Message</code>](#Message)  
**See**: [MsgType](#MsgType)  
<a name="Message+typeApp"></a>

### message.typeApp() ⇒ [<code>AppMsgType</code>](#AppMsgType)
Get the typeApp from the message.

**Kind**: instance method of [<code>Message</code>](#Message)  
**See**: [AppMsgType](#AppMsgType)  
<a name="Message+typeEx"></a>

### message.typeEx() ⇒ [<code>MsgType</code>](#MsgType)
Get the typeEx from the message.

**Kind**: instance method of [<code>Message</code>](#Message)  
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
<a name="Message+mentioned"></a>

### message.mentioned() ⇒ [<code>Array.&lt;Contact&gt;</code>](#Contact)
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
<a name="Message+to"></a>

### message.to() ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
Get the destination of the message
Message.to() will return null if a message is in a room, use Message.room() to get the room.

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+readyStream"></a>

### message.readyStream() ⇒ <code>Promise.&lt;Readable&gt;</code>
Please notice that when we are running Wechaty,
if you use the browser that controlled by Wechaty to send attachment files,
you will get a zero sized file, because it is not an attachment from the network,
but a local data, which is not supported by Wechaty yet.

**Kind**: instance method of [<code>Message</code>](#Message)  
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

<a name="MediaMessage"></a>

## MediaMessage
Meidia Type Message

**Kind**: global class  

* [MediaMessage](#MediaMessage)
    * [.ext()](#MediaMessage+ext) ⇒ <code>string</code>
    * [.mimeType()](#MediaMessage+mimeType)
    * [.filename()](#MediaMessage+filename) ⇒ <code>string</code>
    * [.readyStream()](#MediaMessage+readyStream)
    * [.saveFile(filePath)](#MediaMessage+saveFile)
    * [.forward(to)](#MediaMessage+forward) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="MediaMessage+ext"></a>

### mediaMessage.ext() ⇒ <code>string</code>
Get the MediaMessage file extension, etc: `jpg`, `gif`, `pdf`, `word` ..

**Kind**: instance method of [<code>MediaMessage</code>](#MediaMessage)  
**Example**  
```js
bot.on('message', async function (m) {
  if (m instanceof MediaMessage) {
    console.log('media message file name extention is: ' + m.ext())
  }
})
```
<a name="MediaMessage+mimeType"></a>

### mediaMessage.mimeType()
return the MIME Type of this MediaMessage

**Kind**: instance method of [<code>MediaMessage</code>](#MediaMessage)  
<a name="MediaMessage+filename"></a>

### mediaMessage.filename() ⇒ <code>string</code>
Get the MediaMessage filename, etc: `how to build a chatbot.pdf`..

**Kind**: instance method of [<code>MediaMessage</code>](#MediaMessage)  
**Example**  
```js
bot.on('message', async function (m) {
  if (m instanceof MediaMessage) {
    console.log('media message file name is: ' + m.filename())
  }
})
```
<a name="MediaMessage+readyStream"></a>

### mediaMessage.readyStream()
Get the read stream for attachment file

**Kind**: instance method of [<code>MediaMessage</code>](#MediaMessage)  
<a name="MediaMessage+saveFile"></a>

### mediaMessage.saveFile(filePath)
save file

**Kind**: instance method of [<code>MediaMessage</code>](#MediaMessage)  

| Param | Description |
| --- | --- |
| filePath | save file |

<a name="MediaMessage+forward"></a>

### mediaMessage.forward(to) ⇒ <code>Promise.&lt;boolean&gt;</code>
Forward the received message.

The types of messages that can be forwarded are as follows:

The return value of [type](#Message+type) matches one of the following types:
```
MsgType {
  TEXT                = 1,
  IMAGE               = 3,
  VIDEO               = 43,
  EMOTICON            = 47,
  LOCATION            = 48,
  APP                 = 49,
  MICROVIDEO          = 62,
}
```

When the return value of [type](#Message+type) is `MsgType.APP`, the return value of [typeApp](#Message+typeApp) matches one of the following types:
```
AppMsgType {
  TEXT                     = 1,
  IMG                      = 2,
  VIDEO                    = 4,
  ATTACH                   = 6,
  EMOJI                    = 8,
}
```
It should be noted that when forwarding ATTACH type message, if the file size is greater than 25Mb, the forwarding will fail.
The reason is that the server shields the web wx to download more than 25Mb files with a file size of 0.

But if the file is uploaded by you using wechaty, you can forward it.
You need to detect the following conditions in the message event, which can be forwarded if it is met.

```javasrcipt
.on('message', async m => {
  if (m.self() && m.rawObj && m.rawObj.Signature) {
    // Filter the contacts you have forwarded
    const msg = <MediaMessage> m
    await msg.forward()
  }
})
```

**Kind**: instance method of [<code>MediaMessage</code>](#MediaMessage)  

| Param | Type | Description |
| --- | --- | --- |
| to | <code>Sayable</code> \| <code>Array.&lt;Sayable&gt;</code> | Room or Contact The recipient of the message, the room, or the contact |

<a name="FriendRequest"></a>

## FriendRequest
**Kind**: global class  

* [FriendRequest](#FriendRequest)
    * [.send(contact, [hello])](#FriendRequest+send) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.accept()](#FriendRequest+accept) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="FriendRequest+send"></a>

### friendRequest.send(contact, [hello]) ⇒ <code>Promise.&lt;boolean&gt;</code>
Send a new friend request

**Kind**: instance method of [<code>FriendRequest</code>](#FriendRequest)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Return a Promise, true for accept successful, false for failure.  

| Param | Type | Default |
| --- | --- | --- |
| contact | [<code>Contact</code>](#Contact) |  | 
| [hello] | <code>string</code> | <code>&quot;&#x27;Hi&#x27;&quot;</code> | 

**Example**  
```js
const from = message.from()
const request = new FriendRequest()
request.send(from, 'hello~')
```
<a name="FriendRequest+accept"></a>

### friendRequest.accept() ⇒ <code>Promise.&lt;boolean&gt;</code>
Accept a friend request

**Kind**: instance method of [<code>FriendRequest</code>](#FriendRequest)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Return a Promise, true for accept successful, false for failure.  
<a name="Gender"></a>

## Gender : <code>enum</code>
Enum for Gender values.

**Kind**: global enum  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| Unknown | <code>number</code> | 0 for Unknown |
| Male | <code>number</code> | 1 for Male |
| Female | <code>number</code> | 2 for Female |

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
| alias | <code>string</code> | Find the contact by alias set by the bot for others in a room, equal to `roomAlias`. |
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

