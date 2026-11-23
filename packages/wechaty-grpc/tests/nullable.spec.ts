#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import util from 'util'

import {
  grpc,
  puppet,
}               from '../src/mod.js'

import { puppetServerImpl } from './puppet-server-impl.js'

const SERVER_ENDPOINT = '127.0.0.1:8788'
const ID    = 'test-id'
const ALIAS = 'test-alias'

const contactAlias: grpc.handleUnaryCall<
  puppet.ContactAliasRequest,
  puppet.ContactAliasResponse
> = (call, callback) => {
  const id = call.request.getId()

  if (call.request.hasAlias()) {
    /**
     * Set alias, return void
     */
    const alias = call.request.getAlias()
    if (alias !== ALIAS) {
      throw new Error(`alias argument value error: ${alias} not equal to ${ALIAS}`)
    }
    callback(null, new puppet.ContactAliasResponse())

  } else {
    /**
     * Get alias, return alias
     */
    const response = new puppet.ContactAliasResponse()
    response.setAlias(id + ALIAS)
    callback(null, response)
  }
}

test('use StringValue to support nullable values', async t => {

  const puppetServerImplTest = {
    ...puppetServerImpl,
    contactAlias,
  }

  const server = new grpc.Server()
  server.addService(
    puppet.PuppetService,
    puppetServerImplTest,
  )

  try {
    // FIXME: Huan(202002) if the port has been used by another grpc server, this will still bind with succeed!
    // The result will be one port binded by two grpc server, and they are all working well...
    const port = await util.promisify(server.bindAsync.bind(server))(
      SERVER_ENDPOINT,
      grpc.ServerCredentials.createInsecure(),
    )
    // console.info('port:', port)
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

  const client = new puppet.PuppetClient(
    SERVER_ENDPOINT,
    grpc.credentials.createInsecure()
  )

  const contactAliasPromise = util.promisify(client.contactAlias.bind(client))

  /**
   * Get alias
   */
  {
    const request = new puppet.ContactAliasRequest()
    request.setId(ID)

    const response = await contactAliasPromise(request) as puppet.ContactAliasResponse

    const alias = response.getAlias()
    t.equal(alias, ID + ALIAS, 'should get the right alias value')
  }

  /**
   * Set alias
   */
  {
    const request = new puppet.ContactAliasRequest()
    request.setId(ID)
    request.setAlias(ALIAS)

    const response = await contactAliasPromise(request) as puppet.ContactAliasResponse

    const alias = response.getAlias()
    t.notOk(alias, 'should return empty for after set a value')
  }

  await new Promise(resolve => server.tryShutdown(resolve))
  setImmediate(() => server.forceShutdown())
})
