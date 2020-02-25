#!/usr/bin/env ts-node

import { test }  from 'tstest'

import util from 'util'

import grpc from 'grpc'

import {
  ContactAliasRequest,
  ContactAliasResponse,
  PuppetService,
  PuppetClient,
}                             from '../src/'

import { puppetServerImpl } from './puppet-server-impl'

import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb'

const SERVER_ENDPOINT = '127.0.0.1:8788'
const ID    = 'test-id'
const ALIAS = 'test-alias'

const contactAlias: grpc.handleUnaryCall<
  ContactAliasRequest,
  ContactAliasResponse
> = (call, callback) => {
  const id = call.request.getId()
  let aliasWrapper = call.request.getAlias()

  if (aliasWrapper) {
    /**
     * Set alias, return void
     */
    const alias = aliasWrapper.getValue()
    if (alias !== ALIAS) {
      throw new Error(`alias argument value error: ${alias} not equal to ${ALIAS}`)
    }
    callback(null, new ContactAliasResponse())

  } else {
    /**
     * Get alias, return alias
     */
    aliasWrapper = new StringValue()
    aliasWrapper.setValue(id + ALIAS)

    const response = new ContactAliasResponse()
    response.setAlias(aliasWrapper)
    callback(null, response)
  }
}

test('use StringValue to support nullable values', async (t) => {

  const puppetServerImplTest = {
    ...puppetServerImpl,
    contactAlias,
  }

  const server = new grpc.Server()
  server.addService(
    PuppetService,
    puppetServerImplTest,
  )

  // FIXME: Huan(202002) if the port has been used by another grpc server, this will still bind with succeed!
  // The result will be one port binded by two grpc server, and they are all working well...
  const success = server.bind(SERVER_ENDPOINT, grpc.ServerCredentials.createInsecure())

  if (!success) {
    t.fail(`server bind to ${SERVER_ENDPOINT} failed.`)
    return
  }

  server.start()

  const client = new PuppetClient(
    SERVER_ENDPOINT,
    grpc.credentials.createInsecure()
  )

  const contactAliasPromise = util.promisify(client.contactAlias.bind(client))

  /**
   * Get alias
   */
  {
    const request = new ContactAliasRequest()
    request.setId(ID)

    const response = await contactAliasPromise(request) as ContactAliasResponse

    const aliasWrapper = response.getAlias()
    t.ok(aliasWrapper, 'Should return an aliasWrapper')

    if (aliasWrapper) {
      let alias = aliasWrapper.getValue()
      t.equal(alias, ID + ALIAS, 'should get the right alias value')
    } else {
      t.fail('can not get alias value')
    }
  }

  /**
   * Set alias
   */
  {
    const aliasWrapper = new StringValue()
    aliasWrapper.setValue(ALIAS)

    const request = new ContactAliasRequest()
    request.setId(ID)
    request.setAlias(aliasWrapper)

    const response = await contactAliasPromise(request) as ContactAliasResponse

    const nullAliasWrapper = response.getAlias()
    t.notOk(nullAliasWrapper, 'should return undefined for null value')
  }

  const tryShutdown = util.promisify(server.tryShutdown.bind(server))
  await tryShutdown()

  const forceShutdown = util.promisify(server.forceShutdown.bind(server))
  setImmediate(() => forceShutdown())
})
