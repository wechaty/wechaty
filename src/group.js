/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

class Group {
  constructor(id) {
    this.id = id
  }

  toString() { return `Group({id=${this.id}})` }

  getId() { return this.id }

  static find() {
  }

  static findAll() {
  }
}
module.exports = Group
