import { Wechaty } from '../src/wechaty'
import { VideoPost } from '../src/mod'

const bot = new Wechaty({
  name : 'video-post-bot',
})

const videoPost = new VideoPost({
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

    if (message.type() !== message.type.VideoPost) {
      return
    }

    /**
     * Video Post
     */

    // send video post
    const msg = await message.say(videoPost)
    await contact.say(videoPost)
    await room.say(videoPost)

    if (!msg) {
      return
    }

    // forward video post
    contact && await msg.forward(contact)

    /**
     * Comment
     */

    // post comment
    const comment = await bot.Comment.comment(msg, 'xxxx')

    // reply comment
    await comment.reply('xxxx')

    // revoke comment
    await comment.revoke()

    // list comments
    await comment.list(msg, {
      currentPage: 0,
      pageSize: 10,
    })

    /**
     * Like
     */

    // like message
    await bot.Like.like(msg)

    // cancel like
    await bot.Like.cancel(msg)

    // list all likers
    await bot.Like.list(msg, {
      currentPage: 0,
      pageSize: 10,
    })

  })

}

void testVideoPost()
