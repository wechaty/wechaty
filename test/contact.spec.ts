/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'
import {
  Config
}                     from '../src/config'
import { Contact }    from '../src/contact'
import { PuppetWeb }  from '../src/puppet-web'

Config.puppetInstance(new PuppetWeb())

test('Contact smoke testing', async t => {
  /* tslint:disable:variable-name */
  const UserName = '@0bb3e4dd746fdbd4a80546aef66f4085'
  const NickName = 'Nick Name Test'
  const RemarkName = 'Alias Test'

  // Mock
  const mockContactGetter = function (id) {
    return new Promise((resolve, reject) => {
      if (id !== UserName) return resolve({});
      setTimeout(() => {
        return resolve({
          UserName: UserName
          , NickName: NickName
          , RemarkName: RemarkName
        })
      }, 200)
    })
  }

  const c = new Contact(UserName)

  t.is(c.id, UserName, 'id/UserName right')
  const r = await c.ready(mockContactGetter)
  t.is(r.get('id')   , UserName, 'UserName set')
  t.is(r.get('name') , NickName, 'NickName set')
  t.is(r.name(), NickName, 'should get the right name from Contact')
  t.is(r.alias(), RemarkName, 'should get the right alias from Contact')

  const s = r.toString()
  t.is(typeof s, 'string', 'toString()')
})
