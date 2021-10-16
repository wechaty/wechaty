#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}           from 'tstest'

import type {
  ContactMixin,
  ProtectedPropertyContactMixin,
}                                 from './contact-mixin.js'

test('ProtectedPropertyContactMixin', async t => {
  type NotExistInMixin = Exclude<ProtectedPropertyContactMixin, keyof InstanceType<ContactMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  t.ok(noOneLeft, 'should match Mixin properties for every protected property')
})
