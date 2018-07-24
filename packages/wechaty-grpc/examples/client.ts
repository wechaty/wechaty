import {
  ContactListRequest,
  PuppetClient,
  SelfIdRequest,
}                     from '../src/'

import grpc from 'grpc'

// tslint:disable:no-console

async function main () {
  const client = new PuppetClient(
    'localhost:50051',
    grpc.credentials.createInsecure()
  )

  const contactListRequest = new ContactListRequest()
  client.contactList(contactListRequest, (err, response) => {
    if (err) {
      console.error(err)
      return
    }
    console.log('contactList:', response.getIdList())
  })

  const selfIdRequest = new SelfIdRequest()
  client.selfId(selfIdRequest, (err, response) => {
    if (err) {
      console.error(err)
      return
    }
    console.log('selfId:', response.getId())
  })

  return 0
}

main()
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})
