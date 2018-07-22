
#  Wechaty Puppet v0.9.12 Interface

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
* [FriendshipPayload](#friendshippayload)
* [MessagePayload](#messagepayload)
* [PuppetEventName](#puppeteventname)

### Variables

* [VERSION](#version)
* [YOU](#you)

---

## Type aliases

<a id="chateventname"></a>

###  ChatEventName

**ΤChatEventName**: *`keyof object`*

*Defined in [src/schemas/puppet.ts:55](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/schemas/puppet.ts#L55)*

___
<a id="friendshippayload"></a>

###  FriendshipPayload

**ΤFriendshipPayload**: * `FriendshipPayloadConfirm` &#124; `FriendshipPayloadReceive` &#124; `FriendshipPayloadVerify`
*

*Defined in [src/schemas/friendship.ts:33](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/schemas/friendship.ts#L33)*

___
<a id="messagepayload"></a>

###  MessagePayload

**ΤMessagePayload**: * `MessagePayloadBase` &  `MessagePayloadRoom` &#124; `MessagePayloadTo`

*

*Defined in [src/schemas/message.ts:37](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/schemas/message.ts#L37)*

___
<a id="puppeteventname"></a>

###  PuppetEventName

**ΤPuppetEventName**: *`keyof object`*

*Defined in [src/schemas/puppet.ts:66](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/schemas/puppet.ts#L66)*

___

## Variables

<a id="version"></a>

### `<Const>` VERSION

**● VERSION**: *`string`* =  pkg.version

*Defined in [src/config.ts:11](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/config.ts#L11)*

___
<a id="you"></a>

### `<Const>` YOU

**● YOU**: *`unique symbol`* =  Symbol('You')

*Defined in [src/schemas/puppet.ts:11](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/schemas/puppet.ts#L11)*
*Defined in [src/schemas/puppet.ts:12](https://github.com/Chatie/wechaty-puppet/blob/53150e3/src/schemas/puppet.ts#L12)*

This is used internally to as a placeholder for the bot name.

For example: we should replace '你' and 'You' to YOU.

See: [https://github.com/Microsoft/TypeScript/issues/20898#issuecomment-354073352](https://github.com/Microsoft/TypeScript/issues/20898#issuecomment-354073352)

___

