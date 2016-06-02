const test = require('tap').test
const Contact = require('../src/contact')
const Puppet = require('../src/puppet')
const log = require('npmlog')
// log.level = 'verbose'

Contact.attach(new Puppet())

test('Contact smoke testing', t => {
  const UserName = '@0bb3e4dd746fdbd4a80546aef66f4085'
  const NickName = 'Nick Name Test'

  // Mock
  const mockContactGetter = function (id) {
    return new Promise((resolve,reject) => {
      if (id!=UserName) return resolve({});
      setTimeout(() => {
        return resolve({
          UserName: UserName
          , NickName: NickName
        })
      }, 200)
    })
  }

  const c = new Contact(UserName)

  t.equal(c.id, UserName, 'id/UserName right')
  c.ready(mockContactGetter)
  .then(r => {
    t.equal(r.get('id')   , UserName, 'UserName set')
    t.equal(r.get('name') , NickName, 'NickName set')

    const s = r.toString()
    t.equal(typeof s, 'string', 'toString()')
  })
  .catch(e => t.fail('ready() rejected: ' + e))
  .then(t.end) // test end
})
