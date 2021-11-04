import { FileBox } from 'file-box'

import {
  WechatyBuilder,
}                     from '../src/mods/mod.js'

const bot = WechatyBuilder.build({
  name : 'video-post-bot',
})

async function testVideoPost () {
  const contact = await bot.Contact.find({ id: 'xxx' })
  const room = await bot.Room.find({ id: 'xxx' })

  if (!contact || !room) {
    return
  }

  const post = bot.Post.builder()
    .add('hello, world')
    .add(FileBox.fromQRCode('qr'))
    .add(await bot.UrlLink.create('https://wechaty.js.org'))
    .build()

  await bot.say(post)

  bot.on('message', async message => {

    // if (message.type() !== message.type.Post) {
    //   return
    // }

    // forward video post
    await message.forward(contact)

    /**
     * Video Post
     */
    const post2 = await message.toPost()

    console.info('total tap(like) number:', post2.tapNum())
    console.info('total children number:', post2.descendantNum())

    /**
     * Comment
     */
    // reply comment
    await post2.reply('xxxx')
    await post2.reply(FileBox.fromQRCode('qrimage'))

    const [descendantList] = await post.descendantList({ contact: message.wechaty.currentUser() })
    if (descendantList.length > 0) {
      console.info(descendantList[0])
    }

    /**
     * Like
     */

    // like message
    await post.like(true)
    // await post.tap(PostTapType.Like, true)

    // check whether we have liked this post
    const liked = await post.like()
    console.info('liked date:', liked)
    // const liked = await post.tap(PostTapType.Like)

    // cancel like
    await post.like(false)
    // await post.tap(PostTapType.Like, false)

    // list all likers
    const [taperList] = await post.tapList()
    for (const tap of taperList) {
      console.info('Taper -------')
      console.info('taper:', tap.contact)
      console.info('date:', tap.date)
      console.info('type:', tap.type)
    }

    for await (const like of post.likes()) {
      console.info('-------')
      console.info('liker:', like.contact)
      console.info('date:', like.date)
      console.info('type:', like.type)
    }
  })

}

void testVideoPost()
