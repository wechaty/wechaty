#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import { padchatDecode } from './padchat-decode'

test('padchatDecode() uri decode with +', async t => {
  const JSON_TEXT = '%7B%22big_head%22%3A%22http%3A%2F%2Fwx.qlogo.cn%2Fmmhead%2FP3UGRtJrgyEMkmOExtdq1xpGcic2z1b5wZuicFibfHNPnYttF9n9ZzE2Q%2F0%22%2C%22bit_mask%22%3A4294967295%2C%22bit_value%22%3A2051%2C%22chatroom_id%22%3A0%2C%22chatroom_owner%22%3A%22%22%2C%22city%22%3A%22San+Francisco%22%2C%22continue%22%3A1%2C%22country%22%3A%22US%22%2C%22id%22%3A0%2C%22img_flag%22%3A1%2C%22intro%22%3A%22%22%2C%22label%22%3A%22%22%2C%22level%22%3A7%2C%22max_member_count%22%3A0%2C%22member_count%22%3A0%2C%22msg_type%22%3A2%2C%22nick_name%22%3A%22Huan+LI%2B%2B%22%2C%22provincia%22%3A%22California%22%2C%22py_initial%22%3A%22HUANLI%22%2C%22quan_pin%22%3A%22HuanLI%22%2C%22remark%22%3A%22%22%2C%22remark_py_initial%22%3A%22%22%2C%22remark_quan_pin%22%3A%22%22%2C%22sex%22%3A1%2C%22signature%22%3A%22angel+invester%2C+serial+entrepreneur+with+tech+background.%22%2C%22small_head%22%3A%22http%3A%2F%2Fwx.qlogo.cn%2Fmmhead%2FP3UGRtJrgyEMkmOExtdq1xpGcic2z1b5wZuicFibfHNPnYttF9n9ZzE2Q%2F132%22%2C%22source%22%3A14%2C%22status%22%3A1%2C%22stranger%22%3A%22v1_7f8c54ac5a1b1bcec9a7ccfae9b0a9564373a1559d2e545d2d2b5a3708e61928b2fc43c009b7512a75d53b312422d6e6%40stranger%22%2C%22uin%22%3A1211516682%2C%22user_name%22%3A%22wxid_5zj4i5htp9ih22%22%7D'

  const EXPECTED_OBJ = {
    big_head          : 'http://wx.qlogo.cn/mmhead/P3UGRtJrgyEMkmOExtdq1xpGcic2z1b5wZuicFibfHNPnYttF9n9ZzE2Q/0',
    bit_mask          : 4294967295,
    bit_value         : 2051,
    chatroom_id       : 0,
    chatroom_owner    : '',
    city              : 'San Francisco',
    continue          : 1,
    country           : 'US',
    id                : 0,
    img_flag          : 1,
    intro             : '',
    label             : '',
    level             : 7,
    max_member_count  : 0,
    member_count      : 0,
    msg_type          : 2,
    nick_name         : 'Huan LI++',
    provincia         : 'California',
    py_initial        : 'HUANLI',
    quan_pin          : 'HuanLI',
    remark            : '',
    remark_py_initial : '',
    remark_quan_pin   : '',
    sex               : 1,
    signature         : 'angel invester, serial entrepreneur with tech background.',
    small_head        : 'http://wx.qlogo.cn/mmhead/P3UGRtJrgyEMkmOExtdq1xpGcic2z1b5wZuicFibfHNPnYttF9n9ZzE2Q/132',
    source            : 14,
    status            : 1,
    stranger          : 'v1_7f8c54ac5a1b1bcec9a7ccfae9b0a9564373a1559d2e545d2d2b5a3708e61928b2fc43c009b7512a75d53b312422d6e6@stranger',
    uin               : 1211516682,
    user_name         : 'wxid_5zj4i5htp9ih22',
  }

  const result = padchatDecode(JSON_TEXT)
  t.deepEqual(result, EXPECTED_OBJ, 'should parse json text with "+" right')
})

test('padchatDecode() plain json text', async t => {
  const INVALID_URIDECODE_TEXT = `[{
    "nick_name":"郎咸平之马胜外汇 固定月息8%"
  }]`
  const EXPECTED_OBJ = [ { nick_name: '郎咸平之马胜外汇 固定月息8%' } ]

  const result = padchatDecode(INVALID_URIDECODE_TEXT)
  t.deepEqual(result, EXPECTED_OBJ, 'should decode invalid uridecode text')
})
