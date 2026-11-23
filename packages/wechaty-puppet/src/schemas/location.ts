/**
 * Issue wechaty/wechaty#2250
 *  - https://github.com/wechaty/wechaty/issues/2250
 */
export interface LocationPayload {
  accuracy  : number; // Estimated horizontal accuracy of this location, radial, in meters. (same as Android & iOS API)
  address   : string; // "北京市北京市海淀区45 Chengfu Rd"
  latitude  : number; // 39.995120999999997
  longitude : number; // 116.334154
  name      : string; // "东升乡人民政府(海淀区成府路45号)"
}
