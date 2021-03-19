#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'tstest'

import { grpc } from './mod'

test('grpc imported right', async (t) => {
  t.ok(grpc, 'should imported grpc')
})
