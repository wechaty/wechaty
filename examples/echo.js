const Wechaty = require('../lib/wechaty')
const EventEmitter = require('events')

var wechaty = new Wechaty()

if (!wechaty.currentUser()) {
  // login
}

wechaty.on('login', (e) => {
  console.log(e)
})

wechaty.on('logout', (e) => {
  console.log(e)
})

wechaty.on('message', (e) => {
  console.log(e)
})


wechaty.contact.findAll( (e) => {
  console.log(e)
})

wechaty.contact.find( {id: 43143}, (e) => {
  console.log(e)
})


wechaty.group.findAll( (e) => {
  console.log(e)
})

wechaty.group.find( {id: 43143}, (e) => {
  console.log(e)
})


wechaty.message.findAll( {id:333}, (e) => {
  console.log(e)
})

wechaty.message.find( {id:333}, (e) => {
  console.log(e)
})

