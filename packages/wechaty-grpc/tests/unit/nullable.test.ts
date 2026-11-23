/**
 * Tests that `StringValue` lets a request carry an absent value distinct from an empty string.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import util from 'util'

import {
  grpc,
  puppet,
}               from '../../src/mod.ts'

import { puppetServerImpl } from '../fixtures/puppet-server-impl.ts'

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

test('use StringValue to support nullable values', async _t => {

  const puppetServerImplTest = {
    ...puppetServerImpl,
    contactAlias,
  }

  const server = new grpc.Server()
  server.addService(
    puppet.PuppetService,
    puppetServerImplTest,
  )

  // Port 0: a free port, so test files never share one (Deno runs them in one process).
  const port = await util.promisify(server.bindAsync.bind(server))(
    '127.0.0.1:0',
    grpc.ServerCredentials.createInsecure(),
  )
  assert.ok(port > 0, `server should bind to a free port, got ${port}`)
  const SERVER_ENDPOINT = `127.0.0.1:${port}`

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
    assert.equal(alias, ID + ALIAS, 'should get the right alias value')
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
    assert.ok(!(alias), 'should return empty for after set a value')
  }

  // Close the client before the server, so no HTTP/2 session is left open.
  client.close()
  await new Promise(resolve => server.tryShutdown(resolve))
})
