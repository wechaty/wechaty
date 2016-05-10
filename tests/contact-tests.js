const test = require('tape')
const Contact = require('../src/contact')
const Puppet = require('../src/puppet')
const log = require('npmlog')
log.level = 'verbose'

Contact.attach(new Puppet())

test('Contact smoke testing', t => {
  const UserName = '@0bb3e4dd746fdbd4a80546aef66f4085'
  const NickName = 'Nick Name Test'

  // Mock
  Contact.puppet.getContact = function (id) {
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

  t.equal(c.getId(), UserName, 'id/UserName right')
  c.ready()
  .then(r => {
    t.equal(c.get('id')   , UserName, 'UserName set')
    t.equal(c.get('name') , NickName, 'NickName set')
  })
  .catch(e => t.fail('ready() rejected: ' + e))
  .then(t.end) // test end
})
