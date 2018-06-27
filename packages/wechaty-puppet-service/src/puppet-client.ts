import * as grpc from 'grpc'

import {
  Puppet,
}             from '../../wechaty/src/puppet/'

import {
  PuppetService,
  IPuppetServer,
}                     from '../generated/wechaty-puppet_grpc_pb'

import {
  ContactList,
  ContactPayload,
  Empty,
  Id,
}                     from '../generated/wechaty-puppet_pb'
