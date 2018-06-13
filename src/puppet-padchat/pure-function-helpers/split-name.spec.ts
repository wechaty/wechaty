#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import {
  splitChineseNameList,
  splitEnglishNameList,
}                           from './split-name'

test('splitChineseNameList()', async t => {
  const TEXT          = '李卓桓、李佳芮、桔小秘'
  const EXPECTED_LIST = ['李卓桓', '李佳芮', '桔小秘']

  const list = splitChineseNameList(TEXT)
  t.deepEqual(list, EXPECTED_LIST, 'should split chinese name list')
})

test('splitEnglihshNameList()', async t => {
  const TEXT = 'Zhuohuan, 李佳芮, 太阁_传话助手'
  const EXPECTED_LIST = ['Zhuohuan', '李佳芮', '太阁_传话助手']

  const list = splitEnglishNameList(TEXT)
  t.deepEqual(list, EXPECTED_LIST, 'should split english name list')
})
