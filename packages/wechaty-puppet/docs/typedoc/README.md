
#  Wechaty Puppet v0.9.8 Interface

## Index

### Enumerations

* [ContactGender](enums/contactgender.md)
* [ContactType](enums/contacttype.md)
* [FriendshipType](enums/friendshiptype.md)
* [MessageType](enums/messagetype.md)

### Classes

* [Puppet](classes/puppet.md)

### Interfaces

* [ContactPayload](interfaces/contactpayload.md)
* [ContactQueryFilter](interfaces/contactqueryfilter.md)
* [FriendshipPayloadBase](interfaces/friendshippayloadbase.md)
* [MessagePayloadBase](interfaces/messagepayloadbase.md)
* [MessagePayloadRoom](interfaces/messagepayloadroom.md)
* [MessagePayloadTo](interfaces/messagepayloadto.md)
* [PuppetOptions](interfaces/puppetoptions.md)
* [PuppetQrcodeScanEvent](interfaces/puppetqrcodescanevent.md)
* [PuppetRoomInviteEvent](interfaces/puppetroominviteevent.md)
* [PuppetRoomJoinEvent](interfaces/puppetroomjoinevent.md)
* [PuppetRoomLeaveEvent](interfaces/puppetroomleaveevent.md)
* [PuppetRoomTopicEvent](interfaces/puppetroomtopicevent.md)
* [Receiver](interfaces/receiver.md)
* [RoomInvitationPayload](interfaces/roominvitationpayload.md)
* [RoomMemberPayload](interfaces/roommemberpayload.md)
* [RoomMemberQueryFilter](interfaces/roommemberqueryfilter.md)
* [RoomPayload](interfaces/roompayload.md)
* [RoomQueryFilter](interfaces/roomqueryfilter.md)

### Type aliases

* [ChatEventName](#chateventname)
* [ContactPayloadFilterFactory](#contactpayloadfilterfactory)
* [ContactPayloadFilterFunction](#contactpayloadfilterfunction)
* [FriendshipPayload](#friendshippayload)
* [FriendshipPayloadConfirm](#friendshippayloadconfirm)
* [FriendshipPayloadReceive](#friendshippayloadreceive)
* [FriendshipPayloadVerify](#friendshippayloadverify)
* [MessagePayload](#messagepayload)
* [PuppetEventName](#puppeteventname)
* [RoomPayloadFilterFactory](#roompayloadfilterfactory)
* [RoomPayloadFilterFunction](#roompayloadfilterfunction)

### Variables

* [VERSION](#version)
* [YOU](#you)

### Object literals

* [CHAT_EVENT_DICT](#chat_event_dict)
* [PUPPET_EVENT_DICT](#puppet_event_dict)

---

## Type aliases

<a id="chateventname"></a>

###  ChatEventName

**ΤChatEventName**: *`keyof object`*

*Defined in [schemas/puppet.ts:54](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L54)*

___
<a id="contactpayloadfilterfactory"></a>

###  ContactPayloadFilterFactory

**ΤContactPayloadFilterFactory**: *`function`*

*Defined in [schemas/contact.ts:36](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/contact.ts#L36)*

#### Type declaration
▸(query: *[ContactQueryFilter](interfaces/contactqueryfilter.md)*): [ContactPayloadFilterFunction](#contactpayloadfilterfunction)

**Parameters:**

| Param | Type |
| ------ | ------ |
| query | [ContactQueryFilter](interfaces/contactqueryfilter.md) |

**Returns:** [ContactPayloadFilterFunction](#contactpayloadfilterfunction)

___
<a id="contactpayloadfilterfunction"></a>

###  ContactPayloadFilterFunction

**ΤContactPayloadFilterFunction**: *`function`*

*Defined in [schemas/contact.ts:35](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/contact.ts#L35)*

#### Type declaration
▸(payload: *[ContactPayload](interfaces/contactpayload.md)*): `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| payload | [ContactPayload](interfaces/contactpayload.md) |

**Returns:** `boolean`

___
<a id="friendshippayload"></a>

###  FriendshipPayload

**ΤFriendshipPayload**: * [FriendshipPayloadConfirm](#friendshippayloadconfirm) &#124; [FriendshipPayloadReceive](#friendshippayloadreceive) &#124; [FriendshipPayloadVerify](#friendshippayloadverify)
*

*Defined in [schemas/friendship.ts:29](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/friendship.ts#L29)*

___
<a id="friendshippayloadconfirm"></a>

###  FriendshipPayloadConfirm

**ΤFriendshipPayloadConfirm**: * [FriendshipPayloadBase](interfaces/friendshippayloadbase.md) & `object`
*

*Defined in [schemas/friendship.ts:15](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/friendship.ts#L15)*

___
<a id="friendshippayloadreceive"></a>

###  FriendshipPayloadReceive

**ΤFriendshipPayloadReceive**: * [FriendshipPayloadBase](interfaces/friendshippayloadbase.md) & `object`
*

*Defined in [schemas/friendship.ts:19](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/friendship.ts#L19)*

___
<a id="friendshippayloadverify"></a>

###  FriendshipPayloadVerify

**ΤFriendshipPayloadVerify**: * [FriendshipPayloadBase](interfaces/friendshippayloadbase.md) & `object`
*

*Defined in [schemas/friendship.ts:25](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/friendship.ts#L25)*

___
<a id="messagepayload"></a>

###  MessagePayload

**ΤMessagePayload**: * [MessagePayloadBase](interfaces/messagepayloadbase.md) &  [MessagePayloadRoom](interfaces/messagepayloadroom.md) &#124; [MessagePayloadTo](interfaces/messagepayloadto.md)

*

*Defined in [schemas/message.ts:34](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/message.ts#L34)*

___
<a id="puppeteventname"></a>

###  PuppetEventName

**ΤPuppetEventName**: *`keyof object`*

*Defined in [schemas/puppet.ts:64](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L64)*

___
<a id="roompayloadfilterfactory"></a>

###  RoomPayloadFilterFactory

**ΤRoomPayloadFilterFactory**: *`function`*

*Defined in [schemas/room.ts:29](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/room.ts#L29)*

#### Type declaration
▸(query: *[RoomQueryFilter](interfaces/roomqueryfilter.md)*): [RoomPayloadFilterFunction](#roompayloadfilterfunction)

**Parameters:**

| Param | Type |
| ------ | ------ |
| query | [RoomQueryFilter](interfaces/roomqueryfilter.md) |

**Returns:** [RoomPayloadFilterFunction](#roompayloadfilterfunction)

___
<a id="roompayloadfilterfunction"></a>

###  RoomPayloadFilterFunction

**ΤRoomPayloadFilterFunction**: *`function`*

*Defined in [schemas/room.ts:28](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/room.ts#L28)*

#### Type declaration
▸(payload: *[RoomPayload](interfaces/roompayload.md)*): `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| payload | [RoomPayload](interfaces/roompayload.md) |

**Returns:** `boolean`

___

## Variables

<a id="version"></a>

### `<Const>` VERSION

**● VERSION**: *`string`* =  pkg.version

*Defined in [config.ts:11](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/config.ts#L11)*

___
<a id="you"></a>

### `<Const>` YOU

**● YOU**: *`unique symbol`* =  Symbol('You')

*Defined in [schemas/puppet.ts:11](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L11)*
*Defined in [schemas/puppet.ts:12](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L12)*

This is used internally to as a placeholder for the bot name.

For example: we should replace '你' and 'You' to YOU.

See: [https://github.com/Microsoft/TypeScript/issues/20898#issuecomment-354073352](https://github.com/Microsoft/TypeScript/issues/20898#issuecomment-354073352)

___

## Object literals

<a id="chat_event_dict"></a>

### `<Const>` CHAT_EVENT_DICT

**CHAT_EVENT_DICT**: *`object`*

*Defined in [schemas/puppet.ts:43](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L43)*

<a id="chat_event_dict.friendship"></a>

####  friendship

**● friendship**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:44](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L44)*

___
<a id="chat_event_dict.login"></a>

####  login

**● login**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:45](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L45)*

___
<a id="chat_event_dict.logout"></a>

####  logout

**● logout**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:46](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L46)*

___
<a id="chat_event_dict.message"></a>

####  message

**● message**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:47](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L47)*

___
<a id="chat_event_dict.room_invite"></a>

####  room-invite

**● room-invite**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:48](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L48)*

___
<a id="chat_event_dict.room_join"></a>

####  room-join

**● room-join**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:49](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L49)*

___
<a id="chat_event_dict.room_leave"></a>

####  room-leave

**● room-leave**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:50](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L50)*

___
<a id="chat_event_dict.room_topic"></a>

####  room-topic

**● room-topic**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:51](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L51)*

___
<a id="chat_event_dict.scan"></a>

####  scan

**● scan**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:52](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L52)*

___

___
<a id="puppet_event_dict"></a>

### `<Const>` PUPPET_EVENT_DICT

**PUPPET_EVENT_DICT**: *`object`*

*Defined in [schemas/puppet.ts:56](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L56)*

<a id="puppet_event_dict.dong"></a>

####  dong

**● dong**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:58](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L58)*

___
<a id="puppet_event_dict.error"></a>

####  error

**● error**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:59](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L59)*

___
<a id="puppet_event_dict.reset"></a>

####  reset

**● reset**: *`string`* = "push to reset!"

*Defined in [schemas/puppet.ts:60](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L60)*

___
<a id="puppet_event_dict.watchdog"></a>

####  watchdog

**● watchdog**: *`string`* = "todo: explain what this event is"

*Defined in [schemas/puppet.ts:61](https://github.com/Chatie/wechaty-puppet/blob/e056248/src/schemas/puppet.ts#L61)*

___

___

