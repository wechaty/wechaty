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
        * [.version([forceNpm])](#Wechaty+version) ⇒ <code>string</code>
        * ~~[.user()](#Wechaty+user) ⇒ <code>Contact</code>~~
        * [.init()](#Wechaty+init)
        * [.on()](#Wechaty+on)
        * [.quit()](#Wechaty+quit)
        * [.logout()](#Wechaty+logout)
        * [.self()](#Wechaty+self) ⇒ <code>Contact</code>
        * [.send()](#Wechaty+send)
        * [.say()](#Wechaty+say)
        * [.sleep()](#Wechaty+sleep)
    * _static_
        * [.instance()](#Wechaty.instance)

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

### ~~wechaty.user() ⇒ <code>Contact</code>~~
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

### wechaty.self() ⇒ <code>Contact</code>
get current user

**Kind**: instance method of <code>[Wechaty](#Wechaty)</code>  
**Returns**: <code>Contact</code> - current logined user  
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
