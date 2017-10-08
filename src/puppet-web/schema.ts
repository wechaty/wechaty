export interface MediaData {
  ToUserName: string,
  MsgType:    number,
  MediaId:    string,
  FileName:   string,
  FileSize:   number,
  FileMd5?:   string,
  FileType?:  number,
  MMFileExt?: string,
  Signature?: string,
}

export interface MsgRawObj {
  MsgId:            string,

  MMActualSender:   string, // getUserContact(message.MMActualSender,message.MMPeerUserName).isContact()
  MMPeerUserName:   string, // message.MsgType == CONF.MSGTYPE_TEXT && message.MMPeerUserName == 'newsapp'
  ToUserName:       string,
  FromUserName:     string,
  MMActualContent:  string, // Content has @id prefix added by wx
  Content:          string,

  MMDigest:         string,
  MMDisplayTime:    number,  // Javascript timestamp of milliseconds

  /**
   * MsgType == MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_URL
   * class="cover" mm-src="{{getMsgImg(message.MsgId,'slave')}}"
   */
  Url:              string,
  MMAppMsgDesc:     string,  // class="desc" ng-bind="message.MMAppMsgDesc"

  /**
   * Attachment
   *
   * MsgType == MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_ATTACH
   */
  FileName:         string,  // FileName: '钢甲互联项目BP1108.pdf',
  FileSize:         number,  // FileSize: '2845701',
  MediaId:          string,  // MediaId: '@crypt_b1a45e3f_c21dceb3ac01349...
  MMFileExt:        string,  // doc, docx ... 'undefined'?
  Signature:        string,  // checkUpload return the signature used to upload large files

  MMAppMsgFileExt:      string,  // doc, docx ... 'undefined'?
  MMAppMsgFileSize:     string,  // '2.7MB',
  MMAppMsgDownloadUrl:  string,  // 'https://file.wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetmedia?sender=@4f549c2dafd5ad731afa4d857bf03c10&mediaid=@crypt_b1a45e3f
                                 // <a download ng-if="message.MMFileStatus == CONF.MM_SEND_FILE_STATUS_SUCCESS
                                 // && (massage.MMStatus == CONF.MSG_SEND_STATUS_SUCC || massage.MMStatus === undefined)
                                 // " href="{{message.MMAppMsgDownloadUrl}}">下载</a>
  MMUploadProgress: number,  // < 100

  /**
   * 模板消息
   * MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_READER_TYPE
   *  item.url
   *  item.title
   *  item.pub_time
   *  item.cover
   *  item.digest
   */
  MMCategory:       any[],  //  item in message.MMCategory

  /**
   * Type
   *
   * MsgType == CONF.MSGTYPE_VOICE : ng-style="{'width':40 + 7*message.VoiceLength/1000}
   */
  MsgType:          number,
  AppMsgType:       AppMsgType,  // message.MsgType == CONF.MSGTYPE_APP && message.AppMsgType == CONF.APPMSGTYPE_URL
                                 // message.MsgType == CONF.MSGTYPE_TEXT && message.SubMsgType != CONF.MSGTYPE_LOCATION

  SubMsgType:       MsgType, // "msgType":"{{message.MsgType}}","subType":{{message.SubMsgType||0}},"msgId":"{{message.MsgId}}"

  /**
   * Status-es
   */
  Status:           string,
  MMStatus:         number,  // img ng-show="message.MMStatus == 1" class="ico_loading"
                             // ng-click="resendMsg(message)" ng-show="message.MMStatus == 5" title="重新发送"
  MMFileStatus:     number,  // <p class="loading" ng-show="message.MMStatus == 1 || message.MMFileStatus == CONF.MM_SEND_FILE_STATUS_FAIL">
                             // CONF.MM_SEND_FILE_STATUS_QUEUED, MM_SEND_FILE_STATUS_SENDING

  /**
   * Location
   */
  MMLocationUrl:    string,  // ng-if="message.MsgType == CONF.MSGTYPE_TEXT && message.SubMsgType == CONF.MSGTYPE_LOCATION"
                             // <a href="{{message.MMLocationUrl}}" target="_blank">
                             // 'http://apis.map.qq.com/uri/v1/geocoder?coord=40.075041,116.338994'
  MMLocationDesc:   string,  // MMLocationDesc: '北京市昌平区回龙观龙腾苑(五区)内(龙腾街南)',

  /**
   * MsgType == CONF.MSGTYPE_EMOTICON
   *
   * getMsgImg(message.MsgId,'big',message)
   */

  /**
   * Image
   *
   *  getMsgImg(message.MsgId,'slave')
   */
  MMImgStyle:       string,  // ng-style="message.MMImgStyle"
  MMPreviewSrc:     string,  // message.MMPreviewSrc || message.MMThumbSrc || getMsgImg(message.MsgId,'slave')
  MMThumbSrc:       string,

  /**
   * Friend Request & ShareCard ?
   *
   * MsgType == CONF.MSGTYPE_SHARECARD" ng-click="showProfile($event,message.RecommendInfo.UserName)
   * MsgType == CONF.MSGTYPE_VERIFYMSG
   */
  RecommendInfo?:   RecommendInfo,

  /**
   * Transpond Message
   */
  MsgIdBeforeTranspond?: string,  // oldMsg.MsgIdBeforeTranspond || oldMsg.MsgId,
  isTranspond?: boolean,
  MMSourceMsgId?: string,
  MMSendContent?: string,

  MMIsChatRoom?: boolean,

}

export interface MsgObj {
  id:       string,
  type:     MsgType,
  from:     string,
  to?:      string,  // if to is not set, then room must be set
  room?:    string,
  content:  string,
  status:   string,
  digest:   string,
  date:     string,

  url?:     string,  // for MessageMedia class
}

// export type MessageTypeName = 'TEXT' | 'IMAGE' | 'VOICE' | 'VERIFYMSG' | 'POSSIBLEFRIEND_MSG'
// | 'SHARECARD' | 'VIDEO' | 'EMOTICON' | 'LOCATION' | 'APP' | 'VOIPMSG' | 'STATUSNOTIFY'
// | 'VOIPNOTIFY' | 'VOIPINVITE' | 'MICROVIDEO' | 'SYSNOTICE' | 'SYS' | 'RECALLED'

// export type MessageTypeValue = 1 | 3 | 34 | 37 | 40 | 42 | 43 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 62 | 9999 | 10000 | 10002

export interface MsgTypeMap {
  [index: string]: string|number,
  //   MessageTypeName:  MessageTypeValue
  // , MessageTypeValue: MessageTypeName
}

/**
 *
 * Enum for AppMsgType values.
 *
 * @enum {number}
 * @property {number} TEXT                    - AppMsgType.TEXT                     (1)     for TEXT
 * @property {number} IMG                     - AppMsgType.IMG                      (2)      for IMG
 * @property {number} AUDIO                   - AppMsgType.AUDIO                    (3)      for AUDIO
 * @property {number} VIDEO                   - AppMsgType.VIDEO                    (4)      for VIDEO
 * @property {number} URL                     - AppMsgType.URL                      (5)      for URL
 * @property {number} ATTACH                  - AppMsgType.ATTACH                   (6)      for ATTACH
 * @property {number} OPEN                    - AppMsgType.OPEN                     (7)      for OPEN
 * @property {number} EMOJI                   - AppMsgType.EMOJI                    (8)      for EMOJI
 * @property {number} VOICE_REMIND            - AppMsgType.VOICE_REMIND             (9)      for VOICE_REMIND
 * @property {number} SCAN_GOOD               - AppMsgType.SCAN_GOOD                (10)     for SCAN_GOOD
 * @property {number} GOOD                    - AppMsgType.GOOD                     (13)     for GOOD
 * @property {number} EMOTION                 - AppMsgType.EMOTION                  (15)     for EMOTION
 * @property {number} CARD_TICKET             - AppMsgType.CARD_TICKET              (16)     for CARD_TICKET
 * @property {number} REALTIME_SHARE_LOCATION - AppMsgType.REALTIME_SHARE_LOCATION  (17)     for REALTIME_SHARE_LOCATION
 * @property {number} TRANSFERS               - AppMsgType.TRANSFERS                (2e3)    for TRANSFERS
 * @property {number} RED_ENVELOPES           - AppMsgType.RED_ENVELOPES            (2001)   for RED_ENVELOPES
 * @property {number} READER_TYPE             - AppMsgType.READER_TYPE              (100001) for READER_TYPE
 */
export enum AppMsgType {
  TEXT                     = 1,
  IMG                      = 2,
  AUDIO                    = 3,
  VIDEO                    = 4,
  URL                      = 5,
  ATTACH                   = 6,
  OPEN                     = 7,
  EMOJI                    = 8,
  VOICE_REMIND             = 9,
  SCAN_GOOD                = 10,
  GOOD                     = 13,
  EMOTION                  = 15,
  CARD_TICKET              = 16,
  REALTIME_SHARE_LOCATION  = 17,
  TRANSFERS                = 2e3,
  RED_ENVELOPES            = 2001,
  READER_TYPE              = 100001,
}

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
 * @property {number} APP                 - MsgType.APP                 (49)    for APP
 * @property {number} VOIPMSG             - MsgType.VOIPMSG             (50)    for VOIPMSG
 * @property {number} STATUSNOTIFY        - MsgType.STATUSNOTIFY        (51)    for STATUSNOTIFY
 * @property {number} VOIPNOTIFY          - MsgType.VOIPNOTIFY          (52)    for VOIPNOTIFY
 * @property {number} VOIPINVITE          - MsgType.VOIPINVITE          (53)    for VOIPINVITE
 * @property {number} MICROVIDEO          - MsgType.MICROVIDEO          (62)    for MICROVIDEO
 * @property {number} SYSNOTICE           - MsgType.SYSNOTICE           (9999)  for SYSNOTICE
 * @property {number} SYS                 - MsgType.SYS                 (10000) for SYS
 * @property {number} RECALLED            - MsgType.RECALLED            (10002) for RECALLED
 */
export enum MsgType {
  TEXT                = 1,
  IMAGE               = 3,
  VOICE               = 34,
  VERIFYMSG           = 37,
  POSSIBLEFRIEND_MSG  = 40,
  SHARECARD           = 42,
  VIDEO               = 43,
  EMOTICON            = 47,
  LOCATION            = 48,
  APP                 = 49,
  VOIPMSG             = 50,
  STATUSNOTIFY        = 51,
  VOIPNOTIFY          = 52,
  VOIPINVITE          = 53,
  MICROVIDEO          = 62,
  SYSNOTICE           = 9999,
  SYS                 = 10000,
  RECALLED            = 10002,
}

/**
 * from Message
 */
export interface RecommendInfo {
  UserName:   string,
  NickName:   string,  // display_name
  Content:    string,  // request message
  HeadImgUrl: string,  // message.RecommendInfo.HeadImgUrl

  Ticket:     string,  // a pass token
  VerifyFlag: number,

}

export const enum MediaType {
  IMAGE      = 1,
  VIDEO      = 2,
  AUDIO      = 3,
  ATTACHMENT = 4,
}
