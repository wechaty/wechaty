import { Wechaty } from "../src/wechaty"
import { VideoPost } from "../src/user/video-post"

const bot = new Wechaty({
  name : 'video-post-bot',
})

const videoPost = new VideoPost({
  authorId: 'todo',
  coverageUrl: 'todo',
  title: 'todo',
  videoUrl: 'todo',
})

/**
 * Video Post
 */

// send video post
const msg = bot.Message.say(videoPost)

// forward video post
const contact = bot.Contact.load('xxxx')
msg.forward(contact)

/**
 * Comment
 */

// post comment
const comment = bot.Comment.comments(msg, 'xxxx')

// reply comment
bot.Comment.reply(comment, 'xxxx')

// revoke comment
bot.Comment.revoke(comment)

// list comments
bot.Comment.list(msg, {
  pageSize: 10,
  currentPage: 0,
})

/**
 * Like
 */

// like message
bot.Like.like(msg)

// cancel like
bot.Like.cancel(msg)

// list all likers
bot.Like.list(msg, {
  pageSize: 10,
  currentPage: 0,
})