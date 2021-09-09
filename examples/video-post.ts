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

  /**
   * Video Post
   */

  // send video post
  const message = bot.Message.load('')
  const msg = await message.say(videoPost)

  if (!msg) {
    return
  }

  // forward video post
  const contact = bot.Contact.load('xxxx')
  await msg.forward(contact)

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

}

void testVideoPost()
