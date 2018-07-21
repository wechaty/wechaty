#!/usr/bin/env ts-node
import test  from 'blue-tape'
// import sinon from 'sinon'

import {
  cloneClass,
}                           from 'clone-class'

import {
  PuppetMock,
}                           from 'wechaty-puppet-mock'
import {
  Contact as GlobalContact,
}                           from './contact'

// tslint:disable-next-line:variable-name
const Contact = cloneClass(GlobalContact)

test('Should not be able to instanciate directly', async t => {
  // tslint:disable-next-line:variable-name
  const MyContact = cloneClass(Contact)
  t.throws(() => {
    const c = MyContact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `Contact.load()`')

  t.throws(() => {
    const c = MyContact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `Contact.load()`')
})

test('Should not be able to instanciate through cloneClass without puppet', async t => {
  // tslint:disable-next-line:variable-name
  const MyContact = cloneClass(Contact)

  t.throws(() => {
    const c = MyContact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `MyContact.load()` without puppet')

  t.throws(() => {
    const c = MyContact.load('xxx')
    t.fail(c.name())
  }, 'should throw when `MyContact.load()` without puppet')

})

test('should be able to instanciate through cloneClass with puppet', async t => {
  // tslint:disable-next-line:variable-name
  const MyContact = cloneClass(Contact)

  MyContact.puppet = new PuppetMock()

  t.doesNotThrow(() => {
    const c = MyContact.load('xxx')
    t.ok(c, 'should get contact instance from `MyContact.load()')
  }, 'should not throw when `MyContact().load`')

  t.doesNotThrow(() => {
    const c = MyContact.load('xxx')
    t.ok(c, 'should get contact instance from `MyContact.load()`')
  }, 'should not throw when `MyContact.load()`')

})

test('should throw when instanciate the global class', async t => {
  t.throws(() => {
    const c = GlobalContact.load('xxx')
    t.fail('should not run to here')
    t.fail(c.toString())
  }, 'should throw when we instanciate a global class')
})
