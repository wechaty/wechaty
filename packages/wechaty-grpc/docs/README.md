# Protocol Documentation
<a name="top"></a>

## Table of Contents

- [wechaty/puppet.proto](#wechaty/puppet.proto)
    - [Puppet](#wechaty.Puppet)
  
- [Scalar Value Types](#scalar-value-types)



<a name="wechaty/puppet.proto"></a>
<p align="right"><a href="#top">Top</a></p>

## wechaty/puppet.proto
Wechaty Puppet gRPC Protocol Buffers
 https://github.com/wechaty/grpc/
 Huan LI &lt;zixia@zixia.net&gt;
 Apr 2018
 License: Apache-2.0

Google Protocol Buffers
 Style Guide - https://developers.google.com/protocol-buffers/docs/style

 

 

 


<a name="wechaty.Puppet"></a>

### Puppet


| Method Name | Request Type | Response Type | Description |
| ----------- | ------------ | ------------- | ------------|
| Start | [puppet.StartRequest](#wechaty.puppet.StartRequest) | [puppet.StartResponse](#wechaty.puppet.StartResponse) | Base |
| Stop | [puppet.StopRequest](#wechaty.puppet.StopRequest) | [puppet.StopResponse](#wechaty.puppet.StopResponse) |  |
| Logout | [puppet.LogoutRequest](#wechaty.puppet.LogoutRequest) | [puppet.LogoutResponse](#wechaty.puppet.LogoutResponse) |  |
| Ding | [puppet.DingRequest](#wechaty.puppet.DingRequest) | [puppet.DingResponse](#wechaty.puppet.DingResponse) |  |
| Version | [puppet.VersionRequest](#wechaty.puppet.VersionRequest) | [puppet.VersionResponse](#wechaty.puppet.VersionResponse) |  |
| Event | [puppet.EventRequest](#wechaty.puppet.EventRequest) | [puppet.EventResponse](#wechaty.puppet.EventResponse) stream | Event - Server Stream |
| DirtyPayload | [puppet.DirtyPayloadRequest](#wechaty.puppet.DirtyPayloadRequest) | [puppet.DirtyPayloadResponse](#wechaty.puppet.DirtyPayloadResponse) |  |
| ContactSelfQRCode | [puppet.ContactSelfQRCodeRequest](#wechaty.puppet.ContactSelfQRCodeRequest) | [puppet.ContactSelfQRCodeResponse](#wechaty.puppet.ContactSelfQRCodeResponse) | Contact Self |
| ContactSelfName | [puppet.ContactSelfNameRequest](#wechaty.puppet.ContactSelfNameRequest) | [puppet.ContactSelfNameResponse](#wechaty.puppet.ContactSelfNameResponse) |  |
| ContactSelfSignature | [puppet.ContactSelfSignatureRequest](#wechaty.puppet.ContactSelfSignatureRequest) | [puppet.ContactSelfSignatureResponse](#wechaty.puppet.ContactSelfSignatureResponse) |  |
| ContactPayload | [puppet.ContactPayloadRequest](#wechaty.puppet.ContactPayloadRequest) | [puppet.ContactPayloadResponse](#wechaty.puppet.ContactPayloadResponse) | Contact |
| ContactAlias | [puppet.ContactAliasRequest](#wechaty.puppet.ContactAliasRequest) | [puppet.ContactAliasResponse](#wechaty.puppet.ContactAliasResponse) |  |
| ContactAvatar | [puppet.ContactAvatarRequest](#wechaty.puppet.ContactAvatarRequest) | [puppet.ContactAvatarResponse](#wechaty.puppet.ContactAvatarResponse) |  |
| ContactPhone | [puppet.ContactPhoneRequest](#wechaty.puppet.ContactPhoneRequest) | [puppet.ContactPhoneResponse](#wechaty.puppet.ContactPhoneResponse) |  |
| ContactCorporationRemark | [puppet.ContactCorporationRemarkRequest](#wechaty.puppet.ContactCorporationRemarkRequest) | [puppet.ContactCorporationRemarkResponse](#wechaty.puppet.ContactCorporationRemarkResponse) |  |
| ContactDescription | [puppet.ContactDescriptionRequest](#wechaty.puppet.ContactDescriptionRequest) | [puppet.ContactDescriptionResponse](#wechaty.puppet.ContactDescriptionResponse) |  |
| ContactList | [puppet.ContactListRequest](#wechaty.puppet.ContactListRequest) | [puppet.ContactListResponse](#wechaty.puppet.ContactListResponse) | Huan(202002): consider changing response to a stream in the future for better performance |
| FriendshipPayload | [puppet.FriendshipPayloadRequest](#wechaty.puppet.FriendshipPayloadRequest) | [puppet.FriendshipPayloadResponse](#wechaty.puppet.FriendshipPayloadResponse) | Friendship |
| FriendshipSearchPhone | [puppet.FriendshipSearchPhoneRequest](#wechaty.puppet.FriendshipSearchPhoneRequest) | [puppet.FriendshipSearchPhoneResponse](#wechaty.puppet.FriendshipSearchPhoneResponse) |  |
| FriendshipSearchWeixin | [puppet.FriendshipSearchWeixinRequest](#wechaty.puppet.FriendshipSearchWeixinRequest) | [puppet.FriendshipSearchWeixinResponse](#wechaty.puppet.FriendshipSearchWeixinResponse) |  |
| FriendshipAdd | [puppet.FriendshipAddRequest](#wechaty.puppet.FriendshipAddRequest) | [puppet.FriendshipAddResponse](#wechaty.puppet.FriendshipAddResponse) |  |
| FriendshipAccept | [puppet.FriendshipAcceptRequest](#wechaty.puppet.FriendshipAcceptRequest) | [puppet.FriendshipAcceptResponse](#wechaty.puppet.FriendshipAcceptResponse) |  |
| MessageFile | [puppet.MessageFileRequest](#wechaty.puppet.MessageFileRequest) | [puppet.MessageFileResponse](#wechaty.puppet.MessageFileResponse) | @deprecated: using MessageFileStream to transfer files Huan(202010): will be removed (replaced by MessageFileStream) after Dec 31, 2021 |
| MessageImage | [puppet.MessageImageRequest](#wechaty.puppet.MessageImageRequest) | [puppet.MessageImageResponse](#wechaty.puppet.MessageImageResponse) | @deprecated: using MessageImageStream to transfer images Huan(202010): will be removed (replaced by MessageImageStream) after Dec 31, 2021 |
| MessageSendFile | [puppet.MessageSendFileRequest](#wechaty.puppet.MessageSendFileRequest) | [puppet.MessageSendFileResponse](#wechaty.puppet.MessageSendFileResponse) | @deprecated: using MesageSendFileStream to transfer file message to server Huan(202010): will be removed (replaced by MessageSendFileStream) after Dec 31, 2021 |
| MessagePayload | [puppet.MessagePayloadRequest](#wechaty.puppet.MessagePayloadRequest) | [puppet.MessagePayloadResponse](#wechaty.puppet.MessagePayloadResponse) |  |
| MessageContact | [puppet.MessageContactRequest](#wechaty.puppet.MessageContactRequest) | [puppet.MessageContactResponse](#wechaty.puppet.MessageContactResponse) |  |
| MessageFileStream | [puppet.MessageFileStreamRequest](#wechaty.puppet.MessageFileStreamRequest) | [puppet.MessageFileStreamResponse](#wechaty.puppet.MessageFileStreamResponse) stream |  |
| MessageImageStream | [puppet.MessageImageStreamRequest](#wechaty.puppet.MessageImageStreamRequest) | [puppet.MessageImageStreamResponse](#wechaty.puppet.MessageImageStreamResponse) stream |  |
| MessageMiniProgram | [puppet.MessageMiniProgramRequest](#wechaty.puppet.MessageMiniProgramRequest) | [puppet.MessageMiniProgramResponse](#wechaty.puppet.MessageMiniProgramResponse) |  |
| MessageUrl | [puppet.MessageUrlRequest](#wechaty.puppet.MessageUrlRequest) | [puppet.MessageUrlResponse](#wechaty.puppet.MessageUrlResponse) |  |
| MessageRecall | [puppet.MessageRecallRequest](#wechaty.puppet.MessageRecallRequest) | [puppet.MessageRecallResponse](#wechaty.puppet.MessageRecallResponse) |  |
| MessageForward | [puppet.MessageForwardRequest](#wechaty.puppet.MessageForwardRequest) | [puppet.MessageForwardResponse](#wechaty.puppet.MessageForwardResponse) |  |
| MessageSendContact | [puppet.MessageSendContactRequest](#wechaty.puppet.MessageSendContactRequest) | [puppet.MessageSendContactResponse](#wechaty.puppet.MessageSendContactResponse) |  |
| MessageSendFileStream | [puppet.MessageSendFileStreamRequest](#wechaty.puppet.MessageSendFileStreamRequest) stream | [puppet.MessageSendFileStreamResponse](#wechaty.puppet.MessageSendFileStreamResponse) |  |
| MessageSendText | [puppet.MessageSendTextRequest](#wechaty.puppet.MessageSendTextRequest) | [puppet.MessageSendTextResponse](#wechaty.puppet.MessageSendTextResponse) |  |
| MessageSendMiniProgram | [puppet.MessageSendMiniProgramRequest](#wechaty.puppet.MessageSendMiniProgramRequest) | [puppet.MessageSendMiniProgramResponse](#wechaty.puppet.MessageSendMiniProgramResponse) |  |
| MessageSendUrl | [puppet.MessageSendUrlRequest](#wechaty.puppet.MessageSendUrlRequest) | [puppet.MessageSendUrlResponse](#wechaty.puppet.MessageSendUrlResponse) |  |
| RoomPayload | [puppet.RoomPayloadRequest](#wechaty.puppet.RoomPayloadRequest) | [puppet.RoomPayloadResponse](#wechaty.puppet.RoomPayloadResponse) | Room |
| RoomList | [puppet.RoomListRequest](#wechaty.puppet.RoomListRequest) | [puppet.RoomListResponse](#wechaty.puppet.RoomListResponse) |  |
| RoomAdd | [puppet.RoomAddRequest](#wechaty.puppet.RoomAddRequest) | [puppet.RoomAddResponse](#wechaty.puppet.RoomAddResponse) |  |
| RoomAvatar | [puppet.RoomAvatarRequest](#wechaty.puppet.RoomAvatarRequest) | [puppet.RoomAvatarResponse](#wechaty.puppet.RoomAvatarResponse) |  |
| RoomCreate | [puppet.RoomCreateRequest](#wechaty.puppet.RoomCreateRequest) | [puppet.RoomCreateResponse](#wechaty.puppet.RoomCreateResponse) |  |
| RoomDel | [puppet.RoomDelRequest](#wechaty.puppet.RoomDelRequest) | [puppet.RoomDelResponse](#wechaty.puppet.RoomDelResponse) |  |
| RoomQuit | [puppet.RoomQuitRequest](#wechaty.puppet.RoomQuitRequest) | [puppet.RoomQuitResponse](#wechaty.puppet.RoomQuitResponse) |  |
| RoomTopic | [puppet.RoomTopicRequest](#wechaty.puppet.RoomTopicRequest) | [puppet.RoomTopicResponse](#wechaty.puppet.RoomTopicResponse) |  |
| RoomQRCode | [puppet.RoomQRCodeRequest](#wechaty.puppet.RoomQRCodeRequest) | [puppet.RoomQRCodeResponse](#wechaty.puppet.RoomQRCodeResponse) |  |
| RoomAnnounce | [puppet.RoomAnnounceRequest](#wechaty.puppet.RoomAnnounceRequest) | [puppet.RoomAnnounceResponse](#wechaty.puppet.RoomAnnounceResponse) |  |
| RoomMemberPayload | [puppet.RoomMemberPayloadRequest](#wechaty.puppet.RoomMemberPayloadRequest) | [puppet.RoomMemberPayloadResponse](#wechaty.puppet.RoomMemberPayloadResponse) | Room Member |
| RoomMemberList | [puppet.RoomMemberListRequest](#wechaty.puppet.RoomMemberListRequest) | [puppet.RoomMemberListResponse](#wechaty.puppet.RoomMemberListResponse) |  |
| RoomInvitationPayload | [puppet.RoomInvitationPayloadRequest](#wechaty.puppet.RoomInvitationPayloadRequest) | [puppet.RoomInvitationPayloadResponse](#wechaty.puppet.RoomInvitationPayloadResponse) | Room Invitation |
| RoomInvitationAccept | [puppet.RoomInvitationAcceptRequest](#wechaty.puppet.RoomInvitationAcceptRequest) | [puppet.RoomInvitationAcceptResponse](#wechaty.puppet.RoomInvitationAcceptResponse) |  |
| TagContactAdd | [puppet.TagContactAddRequest](#wechaty.puppet.TagContactAddRequest) | [puppet.TagContactAddResponse](#wechaty.puppet.TagContactAddResponse) | Tag |
| TagContactRemove | [puppet.TagContactRemoveRequest](#wechaty.puppet.TagContactRemoveRequest) | [puppet.TagContactRemoveResponse](#wechaty.puppet.TagContactRemoveResponse) |  |
| TagContactDelete | [puppet.TagContactDeleteRequest](#wechaty.puppet.TagContactDeleteRequest) | [puppet.TagContactDeleteResponse](#wechaty.puppet.TagContactDeleteResponse) | Operate Sub-Collections https://cloud.google.com/apis/design/design_patterns#list_sub-collections |
| TagContactList | [puppet.TagContactListRequest](#wechaty.puppet.TagContactListRequest) | [puppet.TagContactListResponse](#wechaty.puppet.TagContactListResponse) |  |

 



## Scalar Value Types

| .proto Type | Notes | C++ | Java | Python | Go | C# | PHP | Ruby |
| ----------- | ----- | --- | ---- | ------ | -- | -- | --- | ---- |
| <a name="double" /> double |  | double | double | float | float64 | double | float | Float |
| <a name="float" /> float |  | float | float | float | float32 | float | float | Float |
| <a name="int32" /> int32 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint32 instead. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="int64" /> int64 | Uses variable-length encoding. Inefficient for encoding negative numbers – if your field is likely to have negative values, use sint64 instead. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="uint32" /> uint32 | Uses variable-length encoding. | uint32 | int | int/long | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="uint64" /> uint64 | Uses variable-length encoding. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum or Fixnum (as required) |
| <a name="sint32" /> sint32 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int32s. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sint64" /> sint64 | Uses variable-length encoding. Signed int value. These more efficiently encode negative numbers than regular int64s. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="fixed32" /> fixed32 | Always four bytes. More efficient than uint32 if values are often greater than 2^28. | uint32 | int | int | uint32 | uint | integer | Bignum or Fixnum (as required) |
| <a name="fixed64" /> fixed64 | Always eight bytes. More efficient than uint64 if values are often greater than 2^56. | uint64 | long | int/long | uint64 | ulong | integer/string | Bignum |
| <a name="sfixed32" /> sfixed32 | Always four bytes. | int32 | int | int | int32 | int | integer | Bignum or Fixnum (as required) |
| <a name="sfixed64" /> sfixed64 | Always eight bytes. | int64 | long | int/long | int64 | long | integer/string | Bignum |
| <a name="bool" /> bool |  | bool | boolean | boolean | bool | bool | boolean | TrueClass/FalseClass |
| <a name="string" /> string | A string must always contain UTF-8 encoded or 7-bit ASCII text. | string | String | str/unicode | string | string | string | String (UTF-8) |
| <a name="bytes" /> bytes | May contain any arbitrary sequence of bytes. | string | ByteString | str | []byte | ByteString | string | String (ASCII-8BIT) |

