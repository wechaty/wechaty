#!/usr/bin/env ts-node
import * as test  from 'blue-tape'
// import * as sinon from 'sinon'

import { cloneClass } from 'clone-class'

import { Contact } from './contact'

test('Should not be able to instanciate directly', async t => {
  t.throws(() => {
    const c = new Contact('xxx')
    t.fail(c.name())
  }, 'should throw when `new Contact()`')

  t.throws(() => {
    const c = Contact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `Contact.load()`')
})

test('Should not be able to instanciate through cloneClass without puppet', async t => {
  // tslint:disable-next-line:variable-name
  const MyContact = cloneClass(Contact)

  t.throws(() => {
    const c = new MyContact('xxx')
    t.fail(c.name())
  }, 'should throw when `new MyContact()` without puppet')

  t.throws(() => {
    const c = MyContact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `MyContact.load()` without puppet')

})

test('Should be able to instanciate through cloneClass with puppet', async t => {
  // tslint:disable-next-line:variable-name
  const MyContact = cloneClass(Contact)
  MyContact.puppet = {} as any

  t.doesNotThrow(() => {
    const c = new MyContact('xxx')
    t.ok(c, 'should get contact instance from `new MyContact()')
  }, 'should not throw when `new MyContact()`')

  t.doesNotThrow(() => {
    const c = MyContact.load('xxx')
    t.ok(c, 'should get contact instance from `MyContact.load()`')
  }, 'should not throw when `MyContact.load()`')

})
