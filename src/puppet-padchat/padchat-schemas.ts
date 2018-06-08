/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import {
  ContactGender,
}                 from '../puppet/'

// 1 when use WXSyncContact, 0 when use WXGetContact
export enum PadchatContactRoomStatus {
  Get  = 0,
  Sync = 1,
}

export enum PadchatRoomMemberStatus {
  Todo,
}

export enum PadchatMessageMsgType {
  Five = 5,
}

export enum PadchatMessageStatus {
  One = 1,
}

export enum PadchatStatus {
  One  = 1,
}

export enum PadchatContactMsgType {
  Contact  = 2,
  N11_2048 = 2048,
}

export enum PadchatMsgType {
  N11_2048  = 2048,  // 2048   = 1 << 11
  N15_32768 = 32768, // 32768  = 1 << 15
}

export enum PadchatContinue {
  Done = 0,   // Load Ready
  Go   = 1,   // NOT Load Ready
}

// 2 Female, 1 Male, 0 Not Known
// The same as ContactGender.
// export enum PadchatContactGender {
//   Unknown = 0,
//   Male    = 1,
//   Female ,
// }

export enum PadchatPayloadType {
  Logout = -1, // -1 when logout
}

export interface PadchatPayload {
  msg_type? : PadchatMsgType,
  continue? : PadchatContinue,
  status?   : PadchatStatus,

  type    : PadchatPayloadType,   // -1 when logout
  msg?    : string,               // '掉线了' when logout
  apiName : string,               // raw function name
  data    : string,
  msgId   : string,
  userId  : string,               // token
}

/**
 * There are two functions to generate PadchatContactPayload
 * - WXSyncContact (only when msg_type = 2)
 * - WXGetContact
 * @interface PadchatContactPayload
 */
export interface PadchatContactPayload {
  /**
   * Sometimes, WXSyncContact can only get the following result:
   * {
   *    "continue": 1,
   *     "msg_type": 2048,
   *     "status": 1,
   *     "uin": 324216852
   * },
   *
   * The following 4 only exist in [WXSyncContact], see more: https://github.com/lijiarui/test-ipad-puppet/issues/39
   * continue:           number,    // 1: Not Load Ready, 0: Load Ready.
   * msg_type:           number,    // 2: Contact Or Room whole content.
   * source:             number,    // 14, // 0, 14, don't know why
   * uin:                number,    // 324216852,
   */

  /**
   * The following 2 only exsit in [WXGetContact], see more: https://github.com/lijiarui/test-ipad-puppet/issues/40
   * message: string, // '',
   * ticket: string, // '',
   */
  msg_type : PadchatContactMsgType,
  continue : PadchatContinue,
  ticket?  : string,

  big_head          : string,      // "http://wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/0",
  city              : string,      // 'Haidian'
  country           : string,      // "CN"
  intro             : string,      // '',
  label             : string,      // '1', if no label, it is '', but not really sure
  nick_name         : string,      // "梦君君", Contact:用户昵称， Room: 群昵称
  provincia         : string,      // "Beijing",
  py_initial        : string,      // 'LJR',
  remark            : string,      // "女儿",
  remark_py_initial : string,      // 'lijiaruibeizhu',
  remark_quan_pin   : string,      // 'LJRBZ',
  sex               : ContactGender,
  signature         : string,      // "且行且珍惜",
  small_head        : string,      // "http://wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/132",
  status            : PadchatContactRoomStatus,      // 1 when use WXSyncContact, 0 when use WXGetContact
  stranger          : string,      // "v1_0468f2cd3f0efe7ca2589d57c3f9ba952a3789e41b6e78ee00ed53d1e6096b88@stranger",
  user_name         : string,      // "mengjunjun001" | "qq512436430" Unique name

  /**
   * Differenc with web: No stranger, starFriend, intro, weixinid, tag...
   */
}

// msg_type = 5
// export interface PadchatMessageMediaPayload {
//   // TODO
// }

// msg_type = 5
export interface PadchatMessagePayload {
  // tslint:disable-next-line:max-line-length
  // Private Voice Message:   "<msg><voicemsg+endflag=\"1\"+length=\"5095\"+voicelength=\"2700\"+clientmsgid=\"49c81578fd517c7679f143e8cf0be116wxid_zj2cahpwzgie12104_1526984920\"+fromusername=\"qq512436430\"+downcount=\"0\"+cancelflag=\"0\"+voiceformat=\"4\"+forwardflag=\"0\"+bufid=\"434549088970015139\"+/></msg>"
  // tslint:disable-next-line:max-line-length
  // Private File:            "<msg><appmsg+appid=\"\"+sdkver=\"0\"><title>微软云人工智能+–+全渠道智能客服.pdf</title><des></des><action></action><type>6</type><showtype>0</showtype><soundtype>0</soundtype><mediatagname></mediatagname><messageext></messageext><messageaction></messageaction><content></content><contentattr>0</contentattr><url></url><lowurl></lowurl><dataurl></dataurl><lowdataurl></lowdataurl><appattach><totallen>3801373</totallen><attachid>@cdn_304f0201000448304602010002040592f70202033d0af802045d30feb602045b03d9110421777869645f7a6a3263616870777a67696531323130325f313532363937383833330204010400050201000400_aa9d0657fe4a4b45b8ed394b83fa6519_1</attachid><emoticonmd5></emoticonmd5><fileext>pdf</fileext><cdnattachurl>304f0201000448304602010002040592f70202033d0af802045d30feb602045b03d9110421777869645f7a6a3263616870777a67696531323130325f313532363937383833330204010400050201000400</cdnattachurl><cdnthumbaeskey></cdnthumbaeskey><aeskey>aa9d0657fe4a4b45b8ed394b83fa6519</aeskey><encryver>0</encryver><filekey>wxid_zj2cahpwzgie12102_1526978833</filekey></appattach><extinfo></extinfo><sourceusername></sourceusername><sourcedisplayname></sourcedisplayname><thumburl></thumburl><md5>2871ff2d8b29a6dbbe5ccc263d7a38a5</md5><statextstr></statextstr></appmsg><fromusername>qq512436430</fromusername><scene>0</scene><appinfo><version>1</version><appname></appname></appinfo><commenturl></commenturl></msg>"
  // tslint:disable-next-line:max-line-length
  // Room Link:               "qq512436430:\n<msg><appmsg+appid=\"\"+sdkver=\"0\"><title>金钱可能买不到快乐，但能买到自由</title><des>岁月漫长，人生苦短，去做那些真正让你感到开心和满足的事情！</des><action></action><type>5</type><showtype>0</showtype><soundtype>0</soundtype><mediatagname></mediatagname><messageext></messageext><messageaction></messageaction><content></content><contentattr>0</contentattr><url>http://mp.weixin.qq.com/s?__biz=MjM5ODQ2MDIyMA==&mid=2650713963&idx=1&sn=8cd02cba12521dadbbfaf245557d821e&chksm=bec0613889b7e82e159127b32d12225a6cdd81cb7de54710ad11d1b63df37f555e51fd4ae66f&mpshare=1&scene=24&srcid=0218N9FP2aBhxUavHvaQLElu#rd</url><lowurl></lowurl><dataurl></dataurl><lowdataurl></lowdataurl><appattach><totallen>0</totallen><attachid></attachid><emoticonmd5></emoticonmd5><fileext></fileext><cdnthumbaeskey></cdnthumbaeskey><aeskey></aeskey></appattach><extinfo></extinfo><sourceusername>gh_672f4fa64015</sourceusername><sourcedisplayname></sourcedisplayname><thumburl>http://mmbiz.qpic.cn/mmbiz_jpg/JuJRyjO2zcZtNDdzumgZTXaI3uDTV26L9UwYib7rOYWcicfsM2H9miagSMGG9sVOAFlTX398FLOibJ1wH80acJMzVw/640?wxfrom=0</thumburl><md5></md5><statextstr></statextstr></appmsg><fromusername>qq512436430</fromusername><scene>0</scene><appinfo><version>1</version><appname></appname></appinfo><commenturl></commenturl></msg>"
  // tslint:disable-next-line:max-line-length
  // Private Image:           "<?xml+version=\"1.0\"?><msg><img+aeskey=\"13ef51a71b1e452ab27a54d3323a1d49\"+encryver=\"1\"+cdnthumbaeskey=\"13ef51a71b1e452ab27a54d3323a1d49\"+cdnthumburl=\"304f0201000448304602010002040592f70202033d0af80204ba30feb602045b03d3af0421777869645f7a6a3263616870777a67696531323130305f313532363937373431330204010400010201000400\"+cdnthumblength=\"13219\"+cdnthumbheight=\"67\"+cdnthumbwidth=\"120\"+cdnmidheight=\"0\"+cdnmidwidth=\"0\"+cdnhdheight=\"0\"+cdnhdwidth=\"0\"+cdnmidimgurl=\"304f0201000448304602010002040592f70202033d0af80204ba30feb602045b03d3af0421777869645f7a6a3263616870777a67696531323130305f313532363937373431330204010400010201000400\"+length=\"159284\"+cdnbigimgurl=\"304f0201000448304602010002040592f70202033d0af80204ba30feb602045b03d3af0421777869645f7a6a3263616870777a67696531323130305f313532363937373431330204010400010201000400\"+hdlength=\"419703\"+md5=\"d5d35bda94178e8ba2eaa2b633a1ad30\"+/></msg>"
  // Privat Message:          "这是一条文本消息"
  // Room Message:            "qq512436430: 这是一条群内消息"
  // Change Room Topic:       "content": "\"李佳芮\"修改群名为“哈哈”"
  // Room Join:               "\"李佳芮\"邀请你加入了群聊，群聊参与人还有：小桔、桔小秘、小小桔、wuli舞哩客服、舒米"

  content:      string,
  data?:        string,     // Stream Message has data, Text Message don't need data
  continue:     PadchatContinue,     // 1

  // Voice Message:           "李佳芮+:+[语音]"
  // Change Room Topic:       ""
  // Invite to Room:          ""
  // Kick Off from the Room:  ""
  // Private File Message:    "李佳芮-备注+:+[文件]微软云人工智能+–+全渠道智能客服.pdf"
  // Room || Private Link:    "李佳芮-备注+:+[链接]金钱可能买不到快乐，但能买到自由"
  // Private Image Message:   "李佳芮-备注+:+[图片]"
  // Room Image:              "李佳芮-备注在群聊中发了一张图片"
  // Private Text:            "李佳芮-备注+:+这是一条文本消息",
  // Room Text:               "李佳芮-备注+:+这是一条群内消息"
  description:  string,

  // Room Message:      "5410625297@chatroom"
  // Private Message:   "qq512436430"
  from_user:    string,
  msg_id:       string,

  // Voice Message:           ""
  // Change Room Topic:       ""
  // Invite to Room:          ""
  // Kick Off from the Room:  ""
  // Private File Message:    "<msgsource+/>"
  // Room Link:               "<msgsource><silence>0</silence><membercount>4</membercount></msgsource>"
  // Private Link:            "<msgsource+/>"
  // Private Image Message:   "<msgsource><img_file_name>定价策略参考.jpeg</img_file_name></msgsource>"
  // Room Image:              "<msgsource><img_file_name>382300af-8b6e-4dc1-8dee-b922a8dca18e+(1).jpeg</img_file_name><silence>0</silence><membercount>4</membercount></msgsource>"
  // Private Text:            "<msgsource+/>"
  // Room Text:               "<msgsource><silence>0</silence><membercount>4</membercount></msgsource>"
  msg_source:   string,
  msg_type:     PadchatMessageMsgType        // 5
  status:       PadchatMessageStatus,       // 1
  sub_type:     PadchatMessageType,
  timestamp:    number,
  to_user:      string,            // Contact['user_name']  "wxid_zj2cahpwzgie12"
  uin:          number

  // Differenc with web: No stranger, and No starFriend
  // No MediaId, no FileName, no FileSize, no FileMd5, no FileType, no MMFileExt, no Signature.....
}

// export type MessageTypeName = 'TEXT' | 'IMAGE' | 'VOICE' | 'VERIFYMSG' | 'POSSIBLEFRIEND_MSG'
// | 'SHARECARD' | 'VIDEO' | 'EMOTICON' | 'LOCATION' | 'APP' | 'VOIPMSG' | 'STATUSNOTIFY'
// | 'VOIPNOTIFY' | 'VOIPINVITE' | 'MICROVIDEO' | 'SYSNOTICE' | 'SYS' | 'RECALLED'

// export type MessageTypeValue = 1 | 3 | 34 | 37 | 40 | 42 | 43 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 62 | 9999 | 10000 | 10002

// export interface WebMsgTypeDict {
//   [index: string]: string|number,
//   //   MessageTypeName:  MessageTypeValue
//   // , MessageTypeValue: MessageTypeName
// }

// /**
//  *
//  * Enum for AppMsgType values.
//  *
//  * @enum {number}
//  * @property {number} TEXT                    - AppMsgType.TEXT                     (1)      for TEXT
//  * @property {number} IMG                     - AppMsgType.IMG                      (2)      for IMG
//  * @property {number} AUDIO                   - AppMsgType.AUDIO                    (3)      for AUDIO
//  * @property {number} VIDEO                   - AppMsgType.VIDEO                    (4)      for VIDEO
//  * @property {number} URL                     - AppMsgType.URL                      (5)      for URL
//  * @property {number} ATTACH                  - AppMsgType.ATTACH                   (6)      for ATTACH
//  * @property {number} OPEN                    - AppMsgType.OPEN                     (7)      for OPEN
//  * @property {number} EMOJI                   - AppMsgType.EMOJI                    (8)      for EMOJI
//  * @property {number} VOICE_REMIND            - AppMsgType.VOICE_REMIND             (9)      for VOICE_REMIND
//  * @property {number} SCAN_GOOD               - AppMsgType.SCAN_GOOD                (10)     for SCAN_GOOD
//  * @property {number} GOOD                    - AppMsgType.GOOD                     (13)     for GOOD
//  * @property {number} EMOTION                 - AppMsgType.EMOTION                  (15)     for EMOTION
//  * @property {number} CARD_TICKET             - AppMsgType.CARD_TICKET              (16)     for CARD_TICKET
//  * @property {number} REALTIME_SHARE_LOCATION - AppMsgType.REALTIME_SHARE_LOCATION  (17)     for REALTIME_SHARE_LOCATION
//  * @property {number} TRANSFERS               - AppMsgType.TRANSFERS                (2e3)    for TRANSFERS
//  * @property {number} RED_ENVELOPES           - AppMsgType.RED_ENVELOPES            (2001)   for RED_ENVELOPES
//  * @property {number} READER_TYPE             - AppMsgType.READER_TYPE              (100001) for READER_TYPE
//  */
// export enum PadchatAppMsgType {
//   TEXT                     = 1,
//   IMG                      = 2,
//   AUDIO                    = 3,
//   VIDEO                    = 4,
//   URL                      = 5,
//   ATTACH                   = 6,
//   OPEN                     = 7,
//   EMOJI                    = 8,
//   VOICE_REMIND             = 9,
//   SCAN_GOOD                = 10,
//   GOOD                     = 13,
//   EMOTION                  = 15,
//   CARD_TICKET              = 16,
//   REALTIME_SHARE_LOCATION  = 17,
//   TRANSFERS                = 2e3,
//   RED_ENVELOPES            = 2001,
//   READER_TYPE              = 100001,
// }

/**
 *
 * Enum for MsgType values.
 * @enum {number}
 * @property {number} TEXT                - MsgType.TEXT                (1)     for TEXT
 * @property {number} IMAGE               - MsgType.IMAGE               (3)     for IMAGE
 * @property {number} VOICE               - MsgType.VOICE               (34)    for VOICE
 * @property {number} VERIFYMSG           - MsgType.VERIFYMSG           (37)    for VERIFYMSG
 * @property {number} POSSIBLEFRIEND_MSG  - MsgType.POSSIBLEFRIEND_MSG  (40)    for POSSIBLEFRIEND_MSG
 * @property {number} SHARECARD           - MsgType.SHARECARD           (42)    for SHARECARD
 * @property {number} VIDEO               - MsgType.VIDEO               (43)    for VIDEO
 * @property {number} EMOTICON            - MsgType.EMOTICON            (47)    for EMOTICON
 * @property {number} LOCATION            - MsgType.LOCATION            (48)    for LOCATION
 * @property {number} APP                 - MsgType.APP                 (49)    for APP         | File, Media Link
 * @property {number} VOIPMSG             - MsgType.VOIPMSG             (50)    for VOIPMSG
 * @property {number} STATUSNOTIFY        - MsgType.STATUSNOTIFY        (51)    for STATUSNOTIFY
 * @property {number} VOIPNOTIFY          - MsgType.VOIPNOTIFY          (52)    for VOIPNOTIFY
 * @property {number} VOIPINVITE          - MsgType.VOIPINVITE          (53)    for VOIPINVITE
 * @property {number} MICROVIDEO          - MsgType.MICROVIDEO          (62)    for MICROVIDEO
 * @property {number} SYSNOTICE           - MsgType.SYSNOTICE           (9999)  for SYSNOTICE
 * @property {number} SYS                 - MsgType.SYS                 (10000) for SYS         | Change Room Topic, Invite into Room, Kick Off from the room
 * @property {number} RECALLED            - MsgType.RECALLED            (10002) for RECALLED
 */
export enum PadchatMessageType {
  Text              = 1,
  Image             = 3,
  Voice             = 34,
  VerifyMsg         = 37,
  PossibleFriendMsg = 40,
  ShareCard         = 42,
  Video             = 43,
  Emoticon          = 47,
  Location          = 48,
  App               = 49,
  VoipMsg           = 50,
  StatusNotify      = 51,
  VoipNotify        = 52,
  VoipInvite        = 53,
  MicroVideo        = 62,
  SysNotice         = 9999,
  Sys               = 10000,
  Recalled          = 10002,
}

/**
 * from Message
 */
// export interface PadchatRecomendInfo {
//   UserName:   string,
//   NickName:   string,  // display_name
//   Content:    string,  // request message
//   HeadImgUrl: string,  // message.RecommendInfo.HeadImgUrl

//   Ticket:     string,  // a pass token
//   VerifyFlag: number,
// }

// export const enum PadchatMediaType {
//   Image      = 1,
//   Video      = 2,
//   Audio      = 3,
//   Attachment = 4,
// }

export interface PadchatRoomMemberPayload {
  big_head           : string,   // "http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/0",
  chatroom_nick_name : string,   // "李佳芮-群里设置的备注", roomAlias
  invited_by         : string,   // "wxid_7708837087612",
  nick_name          : string,   // "李佳芮",
  small_head         : string,   // "http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/132",
  user_name          : string,   // "qq512436430"

  // no displa_name here?? not sure
}

/**
 * There are two functions to generate PadchatContactPayload
 * - WXSyncContact (only when msg_type = 2)
 * - WXGetContact
 * @interface PadchatRoomPayload
 */
export interface PadchatRoomPayload {
  /**
   * Sometimes, WXSyncContact can only get the following result:
   * {
   *    "continue": 1,
   *    "msg_type": 2048,
   *    "status": 1,
   *    "uin": 324216852
   * },
   *
   * The following 4 only exist in [WXSyncContact], see more: https://github.com/lijiarui/test-ipad-puppet/issues/39
   * continue:           number,    // 1: Not Load Ready, 0: Load Ready.
   * msg_type:           number,    // 2: Contact Or Room whole content.
   * source:             number,    // 14, // 0, 14, don't know why
   * uin:                number,    // 324216852,
   */

  /**
   * The following 2 only exsit in [WXGetContact], see more: https://github.com/lijiarui/test-ipad-puppet/issues/40
   * message: string, // '',
   * ticket: string,  // '',
   */
  msg_type?:        number,

  big_head:         string,   // "",
  chatroom_id:      number,   // 700000154 in WXGetContact, 0 in WXSyncContact
  chatroom_owner:   string,   // "qq512436430",
  continue?:        PadchatContinue,   // 1,
  max_member_count: number,   // 500,
  member?:          string[], // JSON.parse(decodeURIComponent(member)) | "[\"qq512436430\",\"mengjunjun001\",\"wxid_zj2cahpwzgie12\",\"wxid_7708837087612\"]\n",
  member_count:     number,   // 4,
  nick_name:        string,   // room-topic:"facenet",
  py_initial:       string,   // 'FACENET',
  quan_pin:         string,   // 'facenet',
  small_head:       string,   // "http://wx.qlogo.cn/mmcrhead/hqDXUD6csU99edRCJy18nZyEicsEdXGu2IsEzxJfgwM13N7PB88ibWk8oDL6ce7pHzc77WicTzKzR0ewkc9eL0jLQNypIfGmdPP/0",
  status:           PadchatContactRoomStatus, // 1 | 0,   // 1 when use WXSyncContact, 0 when use WXGetContact
  uin:              number,   // 324216852,
  user_name:        string,   // room-id "6350854677@chatroom"
}

export interface PadchatRoomMemberListPayload {
  chatroom_id : number,                   // not know: 700000156,
  count       : number,                   // 4,
  // tslint:disable-next-line:max-line-length
  member      : PadchatRoomMemberPayload[],   // JSON.parse(decodeURIComponent(member)): PadchatRoomRawMember[] |  '[{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"李佳芮","small_head":"http://wx.qlogo.cn/mmhead/ver_1/DpS0ZssJ5s8tEpSr9JuPTRxEUrCK0USrZcR3PjOMfUKDwpnZLxWXlD4Q38bJpcXBtwXWwevsul1lJqwsQzwItQ/132","user_name":"qq512436430"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/kcBj3gSibfFd2I9vQ8PBFyQ77cpPIfqkFlpTdkFZzBicMT6P567yj9IO6xG68WsibhqdPuG82tjXsveFATSDiaXRjw/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"梦君君","small_head":"http://wx.qlogo.cn/mmhead/ver_1/kcBj3gSibfFd2I9vQ8PBFyQ77cpPIfqkFlpTdkFZzBicMT6P567yj9IO6xG68WsibhqdPuG82tjXsveFATSDiaXRjw/132","user_name":"mengjunjun001"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/3CsKibSktDV05eReoAicV0P8yfmuHSowfXAMvRuU7HEy8wMcQ2eibcaO1ccS95PskZchEWqZibeiap6Gpb9zqJB1WmNc6EdD6nzQiblSx7dC1eGtA/0","chatroom_nick_name":"","invited_by":"wxid_7708837087612","nick_name":"苏轼","small_head":"http://wx.qlogo.cn/mmhead/ver_1/3CsKibSktDV05eReoAicV0P8yfmuHSowfXAMvRuU7HEy8wMcQ2eibcaO1ccS95PskZchEWqZibeiap6Gpb9zqJB1WmNc6EdD6nzQiblSx7dC1eGtA/132","user_name":"wxid_zj2cahpwzgie12"},{"big_head":"http://wx.qlogo.cn/mmhead/ver_1/piaHuicak41b6ibmcEVxoWKnnhgGDG5EbaD0hibwkrRvKeDs3gs7XQrkym3Q5MlUeSKY8vw2FRVVstialggUxf2zic2O8CvaEsicSJcghf41nibA940/0","chatroom_nick_name":"","invited_by":"wxid_zj2cahpwzgie12","nick_name":"王宁","small_head":"http://wx.qlogo.cn/mmhead/ver_1/piaHuicak41b6ibmcEVxoWKnnhgGDG5EbaD0hibwkrRvKeDs3gs7XQrkym3Q5MlUeSKY8vw2FRVVstialggUxf2zic2O8CvaEsicSJcghf41nibA940/132","user_name":"wxid_7708837087612"}]\n',
  message     : string,                   // '',
  status      : PadchatRoomMemberStatus,  // number,                       // 0,
  user_name   : string,                   // '6350854677@chatroom'
}
