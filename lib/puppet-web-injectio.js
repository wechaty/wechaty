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
;return (function (port) {
  port = port || 8788

  /**
  * Log to console
  * http://stackoverflow.com/a/7089553/1123955
  */
  function clog(s) {
    var d = new Date()
    s = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ' <Wechaty> ' + s

    var i = document.createElement('iframe')
    i.style.display = 'none'
    document.body.appendChild(i)
    i.contentWindow.console.log(s)
    i.parentNode.removeChild(i) 
  }

  var Wechaty = {
    glue: {} // see glueAngular() function
    // glue funcs
    , getLoginStatusCode: function () { return Wechaty.glue.loginScope.code }
    , getLoginQrImgUrl:   function () { return Wechaty.glue.loginScope.qrcodeUrl }
    , isLogined:          function () { return 200===Wechaty.glue.loginScope.code /* MMCgi.isLogin ??? */}
    , isReady:            isReady

  // variable
    , socket:   null

  // funcs
    , init: init
    , send: send
    , clog: clog // Console log
    , slog: slog // Socket IO log
    , ping: ping
    , quit: quit
  }

  function isReady() { 
    return (typeof angular)!=='undefined' && angular.element && angular.element("body")
  }
  function init() {
    // XXX
    // return 'init skiped in browser'


    if (!isReady()) {
      clog('angular not ready. wait 500ms...')
      setTimeout(init, 500)
      return // AngularJS not ready, wait 500ms then try again.
    }

    clog('init on port:' + port)
    glueAngular()
    connectSocket()
    hookUnload()  
    hookMessage()

    clog('inited!. ;-D')
    return true
  }

  function glueAngular() {
    var injector  = angular.element(document).injector()
    var rootScope = injector.get("$rootScope")
    var http      = injector.get("$http")
    var chatFactory = injector.get("chatFactory")
    var confFactory = injector.get("confFactory")
    var loginScope  = angular.element(".login_box").scope()

    // get all we need from wx in browser(angularjs)
    Wechaty.glue = {
      injector:       injector
      , rootScope:    rootScope
      , http:         http
      , chatFactory:  chatFactory
      , confFactory:  confFactory
      , loginScope:   loginScope
    }
  }

  function quit() {
    if (Wechaty.socket) {
     Wechaty.socket.close()
     Wechaty.socket = undefined
    }
    clog('quit()')
  }
  function slog(data) { return Wechaty.socket && Wechaty.socket.emit('log', data) }
  function ping()     { return 'pong' }
  function send(ToUserName, Content) {
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
    rootScope.$on("message:add:success", function (event, data) { 
      Wechaty.socket.emit('message', data)
      .catch(function (e) { 
        clog('socket.emit(message, data) fail:')
        clog(e) 
      })
    })
  }
  function hookUnload() {
    window.addEventListener ('unload', function (e) {
      Wechaty.socket.emit('unload') 
    })
  }
  function connectSocket() {
    clog('connectSocket()')
    if (typeof io!=='function') {
      clog('connectSocket: io not found. loading lib...')
      // http://stackoverflow.com/a/3248500/1123955
      var script = document.createElement('script')
      script.onload = function() {
        clog('socket io lib loaded.')
        setTimeout(connectSocket, 50)
      }
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js"
      document.getElementsByTagName('head')[0].appendChild(script);
      return // wait to be called via script.onload()
    }

    // Wechaty global variable: socket
    var socket  = Wechaty.socket = io.connect('https://127.0.0.1:' + port)

    socket.on('connect', function() {
      clog('on connect entried')
      // new message
      Wechaty.glue.rootScope.$on("message:add:success", function (event, data) { 
        socket.emit('message', data)
      })
      // ping -> pong. for test & live check purpose
      socket.on('ping', function (e) {
        clog('received socket io event: ping. emit pong...')
        socket.emit('pong', 'pong')
      })
      // re-connect XXX will socketio library auto re-connect by itself???
      // socket.on('disconnect', function(e) {
      //   clog('event: socket disconnect')
      //   // Reconnect...
      //   setTimeout(function () {
      //     clog('starting initSocket after disconnect')
      //     initSocket()
      //   }, 1000)
      // })
    })
  }

  window.Wechaty = Wechaty

  var callback = arguments[arguments.length - 1]
  if (typeof callback==='function')
    callback('Wechaty')

  return 'Wechaty'

}.apply(window, arguments))
