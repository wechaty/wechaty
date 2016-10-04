import { test } from 'ava'
import {
  Contact
  , Wechaty
  , Config
  , Puppet
  , log
}  from '../'
// const test = require('tape')
// const Contact = require('../src/contact')
// const Puppet = require('../src/puppet')
// const log = require('../src/brolog-env')

Config.puppetInstance(new Puppet())
// Contact.attach()

test('Contact smoke testing', async t => {
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

  t.is(c.id, UserName, 'id/UserName right')
  const r = await c.ready(mockContactGetter)
  // .then(r => {
  t.is(r.get('id')   , UserName, 'UserName set')
  t.is(r.get('name') , NickName, 'NickName set')

  const s = r.toString()
  t.is(typeof s, 'string', 'toString()')
  // })
  // .catch(e => t.fail('ready() rejected: ' + e))
  // .then(_ => t.end()) // test end
})
