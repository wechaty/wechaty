/**
 *
 * Wechaty - Wechat for Bot, and human who talk to bot.
 *
 * Inject this js code to browser, 
 * in order to interactive with wechat web program.
 *
 * Licenst: MIT
 * https://github.com/zixia/wechaty-lib
 *

 MMCgi.isLogin
 loginScope.qrcodeUrl

 loginScope.code:
0:   显示二维码
201: 扫描，未确认
200: 登录成功
408: 未确认

 */
;(function (port) {
  port = port || 8788
  var injector = angular.element(document).injector()

  var zlog = createZlog()

  var Wechaty = {
    // get all we need from wx in browser(angularjs)
    glue: {
      injector:       injector
      , rootScope:    injector.get("$rootScope")
      , http:         injector.get("$http")
      , chatFactory:  injector.get("chatFactory")
      , confFactory:  injector.get("confFactory")
      , loginScope:   angular.element(".login_box").scope()
    }
    // glue funcs
    , getLoginStatusCode: function () { return loginScope.code }
    , getLoginQrImgUrl:   function () { return loginScope.qrcodeUrl }
    , isLogined:          function () { return 200===loginScope.code }
    , isReady:            function () { return !!(angular && angular.element && angular.element("body")); }

  // variable
    , socket:   null

  // funcs
    , init: init
    , send: send
    , zlog: zlog
    , log:  log
    , ping: ping
  }

  function init() {
    zlog('wechaty port ' + port)

    initSocket()
    hookUnload()  
    hookMessage()

    zlog('Wechaty injected!. ;-D')
  }

  function createZlog() {
    var enable = true
    if (enable) {
      if (!console.memory && console.time) { // wechat debuger exist
        delete console
      }
      console.zlog = window.console.log
      window.zlog = function (s) { return console.zlog(s) }
      console.log = function () {}
    } else {
      window.zlog = function () {}
    }
    return window.zlog
  }

  function log(msg) { Wechaty.socket && Wechaty.socket.emit('log', msg) }
  function ping()   { return 'pong' }

  function send     (ToUserName, Content) {
    var c = Wechaty.glue.chatFactory
    var m = c.createMessage({
      ToUserName: ToUserName
      , Content: Content
    })
    c.appendMessage(m)
    return c.sendMessage(m)
  }

  function hookMessage() {
    var rootScope = Wechaty.glue.rootScope
    var zlog      = Wechaty.zlog
    rootScope.$on("message:add:success", function (event, data) { 
      Wechaty.socket.emit('message', data)
      .catch(function (e) { 
        zlog('socket.emit(message, data) fail:')
        zlog(e) 
      })
    })
  }

  function hookUnload() {
    window.addEventListener ('unload', function (e) {
      Wechaty.socket.emit('unload') 
    })
  }

  function initSocket() {
    // Wechaty global variable: socket
    var socket  = Wechaty.socket = io.connect('https://127.0.0.1:' + port)
    var zlog    = Wechaty.zlog

    socket.on('connect', function() {
      zlog('on connect entried')

      Wechaty.glue.rootScope.$on("message:add:success", function (event, data) { 
        socket.emit('message', data)
      })

      socket.on('disconnect', function(e) {
        zlog('event: socket disconnect')

        // for test & live check purpose: ping -> pong
        socket.on('ping', function (e) {
          Wechaty.zlog('received socket io event: ping. emit pong...')
          socket.emit('pong', 'pong')
        })

        // Reconnect...
        setTimeout(function () {
          zlog('starting initSocket after disconnect')
          initSocket()
        }, 1000)
      })

    })

  }

  window.Wechaty = Wechaty
  return 'Wechaty'

}(arguments[0]))
