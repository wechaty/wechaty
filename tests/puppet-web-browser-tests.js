const test = require('tape')
const Browser = require('../src/puppet-web-browser')

test('Browser class smoking tests', function (t) {
  //t.plan(5)
  const PORT = 58788
  const b = new Browser({browser: 'phantomjs', port: PORT})
  t.ok(b, 'Browser instance created')

  b.open()
  .then(() => {
    t.ok(true, 'url opened')
    b.inject()
    .then(() => {
      t.ok(true, 'wechaty injected')

      Promise.all([
        b.execute('return Wechaty && Wechaty.ding()')       // ret_ding
        , b.execute('return Wechaty && Wechaty.isReady()')  // ret_ready
      ]).then(([
        ret_ding
        , ret_ready
      ]) => {
        t.equal(ret_ding        , 'dong', 'Wechaty.ding() returns dong'           )
        t.equal(typeof ret_ready, 'boolean', 'Wechaty.isReady() returns boollean' )

        b.quit() + t.end()
      }).catch((e) => { // Promise.all
        t.ok(false, 'Promise.all promise rejected:' + e)
        b.quit() + t.end()
      })

    }).catch((e) => { // b.inject
      t.ok(false, 'b.inject promise rejected:' + e)
      b.quit() + t.end()
    })
  }).catch((e) => { // b.open
    t.ok(false, 'open promise rejected:' + e)
    t.end() + b.quit()
  })
})
