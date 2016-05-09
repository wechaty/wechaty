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
