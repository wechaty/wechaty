// test('Room iterator for contact in it', async t => {
//   // Mock
//   const mockContactRoomRawPayload = (id: string) => {
//     log.verbose('PuppeteerRoomTest', 'mockContactRawPayload(%s)', id)
//     return new Promise(resolve => {
//       if (id === ROOM_EXPECTED.id) {
//         setImmediate(() => resolve(ROOM_RAW_PAYLOAD))
//       } else if (id in CONTACT_RAW_PAYLOAD_DICT) {
//         setImmediate(() => resolve(CONTACT_RAW_PAYLOAD_DICT[id]))
//       } else {
//         // ignore other ids
//         setImmediate(() => resolve({ id }))
//       }
//     })
//   }

//   const sandbox = sinon.createSandbox()

//   const puppet = new PuppetPuppeteer()

//   sandbox.stub(puppet, 'contactRawPayload').callsFake(mockContactRoomRawPayload)
//   sandbox.stub(puppet, 'roomRawPayload').callsFake(mockContactRoomRawPayload)

//   const roomPayload = await puppet.roomPayload(ROOM_EXPECTED.id)

//   const MEMBER_CONTACT_ID_LIST = ROOM_RAW_PAYLOAD.MemberList!.map(rawMember => rawMember.UserName)

//   let n = 0
//   for await (const memberContact of room) {
//     t.ok(MEMBER_CONTACT_ID_LIST.includes(memberContact.id), 'should get one of the room member: ' + memberContact.id)
//     n++
//   }

//   const memberList = await room.memberList()
//   t.equal(n, memberList.length, 'should iterate all the members of the room')
// })
