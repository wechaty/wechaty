[Wechaty Puppet v0.9.12 Interface](../README.md) > [Puppet](../classes/puppet.md)

# Class: Puppet

Puppet Base Class

See: [https://github.com/Chatie/wechaty/wiki/Puppet](https://github.com/Chatie/wechaty/wiki/Puppet)

## Hierarchy

 `EventEmitter`

**↳ Puppet**

## Index

### Constructors

* [constructor](puppet.md#constructor)

### Properties

* [VERSION](puppet.md#version)
* [defaultMaxListeners](puppet.md#defaultmaxlisteners)

### Methods

* [addListener](puppet.md#addlistener)
* [contactAlias](puppet.md#contactalias)
* [contactAvatar](puppet.md#contactavatar)
* [contactList](puppet.md#contactlist)
* [contactPayload](puppet.md#contactpayload)
* [contactQrcode](puppet.md#contactqrcode)
* [contactRoomList](puppet.md#contactroomlist)
* [contactSearch](puppet.md#contactsearch)
* [contactValidate](puppet.md#contactvalidate)
* [ding](puppet.md#ding)
* [emit](puppet.md#emit)
* [eventNames](puppet.md#eventnames)
* [friendshipAccept](puppet.md#friendshipaccept)
* [friendshipAdd](puppet.md#friendshipadd)
* [friendshipPayload](puppet.md#friendshippayload)
* [getMaxListeners](puppet.md#getmaxlisteners)
* [listenerCount](puppet.md#listenercount)
* [listeners](puppet.md#listeners)
* [logonoff](puppet.md#logonoff)
* [logout](puppet.md#logout)
* [messageFile](puppet.md#messagefile)
* [messageForward](puppet.md#messageforward)
* [messagePayload](puppet.md#messagepayload)
* [messageSendContact](puppet.md#messagesendcontact)
* [messageSendFile](puppet.md#messagesendfile)
* [messageSendText](puppet.md#messagesendtext)
* [off](puppet.md#off)
* [on](puppet.md#on)
* [once](puppet.md#once)
* [prependListener](puppet.md#prependlistener)
* [prependOnceListener](puppet.md#prependoncelistener)
* [rawListeners](puppet.md#rawlisteners)
* [removeAllListeners](puppet.md#removealllisteners)
* [removeListener](puppet.md#removelistener)
* [roomAdd](puppet.md#roomadd)
* [roomAnnounce](puppet.md#roomannounce)
* [roomAvatar](puppet.md#roomavatar)
* [roomCreate](puppet.md#roomcreate)
* [roomDel](puppet.md#roomdel)
* [roomInvitationAccept](puppet.md#roominvitationaccept)
* [roomInvitationPayload](puppet.md#roominvitationpayload)
* [roomList](puppet.md#roomlist)
* [roomMemberList](puppet.md#roommemberlist)
* [roomMemberPayload](puppet.md#roommemberpayload)
* [roomMemberSearch](puppet.md#roommembersearch)
* [roomPayload](puppet.md#roompayload)
* [roomQrcode](puppet.md#roomqrcode)
* [roomQuit](puppet.md#roomquit)
* [roomSearch](puppet.md#roomsearch)
* [roomTopic](puppet.md#roomtopic)
* [roomValidate](puppet.md#roomvalidate)
* [selfId](puppet.md#selfid)
* [setMaxListeners](puppet.md#setmaxlisteners)
* [start](puppet.md#start)
* [stop](puppet.md#stop)
* [toString](puppet.md#tostring)
* [unref](puppet.md#unref)
* [version](puppet.md#version-1)
* [wechatyVersionRange](puppet.md#wechatyversionrange)
* [listenerCount](puppet.md#listenercount-1)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new Puppet**(options?: *[PuppetOptions](../interfaces/puppetoptions.md)*): [Puppet](puppet.md)

*Defined in [src/puppet.ts:127](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L127)*

Constructor

**Parameters:**

| Param | Type | Default value |
| ------ | ------ | ------ |
| `Default value` options | [PuppetOptions](../interfaces/puppetoptions.md) |  {} |

**Returns:** [Puppet](puppet.md)

___

## Properties

<a id="version"></a>

### `<Static>` VERSION

**● VERSION**: *"0.0.0"* = "0.0.0"

*Defined in [src/puppet.ts:100](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L100)*

Must overwrite by child class to identify their version

___
<a id="defaultmaxlisteners"></a>

### `<Static>` defaultMaxListeners

**● defaultMaxListeners**: *`number`*

*Inherited from EventEmitter.defaultMaxListeners*

*Defined in node_modules/@types/node/index.d.ts:1022*

___

## Methods

<a id="addlistener"></a>

###  addListener

▸ **addListener**(event: * `string` &#124; `symbol`*, listener: *`function`*): `this`

*Inherited from EventEmitter.addListener*

*Overrides EventEmitter.addListener*

*Defined in node_modules/@types/node/index.d.ts:1024*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|
| listener | `function` |

**Returns:** `this`

___
<a id="contactalias"></a>

### `<Abstract>` contactAlias

▸ **contactAlias**(contactId: *`string`*): `Promise`<`string`>

▸ **contactAlias**(contactId: *`string`*, alias: * `string` &#124; `null`*): `Promise`<`void`>

*Defined in [src/puppet.ts:460](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L460)*

Contact

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |

**Returns:** `Promise`<`string`>

*Defined in [src/puppet.ts:461](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L461)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |
| alias |  `string` &#124; `null`|

**Returns:** `Promise`<`void`>

___
<a id="contactavatar"></a>

### `<Abstract>` contactAvatar

▸ **contactAvatar**(contactId: *`string`*): `Promise`<`FileBox`>

▸ **contactAvatar**(contactId: *`string`*, file: *`FileBox`*): `Promise`<`void`>

*Defined in [src/puppet.ts:463](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L463)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |

**Returns:** `Promise`<`FileBox`>

*Defined in [src/puppet.ts:464](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L464)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |
| file | `FileBox` |

**Returns:** `Promise`<`void`>

___
<a id="contactlist"></a>

### `<Abstract>` contactList

▸ **contactList**(): `Promise`<`string`[]>

*Defined in [src/puppet.ts:466](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L466)*

**Returns:** `Promise`<`string`[]>

___
<a id="contactpayload"></a>

###  contactPayload

▸ **contactPayload**(contactId: *`string`*): `Promise`<[ContactPayload](../interfaces/contactpayload.md)>

*Defined in [src/puppet.ts:644](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L644)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |

**Returns:** `Promise`<[ContactPayload](../interfaces/contactpayload.md)>

___
<a id="contactqrcode"></a>

### `<Abstract>` contactQrcode

▸ **contactQrcode**(contactId: *`string`*): `Promise`<`string`>

*Defined in [src/puppet.ts:468](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L468)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |

**Returns:** `Promise`<`string`>

___
<a id="contactroomlist"></a>

###  contactRoomList

▸ **contactRoomList**(contactId: *`string`*): `Promise`<`string`[]>

*Defined in [src/puppet.ts:473](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L473)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |

**Returns:** `Promise`<`string`[]>

___
<a id="contactsearch"></a>

###  contactSearch

▸ **contactSearch**(query?: * `string` &#124; [ContactQueryFilter](../interfaces/contactqueryfilter.md)*, searchIdList?: *`string`[]*): `Promise`<`string`[]>

*Defined in [src/puppet.ts:496](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L496)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` query |  `string` &#124; [ContactQueryFilter](../interfaces/contactqueryfilter.md)|
| `Optional` searchIdList | `string`[] |

**Returns:** `Promise`<`string`[]>

___
<a id="contactvalidate"></a>

###  contactValidate

▸ **contactValidate**(contactId: *`string`*): `Promise`<`boolean`>

*Defined in [src/puppet.ts:623](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L623)*

Check a Contact Id if it's still valid. For example: talk to the server, and see if it should be deleted in the local cache.

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |

**Returns:** `Promise`<`boolean`>

___
<a id="ding"></a>

### `<Abstract>` ding

▸ **ding**(data?: * `undefined` &#124; `string`*): `void`

*Defined in [src/puppet.ts:415](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L415)*

Check whether the puppet is work property.

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` data |  `undefined` &#124; `string`|

**Returns:** `void`
`false` if something went wrong
         'dong' if everything is OK

___
<a id="emit"></a>

###  emit

▸ **emit**(event: *"dong"*, data?: * `undefined` &#124; `string`*): `boolean`

▸ **emit**(event: *"error"*, error: *`Error`*): `boolean`

▸ **emit**(event: *"friendship"*, friendshipId: *`string`*): `boolean`

▸ **emit**(event: *"login"*, contactId: *`string`*): `boolean`

▸ **emit**(event: *"logout"*, contactId: *`string`*): `boolean`

▸ **emit**(event: *"message"*, messageId: *`string`*): `boolean`

▸ **emit**(event: *"reset"*, reason: *`string`*): `boolean`

▸ **emit**(event: *"room-join"*, roomId: *`string`*, inviteeIdList: *`string`[]*, inviterId: *`string`*): `boolean`

▸ **emit**(event: *"room-leave"*, roomId: *`string`*, leaverIdList: *`string`[]*, remover?: * `undefined` &#124; `string`*): `boolean`

▸ **emit**(event: *"room-topic"*, roomId: *`string`*, newTopic: *`string`*, oldTopic: *`string`*, changerId: *`string`*): `boolean`

▸ **emit**(event: *"room-invite"*, roomInvitationId: *`string`*): `boolean`

▸ **emit**(event: *"scan"*, qrcode: *`string`*, status: *`number`*, data?: * `undefined` &#124; `string`*): `boolean`

▸ **emit**(event: *"watchdog"*, food: *`WatchdogFood`*): `boolean`

▸ **emit**(event: *`never`*, ...args: *`never`[]*): `never`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:263](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L263)*

Events

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "dong" |
| `Optional` data |  `undefined` &#124; `string`|

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:264](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L264)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" |
| error | `Error` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:265](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L265)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "friendship" |
| friendshipId | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:266](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L266)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "login" |
| contactId | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:267](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L267)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "logout" |
| contactId | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:268](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L268)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "message" |
| messageId | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:269](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L269)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "reset" |
| reason | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:270](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L270)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-join" |
| roomId | `string` |
| inviteeIdList | `string`[] |
| inviterId | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:271](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L271)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-leave" |
| roomId | `string` |
| leaverIdList | `string`[] |
| `Optional` remover |  `undefined` &#124; `string`|

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:272](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L272)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-topic" |
| roomId | `string` |
| newTopic | `string` |
| oldTopic | `string` |
| changerId | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:273](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L273)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-invite" |
| roomInvitationId | `string` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:274](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L274)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "scan" |
| qrcode | `string` |
| status | `number` |
| `Optional` data |  `undefined` &#124; `string`|

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:276](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L276)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "watchdog" |
| food | `WatchdogFood` |

**Returns:** `boolean`

*Overrides EventEmitter.emit*

*Defined in [src/puppet.ts:278](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L278)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `never` |
| `Rest` args | `never`[] |

**Returns:** `never`

___
<a id="eventnames"></a>

###  eventNames

▸ **eventNames**(): `Array`< `string` &#124; `symbol`>

*Inherited from EventEmitter.eventNames*

*Overrides EventEmitter.eventNames*

*Defined in node_modules/@types/node/index.d.ts:1037*

**Returns:** `Array`< `string` &#124; `symbol`>

___
<a id="friendshipaccept"></a>

### `<Abstract>` friendshipAccept

▸ **friendshipAccept**(friendshipId: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:679](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L679)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| friendshipId | `string` |

**Returns:** `Promise`<`void`>

___
<a id="friendshipadd"></a>

### `<Abstract>` friendshipAdd

▸ **friendshipAdd**(contactId: *`string`*, hello?: * `undefined` &#124; `string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:678](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L678)*

Friendship

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactId | `string` |
| `Optional` hello |  `undefined` &#124; `string`|

**Returns:** `Promise`<`void`>

___
<a id="friendshippayload"></a>

###  friendshipPayload

▸ **friendshipPayload**(friendshipId: *`string`*): `Promise`<[FriendshipPayload](../#friendshippayload)>

*Defined in [src/puppet.ts:705](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L705)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| friendshipId | `string` |

**Returns:** `Promise`<[FriendshipPayload](../#friendshippayload)>

___
<a id="getmaxlisteners"></a>

###  getMaxListeners

▸ **getMaxListeners**(): `number`

*Inherited from EventEmitter.getMaxListeners*

*Overrides EventEmitter.getMaxListeners*

*Defined in node_modules/@types/node/index.d.ts:1033*

**Returns:** `number`

___
<a id="listenercount"></a>

###  listenerCount

▸ **listenerCount**(type: * `string` &#124; `symbol`*): `number`

*Inherited from EventEmitter.listenerCount*

*Overrides EventEmitter.listenerCount*

*Defined in node_modules/@types/node/index.d.ts:1038*

**Parameters:**

| Param | Type |
| ------ | ------ |
| type |  `string` &#124; `symbol`|

**Returns:** `number`

___
<a id="listeners"></a>

###  listeners

▸ **listeners**(event: * `string` &#124; `symbol`*): `Function`[]

*Inherited from EventEmitter.listeners*

*Overrides EventEmitter.listeners*

*Defined in node_modules/@types/node/index.d.ts:1034*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|

**Returns:** `Function`[]

___
<a id="logonoff"></a>

###  logonoff

▸ **logonoff**(): `boolean`

*Defined in [src/puppet.ts:395](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L395)*

**Returns:** `boolean`

___
<a id="logout"></a>

### `<Abstract>` logout

▸ **logout**(): `Promise`<`void`>

*Defined in [src/puppet.ts:383](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L383)*

Need to be called internaly/externaly when the puppet need to be logouted this method will emit a `logout` event,

Note: must set `this.id = undefined` in this function.

**Returns:** `Promise`<`void`>

___
<a id="messagefile"></a>

### `<Abstract>` messageFile

▸ **messageFile**(messageId: *`string`*): `Promise`<`FileBox`>

*Defined in [src/puppet.ts:738](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L738)*

Message

**Parameters:**

| Param | Type |
| ------ | ------ |
| messageId | `string` |

**Returns:** `Promise`<`FileBox`>

___
<a id="messageforward"></a>

### `<Abstract>` messageForward

▸ **messageForward**(receiver: *[Receiver](../interfaces/receiver.md)*, messageId: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:739](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L739)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| receiver | [Receiver](../interfaces/receiver.md) |
| messageId | `string` |

**Returns:** `Promise`<`void`>

___
<a id="messagepayload"></a>

###  messagePayload

▸ **messagePayload**(messageId: *`string`*): `Promise`<[MessagePayload](../#messagepayload)>

*Defined in [src/puppet.ts:767](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L767)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| messageId | `string` |

**Returns:** `Promise`<[MessagePayload](../#messagepayload)>

___
<a id="messagesendcontact"></a>

### `<Abstract>` messageSendContact

▸ **messageSendContact**(receiver: *[Receiver](../interfaces/receiver.md)*, contactId: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:741](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L741)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| receiver | [Receiver](../interfaces/receiver.md) |
| contactId | `string` |

**Returns:** `Promise`<`void`>

___
<a id="messagesendfile"></a>

### `<Abstract>` messageSendFile

▸ **messageSendFile**(receiver: *[Receiver](../interfaces/receiver.md)*, file: *`FileBox`*): `Promise`<`void`>

*Defined in [src/puppet.ts:742](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L742)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| receiver | [Receiver](../interfaces/receiver.md) |
| file | `FileBox` |

**Returns:** `Promise`<`void`>

___
<a id="messagesendtext"></a>

### `<Abstract>` messageSendText

▸ **messageSendText**(receiver: *[Receiver](../interfaces/receiver.md)*, text: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:740](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L740)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| receiver | [Receiver](../interfaces/receiver.md) |
| text | `string` |

**Returns:** `Promise`<`void`>

___
<a id="off"></a>

###  off

▸ **off**(event: * `string` &#124; `symbol`*, listener: *`function`*): `this`

*Inherited from EventEmitter.off*

*Overrides EventEmitter.off*

*Defined in node_modules/@types/node/index.d.ts:1030*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|
| listener | `function` |

**Returns:** `this`

___
<a id="on"></a>

###  on

▸ **on**(event: *"dong"*, listener: *`function`*): `this`

▸ **on**(event: *"error"*, listener: *`function`*): `this`

▸ **on**(event: *"friendship"*, listener: *`function`*): `this`

▸ **on**(event: *"login"*, listener: *`function`*): `this`

▸ **on**(event: *"logout"*, listener: *`function`*): `this`

▸ **on**(event: *"message"*, listener: *`function`*): `this`

▸ **on**(event: *"reset"*, listener: *`function`*): `this`

▸ **on**(event: *"room-join"*, listener: *`function`*): `this`

▸ **on**(event: *"room-leave"*, listener: *`function`*): `this`

▸ **on**(event: *"room-topic"*, listener: *`function`*): `this`

▸ **on**(event: *"room-invite"*, listener: *`function`*): `this`

▸ **on**(event: *"scan"*, listener: *`function`*): `this`

▸ **on**(event: *"watchdog"*, listener: *`function`*): `this`

▸ **on**(event: *`never`*, listener: *`never`*): `never`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:294](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L294)*

Listeners

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "dong" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:295](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L295)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "error" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:296](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L296)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "friendship" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:297](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L297)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "login" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:298](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L298)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "logout" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:299](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L299)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "message" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:300](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L300)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "reset" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:301](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L301)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-join" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:302](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L302)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-leave" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:303](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L303)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-topic" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:304](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L304)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "room-invite" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:305](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L305)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "scan" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:307](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L307)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "watchdog" |
| listener | `function` |

**Returns:** `this`

*Overrides EventEmitter.on*

*Defined in [src/puppet.ts:309](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L309)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `never` |
| listener | `never` |

**Returns:** `never`

___
<a id="once"></a>

###  once

▸ **once**(event: * `string` &#124; `symbol`*, listener: *`function`*): `this`

*Inherited from EventEmitter.once*

*Overrides EventEmitter.once*

*Defined in node_modules/@types/node/index.d.ts:1026*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|
| listener | `function` |

**Returns:** `this`

___
<a id="prependlistener"></a>

###  prependListener

▸ **prependListener**(event: * `string` &#124; `symbol`*, listener: *`function`*): `this`

*Inherited from EventEmitter.prependListener*

*Overrides EventEmitter.prependListener*

*Defined in node_modules/@types/node/index.d.ts:1027*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|
| listener | `function` |

**Returns:** `this`

___
<a id="prependoncelistener"></a>

###  prependOnceListener

▸ **prependOnceListener**(event: * `string` &#124; `symbol`*, listener: *`function`*): `this`

*Inherited from EventEmitter.prependOnceListener*

*Overrides EventEmitter.prependOnceListener*

*Defined in node_modules/@types/node/index.d.ts:1028*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|
| listener | `function` |

**Returns:** `this`

___
<a id="rawlisteners"></a>

###  rawListeners

▸ **rawListeners**(event: * `string` &#124; `symbol`*): `Function`[]

*Inherited from EventEmitter.rawListeners*

*Overrides EventEmitter.rawListeners*

*Defined in node_modules/@types/node/index.d.ts:1035*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|

**Returns:** `Function`[]

___
<a id="removealllisteners"></a>

###  removeAllListeners

▸ **removeAllListeners**(event?: * `string` &#124; `symbol`*): `this`

*Inherited from EventEmitter.removeAllListeners*

*Overrides EventEmitter.removeAllListeners*

*Defined in node_modules/@types/node/index.d.ts:1031*

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` event |  `string` &#124; `symbol`|

**Returns:** `this`

___
<a id="removelistener"></a>

###  removeListener

▸ **removeListener**(event: * `string` &#124; `symbol`*, listener: *`function`*): `this`

*Inherited from EventEmitter.removeListener*

*Overrides EventEmitter.removeListener*

*Defined in node_modules/@types/node/index.d.ts:1029*

**Parameters:**

| Param | Type |
| ------ | ------ |
| event |  `string` &#124; `symbol`|
| listener | `function` |

**Returns:** `this`

___
<a id="roomadd"></a>

### `<Abstract>` roomAdd

▸ **roomAdd**(roomId: *`string`*, contactId: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:818](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L818)*

Room

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |
| contactId | `string` |

**Returns:** `Promise`<`void`>

___
<a id="roomannounce"></a>

### `<Abstract>` roomAnnounce

▸ **roomAnnounce**(roomId: *`string`*): `Promise`<`string`>

▸ **roomAnnounce**(roomId: *`string`*, text: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:839](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L839)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<`string`>

*Defined in [src/puppet.ts:840](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L840)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |
| text | `string` |

**Returns:** `Promise`<`void`>

___
<a id="roomavatar"></a>

### `<Abstract>` roomAvatar

▸ **roomAvatar**(roomId: *`string`*): `Promise`<`FileBox`>

*Defined in [src/puppet.ts:819](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L819)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<`FileBox`>

___
<a id="roomcreate"></a>

### `<Abstract>` roomCreate

▸ **roomCreate**(contactIdList: *`string`[]*, topic?: * `undefined` &#124; `string`*): `Promise`<`string`>

*Defined in [src/puppet.ts:820](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L820)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| contactIdList | `string`[] |
| `Optional` topic |  `undefined` &#124; `string`|

**Returns:** `Promise`<`string`>

___
<a id="roomdel"></a>

### `<Abstract>` roomDel

▸ **roomDel**(roomId: *`string`*, contactId: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:821](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L821)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |
| contactId | `string` |

**Returns:** `Promise`<`void`>

___
<a id="roominvitationaccept"></a>

### `<Abstract>` roomInvitationAccept

▸ **roomInvitationAccept**(roomInvitationId: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:801](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L801)*

Room Invitation

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomInvitationId | `string` |

**Returns:** `Promise`<`void`>

___
<a id="roominvitationpayload"></a>

###  roomInvitationPayload

▸ **roomInvitationPayload**(roomInvitationId: *`string`*): `Promise`<[RoomInvitationPayload](../interfaces/roominvitationpayload.md)>

*Defined in [src/puppet.ts:806](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L806)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomInvitationId | `string` |

**Returns:** `Promise`<[RoomInvitationPayload](../interfaces/roominvitationpayload.md)>

___
<a id="roomlist"></a>

### `<Abstract>` roomList

▸ **roomList**(): `Promise`<`string`[]>

*Defined in [src/puppet.ts:830](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L830)*

**Returns:** `Promise`<`string`[]>

___
<a id="roommemberlist"></a>

### `<Abstract>` roomMemberList

▸ **roomMemberList**(roomId: *`string`*): `Promise`<`string`[]>

*Defined in [src/puppet.ts:831](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L831)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<`string`[]>

___
<a id="roommemberpayload"></a>

###  roomMemberPayload

▸ **roomMemberPayload**(roomId: *`string`*, contactId: *`string`*): `Promise`<[RoomMemberPayload](../interfaces/roommemberpayload.md)>

*Defined in [src/puppet.ts:1075](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L1075)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |
| contactId | `string` |

**Returns:** `Promise`<[RoomMemberPayload](../interfaces/roommemberpayload.md)>

___
<a id="roommembersearch"></a>

###  roomMemberSearch

▸ **roomMemberSearch**(roomId: *`string`*, query: *  `string` &#124; `unique symbol`&#124; [RoomMemberQueryFilter](../interfaces/roommemberqueryfilter.md)*): `Promise`<`string`[]>

*Defined in [src/puppet.ts:842](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L842)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |
| query |   `string` &#124; `unique symbol`&#124; [RoomMemberQueryFilter](../interfaces/roommemberqueryfilter.md)|

**Returns:** `Promise`<`string`[]>

___
<a id="roompayload"></a>

###  roomPayload

▸ **roomPayload**(roomId: *`string`*): `Promise`<[RoomPayload](../interfaces/roompayload.md)>

*Defined in [src/puppet.ts:1024](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L1024)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<[RoomPayload](../interfaces/roompayload.md)>

___
<a id="roomqrcode"></a>

### `<Abstract>` roomQrcode

▸ **roomQrcode**(roomId: *`string`*): `Promise`<`string`>

*Defined in [src/puppet.ts:828](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L828)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<`string`>

___
<a id="roomquit"></a>

### `<Abstract>` roomQuit

▸ **roomQuit**(roomId: *`string`*): `Promise`<`void`>

*Defined in [src/puppet.ts:822](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L822)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<`void`>

___
<a id="roomsearch"></a>

###  roomSearch

▸ **roomSearch**(query?: *[RoomQueryFilter](../interfaces/roomqueryfilter.md)*): `Promise`<`string`[]>

*Defined in [src/puppet.ts:922](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L922)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` query | [RoomQueryFilter](../interfaces/roomqueryfilter.md) |

**Returns:** `Promise`<`string`[]>

___
<a id="roomtopic"></a>

### `<Abstract>` roomTopic

▸ **roomTopic**(roomId: *`string`*): `Promise`<`string`>

▸ **roomTopic**(roomId: *`string`*, topic: *`string`*): `Promise`<`void`>

▸ **roomTopic**(roomId: *`string`*, topic?: * `undefined` &#124; `string`*): `Promise`< `string` &#124; `void`>

*Defined in [src/puppet.ts:824](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L824)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<`string`>

*Defined in [src/puppet.ts:825](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L825)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |
| topic | `string` |

**Returns:** `Promise`<`void`>

*Defined in [src/puppet.ts:826](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L826)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |
| `Optional` topic |  `undefined` &#124; `string`|

**Returns:** `Promise`< `string` &#124; `void`>

___
<a id="roomvalidate"></a>

###  roomValidate

▸ **roomValidate**(roomId: *`string`*): `Promise`<`boolean`>

*Defined in [src/puppet.ts:999](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L999)*

Check a Room Id if it's still valid. For example: talk to the server, and see if it should be deleted in the local cache.

**Parameters:**

| Param | Type |
| ------ | ------ |
| roomId | `string` |

**Returns:** `Promise`<`boolean`>

___
<a id="selfid"></a>

###  selfId

▸ **selfId**(): `string`

*Defined in [src/puppet.ts:385](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L385)*

**Returns:** `string`

___
<a id="setmaxlisteners"></a>

###  setMaxListeners

▸ **setMaxListeners**(n: *`number`*): `this`

*Inherited from EventEmitter.setMaxListeners*

*Overrides EventEmitter.setMaxListeners*

*Defined in node_modules/@types/node/index.d.ts:1032*

**Parameters:**

| Param | Type |
| ------ | ------ |
| n | `number` |

**Returns:** `this`

___
<a id="setmemory"></a>

### `<Private>` setMemory

▸ **setMemory**(memory: *`MemoryCard`*): `void`

*Defined in [src/puppet.ts:246](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L246)*

**Parameters:**

| Param | Type |
| ------ | ------ |
| memory | `MemoryCard` |

**Returns:** `void`

___
<a id="start"></a>

### `<Abstract>` start

▸ **start**(): `Promise`<`void`>

*Defined in [src/puppet.ts:326](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L326)*

Start / Stop

**Returns:** `Promise`<`void`>

___
<a id="stop"></a>

### `<Abstract>` stop

▸ **stop**(): `Promise`<`void`>

*Defined in [src/puppet.ts:327](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L327)*

**Returns:** `Promise`<`void`>

___
<a id="tostring"></a>

###  toString

▸ **toString**(): `string`

*Defined in [src/puppet.ts:220](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L220)*

**Returns:** `string`

___
<a id="unref"></a>

###  unref

▸ **unref**(): `void`

*Defined in [src/puppet.ts:236](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L236)*

Unref

**Returns:** `void`

___
<a id="version-1"></a>

###  version

▸ **version**(): `string`

*Defined in [src/puppet.ts:420](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L420)*

Get version from the Puppet Implementation

**Returns:** `string`

___
<a id="wechatyversionrange"></a>

###  wechatyVersionRange

▸ **wechatyVersionRange**(strict?: *`boolean`*): `string`

*Defined in [src/puppet.ts:430](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/puppet.ts#L430)*

will be used by semver.satisfied(version, range)

**Parameters:**

| Param | Type | Default value |
| ------ | ------ | ------ |
| `Default value` strict | `boolean` | false |

**Returns:** `string`

___
<a id="listenercount-1"></a>

### `<Static>` listenerCount

▸ **listenerCount**(emitter: *`EventEmitter`*, event: * `string` &#124; `symbol`*): `number`

*Inherited from EventEmitter.listenerCount*

*Defined in node_modules/@types/node/index.d.ts:1021*

*__deprecated__*: since v4.0.0

**Parameters:**

| Param | Type |
| ------ | ------ |
| emitter | `EventEmitter` |
| event |  `string` &#124; `symbol`|

**Returns:** `number`

___

