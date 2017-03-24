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
<dd><p>Class Contact
blabla...
<strong>IMPORTANT</strong></p>
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
<a name="Room.load"></a>

### Room.load()
**Kind**: static method of <code>[Room](#Room)</code>  
**Todo**

- [ ] document me

<a name="Contact"></a>

## Contact
Class Contact
blabla...
**IMPORTANT**

**Kind**: global class  

* [Contact](#Contact)
    * _instance_
        * [.gender()](#Contact+gender) ⇒
        * [.avatar()](#Contact+avatar)
    * _static_
        * [.findAll()](#Contact.findAll)
        * [.find()](#Contact.find)

<a name="Contact+gender"></a>

### contact.gender() ⇒
Contact gender

**Kind**: instance method of <code>[Contact](#Contact)</code>  
**Returns**: Gender.Male(2) | Gender.Female(1) | Gender.Unknown(0)  
<a name="Contact+avatar"></a>

### contact.avatar()
Get avatar picture file stream

**Kind**: instance method of <code>[Contact](#Contact)</code>  
<a name="Contact.findAll"></a>

### Contact.findAll()
find contact by `name` or `alias`

**Kind**: static method of <code>[Contact](#Contact)</code>  
<a name="Contact.find"></a>

### Contact.find()
try to find a contact by filter: {name: string | RegExp}

**Kind**: static method of <code>[Contact](#Contact)</code>  
<a name="config_1"></a>

## config_1
Wechaty: * * Wechaty - Wechat for Bot. Connecting ChatBots

Licenst: ISC
https://github.com/wechaty/wechaty

**Kind**: global constant  
