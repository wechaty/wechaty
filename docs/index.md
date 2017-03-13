## Classes

<dl>
<dt><a href="#Wechaty">Wechaty</a></dt>
<dd><p>Wechaty: Wechat for ChatBots.
Connect ChatBots</p>
<p>Class Wechaty</p>
<p>Licenst: ISC
<a href="https://github.com/zixia/wechaty">https://github.com/zixia/wechaty</a></p>
<p><strong>Example</strong></p>
<pre><code class="lang-ts">// The World&#39;s Shortest ChatBot Code: 6 lines of JavaScript
const { Wechaty } = require(&#39;wechaty&#39;)

Wechaty.instance() // Singleton
.on(&#39;scan&#39;, (url, code) =&gt; console.log(`Scan QR Code to login: ${code}\n${url}`))
.on(&#39;login&#39;,       user =&gt; console.log(`User ${user} logined`))
.on(&#39;message&#39;,  message =&gt; console.log(`Message: ${message}`))
.init()
</code></pre>
</dd>
<dt><a href="#Room">Room</a></dt>
<dd><p>wechaty: Wechat for Bot. and for human who talk to bot/robot</p>
<p>Licenst: ISC
<a href="https://github.com/zixia/wechaty">https://github.com/zixia/wechaty</a></p>
<p>Add/Del/Topic: <a href="https://github.com/wechaty/wechaty/issues/32">https://github.com/wechaty/wechaty/issues/32</a></p>
</dd>
<dt><a href="#Contact">Contact</a></dt>
<dd><p>Class Contact</p>
<p><code>Contact</code> is <code>Sayable</code></p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#config_1">config_1</a></dt>
<dd><p>Wechaty: <em> </em> Wechaty - Wechat for Bot. Connecting ChatBots</p>
<p>Licenst: ISC
<a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
</dl>

<a name="Wechaty"></a>

## Wechaty
Wechaty: Wechat for ChatBots.
Connect ChatBots

Class Wechaty

Licenst: ISC
https://github.com/zixia/wechaty


**Example**

```ts
// The World's Shortest ChatBot Code: 6 lines of JavaScript
const { Wechaty } = require('wechaty')

Wechaty.instance() // Singleton
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.on('message',  message => console.log(`Message: ${message}`))
.init()
```

**Kind**: global class  
**See**: The <a href="https://github.com/lijiarui/wechaty-getting-started">Wechaty Starter Project</a>  

* [Wechaty](#Wechaty)
    * _instance_
        * [.version([forceNpm])](#Wechaty+version) ⇒ <code>string</code>
        * ~~[.user()](#Wechaty+user) ⇒ <code>[Contact](#Contact)</code>~~
        * [.init()](#Wechaty+init)
        * [.on()](#Wechaty+on)
        * [.quit()](#Wechaty+quit)
        * [.logout()](#Wechaty+logout)
        * [.self()](#Wechaty+self) ⇒ <code>[Contact](#Contact)</code>
        * [.send()](#Wechaty+send)
        * [.say()](#Wechaty+say)
        * [.sleep()](#Wechaty+sleep)
    * _static_
        * [.instance()](#Wechaty.instance)

<a name="Wechaty+version"></a>

### wechaty.version([forceNpm]) ⇒ <code>string</code>
Return version of Wechaty

**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Returns**: <code>string</code> - - the version number  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [forceNpm] | <code>boolean</code> | <code>false</code> | if set to true, will only return the version in package.json.                                      otherwise will return git commit hash if .git exists. |

**Example**  
```js
console.log(Wechaty.instance().version())
 // '#git[af39df]'
 console.log(Wechaty.instance().version(true))
 // '0.7.9'
```
<a name="Wechaty+user"></a>

### ~~wechaty.user() ⇒ <code>[Contact](#Contact)</code>~~
***Deprecated***

**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+init"></a>

### wechaty.init()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+on"></a>

### wechaty.on()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+quit"></a>

### wechaty.quit()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+logout"></a>

### wechaty.logout()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+self"></a>

### wechaty.self() ⇒ <code>[Contact](#Contact)</code>
get current user

**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Returns**: <code>[Contact](#Contact)</code> - current logined user  
<a name="Wechaty+send"></a>

### wechaty.send()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+say"></a>

### wechaty.say()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+sleep"></a>

### wechaty.sleep()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty.instance"></a>

### Wechaty.instance()
get the singleton instance of Wechaty

**Kind**: static method of <code>[Wechaty](#Wechaty)</code>  
<a name="Room"></a>

## Room
wechaty: Wechat for Bot. and for human who talk to bot/robot

Licenst: ISC
https://github.com/zixia/wechaty

Add/Del/Topic: https://github.com/wechaty/wechaty/issues/32

**Kind**: global class  

* [Room](#Room)
    * _instance_
        * ~~[.nick()](#Room+nick)~~
        * [.alias(contact)](#Room+alias) ⇒ <code>string</code> &#124; <code>null</code>
    * _static_
        * [.find(query)](#Room.find) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>
        * [.load()](#Room.load)

<a name="Room+nick"></a>

### ~~room.nick()~~
***Deprecated***

should be deprecated

**Kind**: instance method of <code>[Room](#Room)</code>  
<a name="Room+alias"></a>

### room.alias(contact) ⇒ <code>string</code> &#124; <code>null</code>
find contact's roomAlias in the room

**Kind**: instance method of <code>[Room](#Room)</code>  
**Returns**: <code>string</code> &#124; <code>null</code> - If can find contact's roomAlias, return string, or return null  

| Param | Type |
| --- | --- |
| contact | <code>[Contact](#Contact)</code> | 

<a name="Room.find"></a>

### Room.find(query) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>
try to find a room by filter: {topic: string | RegExp}

**Kind**: static method of <code>[Room](#Room)</code>  
**Returns**: <code>Promise.&lt;(Room\|null)&gt;</code> - If can find the room, return Room, or return null  

| Param | Type |
| --- | --- |
| query | <code>RoomQueryFilter</code> | 

<a name="Room.load"></a>

### Room.load()
**Kind**: static method of <code>[Room](#Room)</code>  
**Todo**

- [ ] document me

<a name="Contact"></a>

## Contact
Class Contact

`Contact` is `Sayable`

**Kind**: global class  

* [Contact](#Contact)
    * _instance_
        * [.weixin()](#Contact+weixin) ⇒ <code>string</code> &#124; <code>&#x27;&#x27;</code>
        * [.name()](#Contact+name) ⇒ <code>string</code> &#124; <code>&#x27;&#x27;</code>
        * [.stranger()](#Contact+stranger) ⇒ <code>boolean</code>
        * [.star()](#Contact+star) ⇒ <code>boolean</code>
        * [.gender()](#Contact+gender) ⇒
        * [.province()](#Contact+province) ⇒ <code>string</code> &#124; <code>undefined</code>
        * [.city()](#Contact+city) ⇒ <code>string</code> &#124; <code>undefined</code>
        * [.avatar()](#Contact+avatar) ⇒ <code>Promise.&lt;NodeJS.ReadableStream&gt;</code>
        * [.refresh()](#Contact+refresh) ⇒ <code>Promise.&lt;this&gt;</code>
        * [.self()](#Contact+self) ⇒ <code>boolean</code>
        * [.say(content)](#Contact+say) ⇒ <code>Promise.&lt;void&gt;</code>
    * _static_
        * [.findAll([queryArg])](#Contact.findAll) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
        * [.find(query)](#Contact.find) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
        * [.load(id)](#Contact.load) ⇒ <code>[Contact](#Contact)</code>

<a name="Contact+weixin"></a>

### contact.weixin() ⇒ <code>string</code> &#124; <code>&#x27;&#x27;</code>
Get the weixin number from a contact
Sometimes cannot get weixin number due to weixin security mechanism, not recommend.

**Kind**: instance method of <code>[Contact](#Contact)</code>  
<a name="Contact+name"></a>

### contact.name() ⇒ <code>string</code> &#124; <code>&#x27;&#x27;</code>
Get the name from a contact

**Kind**: instance method of <code>[Contact](#Contact)</code>  
<a name="Contact+stranger"></a>

### contact.stranger() ⇒ <code>boolean</code>
Check if contact is stranger

**Kind**: instance method of <code>[Contact](#Contact)</code>  
**Returns**: <code>boolean</code> - True for not friend of the bot, False for friend of the bot  
<a name="Contact+star"></a>

### contact.star() ⇒ <code>boolean</code>
Check if the contact is star contact.

**Kind**: instance method of <code>[Contact](#Contact)</code>  
**Returns**: <code>boolean</code> - True for star friend, False for no star friend  
<a name="Contact+gender"></a>

### contact.gender() ⇒
Contact gender

**Kind**: instance method of <code>[Contact](#Contact)</code>  
**Returns**: Gender.Male(2) | Gender.Female(1) | Gender.Unknown(0)  
<a name="Contact+province"></a>

### contact.province() ⇒ <code>string</code> &#124; <code>undefined</code>
Get the region 'province' from a contact

**Kind**: instance method of <code>[Contact](#Contact)</code>  
<a name="Contact+city"></a>

### contact.city() ⇒ <code>string</code> &#124; <code>undefined</code>
Get the region 'city' from a contact

**Kind**: instance method of <code>[Contact](#Contact)</code>  
<a name="Contact+avatar"></a>

### contact.avatar() ⇒ <code>Promise.&lt;NodeJS.ReadableStream&gt;</code>
Get avatar picture file stream

**Kind**: instance method of <code>[Contact](#Contact)</code>  
<a name="Contact+refresh"></a>

### contact.refresh() ⇒ <code>Promise.&lt;this&gt;</code>
Force reload data for Contact

**Kind**: instance method of <code>[Contact](#Contact)</code>  
<a name="Contact+self"></a>

### contact.self() ⇒ <code>boolean</code>
Check if contact is self

**Kind**: instance method of <code>[Contact](#Contact)</code>  
**Returns**: <code>boolean</code> - True for contact is self, False for contact is others  
<a name="Contact+say"></a>

### contact.say(content) ⇒ <code>Promise.&lt;void&gt;</code>
Say `content` to Contact

**Kind**: instance method of <code>[Contact](#Contact)</code>  

| Param | Type |
| --- | --- |
| content | <code>string</code> | 

<a name="Contact.findAll"></a>

### Contact.findAll([queryArg]) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
find contact by `name` or `alias`
If use Contact.findAll() get the contact list of the bot.

**Kind**: static method of <code>[Contact](#Contact)</code>  

| Param | Type |
| --- | --- |
| [queryArg] | <code>ContactQueryFilter</code> | 

<a name="Contact.find"></a>

### Contact.find(query) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
Find contact by name or alias, if the result more than one, return the first one.

**Kind**: static method of <code>[Contact](#Contact)</code>  
**Returns**: <code>Promise.&lt;(Contact\|null)&gt;</code> - If can find the contact, return Contact, or return null  

| Param | Type |
| --- | --- |
| query | <code>ContactQueryFilter</code> | 

**Example**  
``` ts
const contactFindByName = await Contact.find({ name:"ContactName"} )
const contactFindByAlias = await Contact.find({ alias:"ContactAlias"} )
```
<a name="Contact.load"></a>

### Contact.load(id) ⇒ <code>[Contact](#Contact)</code>
Load data for Contact by id

**Kind**: static method of <code>[Contact](#Contact)</code>  

| Param | Type |
| --- | --- |
| id | <code>string</code> | 

<a name="Gender"></a>

## Gender : <code>enum</code>
Enum for Gender values.

**Kind**: global enum  
<a name="config_1"></a>

## config_1
Wechaty: * * Wechaty - Wechat for Bot. Connecting ChatBots

Licenst: ISC
https://github.com/wechaty/wechaty

**Kind**: global constant  
