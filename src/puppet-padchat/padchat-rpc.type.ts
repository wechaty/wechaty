export interface PadchatRpcRequest {
  userId:   string,
  msgId:    number | string,
  apiName:  string,
  param:    string[],
}

export interface AutoDataType {
  wxData?:    string,
  token?:     string,
  user_name?: string,
  nick_name?: string,
}

export interface InitType {
  message : string,
  status  : number,
}

export interface WXInitializeType {
  message : string, // WxUserInit成功
  status  : number,
}

export interface WXAddChatRoomMemberType {
  message : string, // "\n\u0010Everything+is+OK" (succeed)  || "\n\u0014MemberList+are+wrong" ('user has in the room')
  status  : number, // 0
}

export interface WXGetQRCodeType {
  qr_code : string,
}

export enum WXCheckQRCodeStatus {
  Unknown     = -1,
  WaitScan    = 0,
  WaitConfirm = 1,
  Confirmed   = 2,
  Timeout     = 3,
  Cancel      = 4,
}

export interface WXCheckQRCodePayload {
  device_type  ?: string,   // android,
  expired_time  : number,   // 238,
  head_url     ?: string,   // http://wx.qlogo.cn/mmhead/ver_1/NkOvv1rTx3Dsqpicnhe0j7cVOR3psEAVfuhFLbmoAcwaob4eENNZlp3KIEsMgibfH4kRjDicFFXN3qdP6SGRXbo7GBs8YpN52icxSeBUX8xkZBA/0,
  nick_name    ?: string,   // 苏轼,
  password     ?: string,
  status        : WXCheckQRCodeStatus,   // 2 = success
  user_name    ?: string,   // wxid_zj2cahpwzgie12
}

export interface WXHeartBeatType {
  status  : number,   // 0
  message : string,   // ok
}

export interface WXLogoutType {
  status  : number,   // 0
  message : string,   // ''
}

export interface WXGenerateWxDatType {
  data    : string,   // 62data,
  message : string,   // '',
  status  : number,   // 0
}

export interface WXLoadWxDatType {
  status  : number,   // 0
  message : string,   // ok
}

export interface StandardType {
  status  : number,   // 0
  message : string,   // ''
}

export interface WXGetLoginTokenType {
  message : string,
  status  : number,   // 0,
  token   : string,   // XXXXXXXX,
  uin     : number,   // 324216852
}

export interface WXAutoLoginType {
  email              : string,
  external?          : number,   // 0,
  long_link_server?  : string,   // szlong.weixin.qq.com,
  message            : string,   // �Everything+is+ok,
  nick_name          : string,
  phone_number       : string,
  qq                 : number,   // 0,
  short_link_server? : string    // szshort.weixin.qq.com:80,
  status             : number    // 0,
  uin?               : number    // 324216852,
  user_name          : string    // wxid_zj2cahpwzgie12
}

export interface WXLoginRequestType {
  status: number // 0
}

export interface WXSendMsgType {
  message : string,
  msg_id  : string,   // '5612827783578738216',
  status  : number,   // 0
}

export interface WXQRCodeLoginType {
  email             : string,   // sushishigeshiren@163.com,
  external          : number,   // 1,
  long_link_server  : string,   // szlong.weixin.qq.com,
  message           : string,   // �Everything+is+ok,
  nick_name         : string,   // 苏轼,
  phone_number      : string,   // 17326998117,
  qq                : number,   // 0,
  short_link_server : string,   // szshort.weixin.qq.com:80,
  status            : number,   // 0,
  uin               : number,   // 324216852,
  user_name         : string,   // wxid_zj2cahpwzgie12
}

export interface WXHeartBeatType {
  status  : number,   // 0
  message : string,   // ok
}

export enum WXSearchContactTypeStatus {
  Searchable   = 0,
  UnSearchable = -24,
}

export enum WXRoomAddTypeStatus {
  Done          = 0,
  NeedInvite    = -2012,
  InviteConfirm = -2028,
}

// Difference with Contact Payload
// see more in https://github.com/lijiarui/wechaty-puppet-padchat/issues/54
export interface WXSearchContactType {
  big_head : string,   // '',
  city     : string,   // '',
  country  : string,   // '',
  // tslint:disable-next-line:max-line-length
  message    : string,   // '\n�\u0002<e>\n<ShowType>1</ShowType>\n<Content><![CDATA[找不到相关帐号或内容]]></Content>\n<Url><![CDATA[]]></Url>\n<DispSec>30</DispSec>\n<Title><![CDATA[]]></Title>\n<Action>2</Action>\n<DelayConnSec>0</DelayConnSec>\n<Countdown>0</Countdown>\n<Ok><![CDATA[]]></Ok>\n<Cancel><![CDATA[]]></Cancel>\n</e>\n',
  nick_name  : string,   // '',
  provincia  : string,   // '',
  py_initial : string,   // '',
  quan_pin   : string,   // '',
  sex        : number,   // 0,
  signature  : string,   // '',
  small_head : string,   // '',
  // -24 represent raw wxid and cannot be searched, 0 represent can be search by wxid
  status     : number,   // -24 | 0,
  stranger   : string,   // '',
  user_name  : string,   // ''
}

/**
 * Raw type info:
 * see more inhttps://ymiao.oss-cn-shanghai.aliyuncs.com/apifile.txt
 * 2  - 通过搜索邮箱
 * 3  - 通过微信号搜索
 * 5  - 通过朋友验证消息
 * 7  - 通过朋友验证消息(可回复)
 * 12 - 通过QQ好友添加
 * 14 - 通过群来源
 * 15 - 通过搜索手机号
 * 16 - 通过朋友验证消息
 * 17 - 通过名片分享
 * 22 - 通过摇一摇打招呼方式
 * 25 - 通过漂流瓶
 * 30 - 通过二维码方式
 */
export enum WXSearchContactTypeStatus {
  EMAIL          = 2,    // search by email
  WXID           = 3,    // search by wxid
  VERIFY_NOREPLY = 5,    // search by friend verify without reply(朋友验证消息)
  VERIFY_REPLY   = 7,    // search by friend verify(朋友验证消息，可回复)
  QQ             = 12,   // search by qq friend
  ROOM           = 14,   // search by room
  MOBILE         = 15,   // search by mobile number
  VERIFY         = 16,   // search friend verify
  CONTACT        = 17,   // search by contact card
  SHAKE          = 22,   // search by shake and shack
  FLOAT          = 25,   // search by float bottle
  QRCODE         = 30,   // search by scanning qrcode
}
