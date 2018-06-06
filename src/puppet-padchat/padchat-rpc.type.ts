export interface PadchatRpcRequest {
  userId:   string,
  msgId:    string,
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
