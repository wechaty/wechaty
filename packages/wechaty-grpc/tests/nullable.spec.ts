#!/usr/bin/env ts-node

import { test }  from 'tstest'

import util from 'util'

import {
  grpc,
  ContactAliasRequest,
  ContactAliasResponse,
  PuppetService,
  PuppetClient,
}                             from '../src/mod'

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

  try {
    // FIXME: Huan(202002) if the port has been used by another grpc server, this will still bind with succeed!
    // The result will be one port binded by two grpc server, and they are all working well...
    const port = await util.promisify(server.bindAsync.bind(server))(
      SERVER_ENDPOINT,
      grpc.ServerCredentials.createInsecure(),
    )
    console.info('port:', port)
    if (port <= 0) {
      t.fail(`server bind to ${SERVER_ENDPOINT} failed, port get ${port}.`)
      return
    }
  } catch (e) {
    /**
      * Run gRPC server failed
      *   https://medium.com/@yuanchaodu/run-grpc-server-failed-289172dbe6e
      *
      * No address added out of total 1 resolved
      *  The above error message means the port is in use.
      */
    t.fail('server bindAsync fail.')
    console.error(e)
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
      const alias = aliasWrapper.getValue()
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

  await new Promise(resolve => server.tryShutdown(resolve))
  setImmediate(() => server.forceShutdown())
})
