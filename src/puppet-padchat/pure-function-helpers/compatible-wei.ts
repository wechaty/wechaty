/**
 * A bug-compatible to Web-Socket Server provided by protocal holder
 */

/**
 * WXCreateChatRoom() will get dirty chatroom Id.
 * function pureUserName can get a clean chatroom Id.
 * https://github.com/lijiarui/wechaty-puppet-padchat/issues/62
 *
 * WXCreateChatRoom result:
 * {"message":"\n\u0010Everything is OK","status":0,"user_name":"\n\u00135907139882@chatroom"}
 * BUG compitable: "\n\u00135907139882@chatroom" -> "5907139882@chatroom"
 * BUG compitable: "\n\u001412558026334@chatroom" -> "12558026334@chatroom"
 */
export function pureUserName(id?: string) {
  if (!id) {
    return ''
  }
  return id.replace(/^\n[\u0000-\uffff]/g, '')
}
