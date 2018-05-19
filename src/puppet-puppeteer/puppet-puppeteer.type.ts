export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export interface PuppeteerRoomRawMember {
  UserName:     string,
  NickName:     string,
  DisplayName:  string,
}

export interface PuppeteerRoomRawPayload {
  UserName:         string,
  EncryChatRoomId:  string,
  NickName:         string,
  OwnerUin:         number,
  ChatRoomOwner:    string,
  MemberList?:      PuppeteerRoomRawMember[],
}
