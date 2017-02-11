<a name="Wechaty"></a>

## Wechaty
Wechaty: Wechat for ChatBots.
Connect ChatBots

Class Wechaty

Licenst: ISC
https://github.com/zixia/wechaty

**Kind**: global class  

* [Wechaty](#Wechaty)
    * _instance_
        * [.state](#Wechaty+state)
        * [.npmVersion](#Wechaty+npmVersion)
        * [.puppet](#Wechaty+puppet)
        * [.toString()](#Wechaty+toString)
        * [.version([forceNpm])](#Wechaty+version) ⇒ <code>string</code>
        * [.user()](#Wechaty+user)
        * [.reset()](#Wechaty+reset)
        * [.init()](#Wechaty+init)
        * [.on()](#Wechaty+on)
        * [.initPuppet()](#Wechaty+initPuppet)
        * [.quit()](#Wechaty+quit)
        * [.logout()](#Wechaty+logout)
        * [.self()](#Wechaty+self)
        * [.send()](#Wechaty+send)
        * [.say()](#Wechaty+say)
        * [.sleep()](#Wechaty+sleep)
        * [.ding()](#Wechaty+ding)
    * _static_
        * [.instance()](#Wechaty.instance)

<a name="Wechaty+state"></a>

### wechaty.state
the state

**Kind**: instance property of <code>[Wechaty](#Wechaty)</code>  
<a name="Wechaty+npmVersion"></a>

### wechaty.npmVersion
the npmVersion

**Kind**: instance property of <code>[Wechaty](#Wechaty)</code>  
<a name="Wechaty+puppet"></a>

### wechaty.puppet
TODO: support more events:
2. send
3. reply
4. quit
5. ...

**Kind**: instance property of <code>[Wechaty](#Wechaty)</code>  
<a name="Wechaty+toString"></a>

### wechaty.toString()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
<a name="Wechaty+version"></a>

### wechaty.version([forceNpm]) ⇒ <code>string</code>
Return version of Wechaty

**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Returns**: <code>string</code> - version number  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [forceNpm] | <code>boolean</code> | <code>false</code> | if set to true, will only return the version in package.json.                            otherwise will return git commit hash if .git exists. |

**Example**  
```js
console.log(Wechaty.instance().version())
 // #git[af39df]
 console.log(Wechaty.instance().version(true))
 // 0.7.9
```
<a name="Wechaty+user"></a>

### wechaty.user()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty+reset"></a>

### wechaty.reset()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
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

<a name="Wechaty+initPuppet"></a>

### wechaty.initPuppet()
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

### wechaty.self()
get current user

**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
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

<a name="Wechaty+ding"></a>

### wechaty.ding()
**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Todo**

- [ ] document me

<a name="Wechaty.instance"></a>

### Wechaty.instance()
**Kind**: static method of <code>[Wechaty](#Wechaty)</code>  
