/**
 * Full-domain behavioral tests for `PuppetMock` covering read/write symmetry,
 * status transitions, error branches, and event emissions across all upgraded stubs.
 */

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { FileBox } from 'file-box'
import * as PUPPET from 'wechaty-puppet'

import { createMockWorld } from './harness/mock-world.ts'

describe('PuppetMock Full-Domain Behaviors', () => {
  test('ContactSelf: QRCode, name, and signature read/write + dirty events', async (t) => {
    const { puppet, botUser } = await createMockWorld(t)

    const qr = await puppet.contactSelfQRCode()
    assert.ok(qr.includes(botUser.id), 'contactSelfQRCode includes currentUserId')

    const dirtyName = puppet.next('dirty')
    await puppet.contactSelfName('Updated Bot')
    assert.equal((await dirtyName).payloadId, botUser.id)
    assert.equal((await puppet.contactPayload(botUser.id)).name, 'Updated Bot')

    await puppet.contactSelfSignature('WinterTC Bot')
    assert.equal((await puppet.contactPayload(botUser.id)).signature, 'WinterTC Bot')
  })

  test('Contact: alias (set/clear), phone, corporationRemark, description, avatar', async (t) => {
    const { puppet, alice } = await createMockWorld(t)

    assert.equal(await puppet.contactAlias(alice.id), '')
    await puppet.contactAlias(alice.id, 'Alice VIP')
    assert.equal(await puppet.contactAlias(alice.id), 'Alice VIP')
    await puppet.contactAlias(alice.id, null)
    assert.equal(await puppet.contactAlias(alice.id), '')

    await puppet.contactPhone(alice.id, ['+15559999'])
    assert.deepEqual(await puppet.contactPhone(alice.id), ['+15559999'])

    await puppet.contactCorporationRemark(alice.id, 'Wechaty')
    await puppet.contactDescription(alice.id, 'Core contributor')
    const payload = await puppet.contactPayload(alice.id)
    assert.equal(payload.corporation, 'Wechaty')
    assert.equal(payload.description, 'Core contributor')

    const customAvatar = FileBox.fromBase64(btoa('png-bytes'), 'avatar.png')
    await puppet.contactAvatar(alice.id, customAvatar)
    const readAvatar = await puppet.contactAvatar(alice.id)
    assert.equal(readAvatar.name, 'avatar.png')
  })

  test('Message: text, contact, url, location, miniprogram, post, forward, recall, readMark', async (t) => {
    const { puppet, alice, bob, room } = await createMockWorld(t)

    const textId = await puppet.messageSendText(room.id, 'hi @Alice', [alice.id])
    assert.equal(typeof textId, 'string')
    assert.equal((await puppet.messagePayload(textId as string)).text, 'hi @Alice')

    const contactMsgId = await puppet.messageSendContact(alice.id, bob.id)
    assert.equal(await puppet.messageContact(contactMsgId as string), bob.id)

    const urlFuture = puppet.next('message')
    const urlMsgId = await puppet.messageSendUrl(alice.id, {
      title: 'Wechaty',
      url: 'https://wechaty.js.org',
    })
    assert.equal((await puppet.messageUrl((await urlFuture).messageId)).title, 'Wechaty')

    const fwdUrlId = await puppet.messageForward(bob.id, urlMsgId as string)
    assert.ok(typeof fwdUrlId === 'string')
    assert.equal((await puppet.messageUrl(fwdUrlId)).url, 'https://wechaty.js.org')

    const locMsgId = await puppet.messageSendLocation(alice.id, {
      accuracy: 10,
      address: '1 Main St',
      latitude: 37.77,
      longitude: -122.41,
      name: 'HQ',
    })
    assert.equal((await puppet.messageLocation(locMsgId as string)).name, 'HQ')

    const mpMsgId = await puppet.messageSendMiniProgram(alice.id, {
      appid: 'wx123',
      title: 'MiniApp',
    })
    assert.equal((await puppet.messageMiniProgram(mpMsgId as string)).title, 'MiniApp')

    const postMsgId = await puppet.messageSendPost(alice.id, {
      sayableList: [],
      type: PUPPET.types.Post.Moment,
    })
    assert.ok(typeof postMsgId === 'string')
    assert.equal((await puppet.messagePayload(postMsgId)).type, PUPPET.types.Message.Post)
    assert.equal((await puppet.postRawPayload(postMsgId)).id, postMsgId)

    const fwdId = await puppet.messageForward(bob.id, textId as string)
    assert.ok(typeof fwdId === 'string' && fwdId !== textId)
    assert.equal((await puppet.messagePayload(fwdId)).text, 'hi @Alice')

    const recallMsgFuture = puppet.next('message')
    assert.equal(await puppet.messageRecall(textId as string), true)
    const recallNotice = await recallMsgFuture
    assert.notEqual(recallNotice.messageId, textId)
    const recallPayload = await puppet.messagePayload(recallNotice.messageId)
    assert.equal(recallPayload.type, PUPPET.types.Message.Recalled)
    assert.equal(recallPayload.text, textId)
    // Original message record remains intact for Message.toRecalled()
    assert.equal((await puppet.messagePayload(textId as string)).type, PUPPET.types.Message.Text)
    assert.equal(await puppet.messageRecall(textId as string), false)

    await puppet.conversationReadMark(alice.id, true)
    assert.equal(puppet.mocker.cacheConversationRead.get(alice.id), true)
  })

  test('Room & RoomInvitation: create, topic, announce, add/inviteOnly, del, quit', async (t) => {
    const { puppet, alice, bob, room } = await createMockWorld(t)

    const newRoomId = await puppet.roomCreate([alice.id], 'New Room')
    assert.ok((await puppet.roomList()).includes(newRoomId))
    assert.equal(await puppet.roomTopic(newRoomId), 'New Room')

    const topicFuture = puppet.next('room-topic')
    await puppet.roomTopic(newRoomId, 'Renamed Room')
    const topicEvent = await topicFuture
    assert.equal(topicEvent.oldTopic, 'New Room')
    assert.equal(topicEvent.newTopic, 'Renamed Room')

    const announceFuture = puppet.next('room-announce')
    await puppet.roomAnnounce(newRoomId, 'Welcome!')
    assert.equal((await announceFuture).newAnnounce, 'Welcome!')
    assert.equal(await puppet.roomAnnounce(newRoomId), 'Welcome!')

    const joinFuture = puppet.next('room-join')
    await puppet.roomAdd(newRoomId, bob.id)
    assert.deepEqual((await joinFuture).inviteeIdList, [bob.id])

    const leaveFuture = puppet.next('room-leave')
    await puppet.roomDel(newRoomId, bob.id)
    assert.deepEqual((await leaveFuture).removeeIdList, [bob.id])

    const inviteFuture = puppet.next('room-invite')
    await puppet.roomAdd(room.id, bob.id, true)
    const { roomInvitationId } = await inviteFuture
    const inv = await puppet.roomInvitationPayload(roomInvitationId)
    assert.equal(inv.topic, 'TCK General')
    assert.equal(inv.receiverId, bob.id)
    await puppet.roomInvitationAccept(roomInvitationId)
    assert.ok((await puppet.roomMemberList(room.id)).includes(bob.id))

    await puppet.roomQuit(newRoomId)
  })

  test('Friendship: searchPhone, searchHandle, add, receive & accept', async (t) => {
    const { puppet, alice, bob } = await createMockWorld(t)

    assert.equal(await puppet.friendshipSearchPhone('+15550101'), alice.id)
    assert.equal(await puppet.friendshipSearchPhone('+19999999'), null)
    assert.equal(await puppet.friendshipSearchHandle('bob_wx'), bob.id)
    assert.equal(await puppet.friendshipSearchHandle('unknown'), null)

    const verifyFuture = puppet.next('friendship')
    await puppet.friendshipAdd(bob.id, { hello: 'Nice to meet you' })
    const verifyPayload = await puppet.friendshipPayload((await verifyFuture).friendshipId)
    assert.equal(verifyPayload.type, PUPPET.types.Friendship.Verify)

    const receiveFuture = puppet.next('friendship')
    puppet.mocker.receiveFriendship(alice, 'Hi Bot!', PUPPET.types.Friendship.Receive)
    const receiveId = (await receiveFuture).friendshipId

    const confirmFuture = puppet.next('friendship')
    await puppet.friendshipAccept(receiveId)
    const confirmPayload = await puppet.friendshipPayload((await confirmFuture).friendshipId)
    assert.equal(confirmPayload.type, PUPPET.types.Friendship.Confirm)
    assert.equal((await puppet.contactPayload(alice.id)).friend, true)
  })

  test('Tag, Post & Tap: CRUD, pagination, and events', async (t) => {
    const { puppet, alice } = await createMockWorld(t)

    await puppet.tagContactAdd('vip', alice.id)
    await puppet.tagContactAdd('vip', alice.id)
    assert.deepEqual(await puppet.tagContactList(alice.id), ['vip'])
    assert.deepEqual(await puppet.tagContactList(), ['vip'])
    await puppet.tagContactRemove('vip', alice.id)
    await puppet.tagContactRemove('missing-tag', alice.id)
    assert.deepEqual(await puppet.tagContactList(alice.id), [])
    await puppet.tagContactAdd('vip', alice.id)
    await puppet.tagContactDelete('vip')
    await puppet.tagContactDelete('missing-tag')
    assert.deepEqual(await puppet.tagContactList(), [])

    await assert.rejects(() => puppet.postRawPayload('missing-post'))
    const postFuture = puppet.next('post')
    const postId1 = await puppet.postPublish({
      sayableList: [
        { payload: { mentions: [], text: 'hello post' }, type: PUPPET.types.Sayable.Text },
        { payload: { title: 'Link', url: 'https://wechaty.js.org' }, type: PUPPET.types.Sayable.Url },
        { payload: { accuracy: 10, address: '1 Main', latitude: 1, longitude: 2, name: 'HQ' }, type: PUPPET.types.Sayable.Location },
        { payload: { appid: 'wx1', title: 'MP' }, type: PUPPET.types.Sayable.MiniProgram },
        { payload: { contactId: alice.id }, type: PUPPET.types.Sayable.Contact },
        { payload: { filebox: FileBox.fromBase64(btoa('img-bytes'), 'pic.png') }, type: PUPPET.types.Sayable.Image },
      ],
      type: PUPPET.types.Post.Moment,
    })
    const postId2 = await puppet.postPublish({
      parentId: postId1,
      rootId: postId1,
      sayableList: [],
      type: PUPPET.types.Post.Channel,
    })
    assert.equal((await postFuture).postId, postId1)

    const storedPost1 = await puppet.postRawPayload(postId1)
    assert.equal(storedPost1.sayableList.length, 6)
    const sayableMsg = await puppet.messagePayload(storedPost1.sayableList[0] as string)
    assert.equal(sayableMsg.text, 'hello post')
    const sayableFile = await puppet.messageFile(storedPost1.sayableList[5] as string)
    assert.equal(sayableFile.name, 'pic.png')

    assert.deepEqual((await puppet.postSearch({ id: postId1 })).response, [postId1])
    assert.deepEqual((await puppet.postSearch({ contactId: 'nobody' })).response, [])
    assert.deepEqual((await puppet.postSearch({ type: PUPPET.types.Post.Channel })).response, [postId2])
    assert.deepEqual((await puppet.postSearch({ parentId: postId1, rootId: postId1 })).response, [postId2])

    const page1 = await puppet.postSearch({}, { pageSize: 1 })
    assert.deepEqual(page1.response, [postId1])
    assert.equal(page1.nextPageToken, '1')
    const page2 = await puppet.postSearch({}, { pageSize: 1, pageToken: page1.nextPageToken })
    assert.deepEqual(page2.response, [postId2])
    assert.equal(page2.nextPageToken, undefined)

    await puppet.tap(postId1, PUPPET.types.Tap.Like, true)
    await puppet.tap(postId1, PUPPET.types.Tap.Like, true)
    assert.equal(await puppet.tap(postId1, PUPPET.types.Tap.Like), true)
    const taps = await puppet.tapSearch(postId1, { type: PUPPET.types.Tap.Like })
    assert.equal(taps.response[PUPPET.types.Tap.Like]?.contactId.length, 1)
    const wildcardTaps = await puppet.tapSearch(postId1, { contactId: 'bot-user', type: PUPPET.types.Tap.Unspecified }, { pageSize: 1 })
    assert.equal(wildcardTaps.response[PUPPET.types.Tap.Like]?.contactId.length, 1)
    const noMatchTaps = await puppet.tapSearch(postId1, { contactId: 'nobody' })
    assert.equal(noMatchTaps.response[PUPPET.types.Tap.Like], undefined)
    await puppet.tap(postId1, PUPPET.types.Tap.Like, false)
    assert.equal(await puppet.tap(postId1, PUPPET.types.Tap.Like), false)
  })

  test('Error & logged-out branches: rejects cleanly on invalid IDs or logged-out writes', async (t) => {
    const { puppet, alice, bob, room } = await createMockWorld(t)

    // Forward Contact, Location, MiniProgram, Post, and File
    const contactMsg = await puppet.messageSendContact(alice.id, bob.id)
    const fwdContact = await puppet.messageForward(bob.id, contactMsg as string)
    assert.equal(await puppet.messageContact(fwdContact as string), bob.id)

    const locMsg = await puppet.messageSendLocation(alice.id, {
      accuracy: 5,
      address: 'Addr',
      latitude: 1,
      longitude: 2,
      name: 'Loc',
    })
    const fwdLoc = await puppet.messageForward(bob.id, locMsg as string)
    assert.equal((await puppet.messageLocation(fwdLoc as string)).name, 'Loc')

    const mpMsg = await puppet.messageSendMiniProgram(alice.id, { title: 'App' })
    const fwdMp = await puppet.messageForward(bob.id, mpMsg as string)
    assert.equal((await puppet.messageMiniProgram(fwdMp as string)).title, 'App')

    const postMsg = await puppet.messageSendPost(alice.id, { sayableList: [], type: PUPPET.types.Post.Moment })
    const fwdPost = await puppet.messageForward(bob.id, postMsg as string)
    assert.equal((await puppet.messagePayload(fwdPost as string)).type, PUPPET.types.Message.Post)

    const fileMsg = await puppet.messageSendFile(alice.id, FileBox.fromBase64(btoa('hi'), 'hi.txt'))
    const fwdFile = await puppet.messageForward(bob.id, fileMsg as string)
    assert.equal((await puppet.messageFile(fwdFile as string)).name, 'hi.txt')

    // Room & invitation error branches + roomMemberPayloadDirty invalidation on roomDel
    await puppet.roomAdd(room.id, bob.id)
    assert.equal((await puppet.roomMemberPayload(room.id, bob.id)).id, bob.id)
    await puppet.roomDel(room.id, bob.id)
    await assert.rejects(() => puppet.roomMemberPayload(room.id, bob.id))
    await puppet.roomDel(room.id, 'not-a-member')
    await assert.rejects(() => puppet.roomMemberRawPayload(room.id, 'not-a-member'))
    await assert.rejects(() => puppet.roomInvitationRawPayload('missing-inv'))
    await assert.rejects(() => puppet.roomInvitationAccept('missing-inv'))
    await assert.rejects(() => puppet.friendshipRawPayload('missing-friendship'))

    // Post: immediate availability in message listener, FileBox.fromJSON, Emoticon, nested Post,
    // ancestor counters, tap postPayloadDirty, and pagination validation
    let resolveListenerPost!: (id: string) => void
    const listenerPostFuture = new Promise<string>((resolve) => {
      resolveListenerPost = resolve
    })
    puppet.addEventListener('message', async (ev) => {
      const payload = await puppet.messagePayload(ev.detail.messageId)
      if (payload.type === PUPPET.types.Message.Post) {
        const post = await puppet.postPayload(ev.detail.messageId)
        resolveListenerPost(post.id ?? '')
      }
    }, { once: true })
    const rawJsonBox = JSON.stringify(FileBox.fromBase64(btoa('json-box'), 'json.txt').toJSON())
    const emoticonBox = FileBox.fromBase64(btoa('emo'), 'emo.gif')
    const sentPostId = await puppet.messageSendPost(alice.id, {
      sayableList: [
        { payload: { filebox: rawJsonBox }, type: PUPPET.types.Sayable.Attachment },
        { payload: { filebox: emoticonBox }, type: PUPPET.types.Sayable.Emoticon },
        { payload: { sayableList: [{ payload: { mentions: [], text: 'nested' }, type: PUPPET.types.Sayable.Text }], type: PUPPET.types.Post.Moment }, type: PUPPET.types.Sayable.Post },
      ],
      type: PUPPET.types.Post.Moment,
    })
    assert.equal(await listenerPostFuture, sentPostId)
    const storedSentPost = await puppet.postPayload(sentPostId as string) as PUPPET.payloads.PostServer
    assert.equal(storedSentPost.sayableList.length, 3)
    assert.equal((await puppet.messageFile(storedSentPost.sayableList[0]!)).name, 'json.txt')
    assert.equal((await puppet.messageFile(storedSentPost.sayableList[1]!)).name, 'emo.gif')
    assert.equal((await puppet.messagePayload(storedSentPost.sayableList[2]!)).type, PUPPET.types.Message.Post)

    // Forwarding a PostServer clones counter so tapping the forward does not mutate the source post
    await puppet.tap(sentPostId as string, PUPPET.types.Tap.Like, true)
    const fwdTypedPost = await puppet.messageForward(bob.id, sentPostId as string)
    await puppet.tap(fwdTypedPost as string, PUPPET.types.Tap.Like, false)
    assert.equal(((await puppet.postPayload(sentPostId as string)) as PUPPET.payloads.PostServer).counter.taps?.[PUPPET.types.Tap.Like], 1)

    // Forwarding an Emoticon (including .gif) preserves Message.Emoticon instead of downgrading to Unknown
    const emoMsgId = storedSentPost.sayableList[1] as string
    const fwdEmo = await puppet.messageForward(bob.id, emoMsgId)
    assert.equal((await puppet.messagePayload(fwdEmo as string)).type, PUPPET.types.Message.Emoticon)
    assert.equal((await puppet.messageFile(fwdEmo as string)).name, 'emo.gif')

    const rootId = await puppet.postPublish({ sayableList: [{ payload: { mentions: [], text: 'root' }, type: PUPPET.types.Sayable.Text }], type: PUPPET.types.Post.Moment }) as string
    const childId = await puppet.postPublish({ parentId: rootId, rootId, sayableList: [], type: PUPPET.types.Post.Moment }) as string
    await puppet.postPublish({ parentId: childId, rootId, sayableList: [], type: PUPPET.types.Post.Moment })
    const updatedRoot = await puppet.postPayload(rootId) as PUPPET.payloads.PostServer
    assert.equal(updatedRoot.counter.children, 1)
    assert.equal(updatedRoot.counter.descendant, 2)

    await puppet.tap(rootId, PUPPET.types.Tap.Like, true)
    assert.equal(((await puppet.postPayload(rootId)) as PUPPET.payloads.PostServer).counter.taps?.[PUPPET.types.Tap.Like], 1)
    await puppet.tap(rootId, PUPPET.types.Tap.Unspecified, true)
    const page1 = await puppet.tapSearch(rootId, undefined, { pageSize: 1 })
    assert.equal(Object.values(page1.response).reduce((n, v) => n + (v?.contactId.length ?? 0), 0), 1)
    assert.equal(page1.nextPageToken, '1')
    await assert.rejects(() => puppet.postSearch({}, { pageSize: 0 }))
    await assert.rejects(() => puppet.postSearch({}, { pageToken: 'bad' }))
    await assert.rejects(() => puppet.tapSearch('missing-post'))
    await assert.rejects(() => puppet.tapSearch(rootId, undefined, { pageSize: -1 }))

    // Logged-out branches
    await puppet.logout()
    assert.equal(typeof await puppet.contactSelfQRCode(), 'string')
    await assert.rejects(() => puppet.contactSelfName('x'))
    await assert.rejects(() => puppet.contactSelfSignature('x'))
    await assert.rejects(() => puppet.messageSendText(alice.id, 'hi'))
    await assert.rejects(() => puppet.messageSendUrl(alice.id, { title: 't', url: 'https://wechaty.js.org' }))
    await assert.rejects(() => puppet.postPublish({ sayableList: [], type: PUPPET.types.Post.Moment }))
    await assert.rejects(() => puppet.tap('any', PUPPET.types.Tap.Like, true))
  })
})
