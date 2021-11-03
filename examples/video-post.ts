import {
  WechatyBuilder,
  VideoPostBuilder,
}                     from '../src/mods/mod.js'

const bot = WechatyBuilder.build({
  name : 'video-post-bot',
})

const videoPost = VideoPostBuilder.create({
  authorId: 'todo',
  coverageUrl: 'todo',
  title: 'todo',
  videoUrl: 'todo',
})

async function testVideoPost () {
  const contact = await bot.Contact.find({ id: 'xxx' })
  const room = await bot.Room.find({ id: 'xxx' })

  if (!contact || !room) {
    return
  }

  bot.on('message', async message => {

    if (message.type() !== message.type.Post) {
      // send video post
      await message.say(videoPost)
      await contact.say(videoPost)
      await room.say(videoPost)
      return
    }

    // forward video post
    await message.forward(contact)

    /**
     * Video Post
     */
    const post = await message.toPost()

    /**
     * Comment
     */

    // post comment
    await post.comment('xxxx')

    // reply comment
    await post.reply('xxxx')

    const pagination: PaginationRequest = {}

    // revoke comment
    const [commentList, _pagination] = post.commentList({ contact: message.wechaty.ContactSelf() }, pagination)
    if (commentList.length > 0) {
      await commentList[0].delete()
    }

    /**
     * Like
     */

    // like message
    await post.like(true)
    // await post.tap(PostTapType.Like, true)

    // check whether we have liked this post
    const liked = await post.like()
    // const liked = await post.tap(PostTapType.Like)

    // cancel like
    await post.like(false)
    // await post.tap(PostTapType.Like, false)

    // list all likers
    const [[liker, _date], _pagination] = await post.tapList(PostTapType.Like, pagination)
    if (liker.length > 0) {
      console.info('liker:', liker)
    }

  })

}

void testVideoPost()
