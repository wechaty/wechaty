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
if (typeof Wechaty !== 'undefined') {
  return 'Wechaty already injected?'
}

return (function(port) {
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
    glue: {} // will be initialized by glueAngular() function
    // glue funcs
    , getLoginStatusCode: function() { return Wechaty.glue.loginScope.code }
    , getLoginQrImgUrl:   function() { return Wechaty.glue.loginScope.qrcodeUrl }
    , isLogin:            function() { return !!(window.MMCgi && window.MMCgi.isLogin) }
    , isReady:            isReady

    // variable
    , socket:     null
    , eventsBuf:  []

    // funcs
    , init: init
    , send: send
    , clog: clog // Console log
    , slog: slog // log throw Socket IO
    , ding: ding
    , quit: quit
    , emit: emit

    , getContact: getContact
  }

  function isReady() {
    return !!((typeof angular) !== 'undefined' && angular.element && angular.element('body'))
  }
  function init() {
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

    var http            = injector.get('$http')
    var accountFactory  = injector.get('accountFactory')
    var chatFactory     = injector.get('chatFactory')
    var confFactory     = injector.get('confFactory')
    var contactFactory  = injector.get('contactFactory')

    var rootScope   = injector.get('$rootScope')
    var appScope    = angular.element('[ng-controller="appController"]').scope()
    var loginScope  = angular.element('[ng-controller="loginController"]').scope()

    // get all we need from wx in browser(angularjs)
    Wechaty.glue = {
      injector:       injector
      , http:         http

      , accountFactory: accountFactory
      , chatFactory:    chatFactory
      , confFactory:    confFactory
      , contactFactory: contactFactory

      , rootScope:    rootScope
      , appScope:     appScope
      , loginScope:   loginScope
    }
  }

  function quit() {
    if (Wechaty.socket) {
      Wechaty.socket.close()
      Wechaty.socket = null
    }
    clog('quit()')
  }
  function slog(msg) { return Wechaty.socket && Wechaty.socket.emit('log', msg) }
  function ding()     { return 'dong' }
  function send(ToUserName, Content) {
    var chat = Wechaty.glue.chatFactory
    var m = chat.createMessage({
      ToUserName: ToUserName
      , Content: Content
      , MsgType: Wechaty.glue.confFactory.MSGTYPE_TEXT
    })
    chat.appendMessage(m)
    return chat.sendMessage(m)
  }
  function getContact(id) { return Wechaty.glue.contactFactory.getContact(id) }
  function hookMessage() {
    Wechaty.glue.rootScope.$on('message:add:success', function(event, data) {
      Wechaty.emit('message', data)
    })
    Wechaty.glue.appScope.$on("newLoginPage", function(event, data) {
      Wechaty.emit('login', data)
    })
    Wechaty.glue.rootScope.$on('root:pageInit:success'), function (event, data) {
      Wechaty.emit('login', data)
    }
  }
  function hookUnload() {
    window.addEventListener('unload', function(e) {
      // XXX only 1 event can be emitted here???
      Wechaty.emit('unload', e)
      // Wechaty.slog('emit unload')
      // Wechaty.emit('logout', e)
      // Wechaty.slog('emit logout')
      // Wechaty.slog('emit logout&unload over')
    })
  }
  // Wechaty.emit, will save event & data when there's no socket io connection to prevent event lost
  function emit(event, data) {
    if (!Wechaty.socket) {
      clog('Wechaty.socket not ready')
      if (event) {
        Wechaty.eventsBuf.push([event, data])
      }
      setTimeout(emit, 1000) // resent eventsBuf after 1000ms
      return
    }
    if (Wechaty.eventsBuf.length) {
      clog('Wechaty.eventsBuf has ' + Wechaty.eventsBuf.length + ' unsend events')
      var eventData
      while (eventData = Wechaty.eventsBuf.pop()) {
        Wechaty.socket.emit(eventData[0], eventData[1])
      }
      clog('Wechaty.eventsBuf all sent')
    }
    if (event) {
      Wechaty.socket.emit(event, data)
    }
  }
  function connectSocket() {
    clog('connectSocket()')
    if (typeof io !== 'function') {
      clog('connectSocket: io not found. loading lib...')
      // http://stackoverflow.com/a/3248500/1123955
      var script = document.createElement('script')
      script.onload = function() {
        clog('socket io lib loaded.')
        setTimeout(connectSocket, 50)
      }
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js'
      document.getElementsByTagName('head')[0].appendChild(script)
      return // wait to be called via script.onload()
    }

    // Wechaty global variable: socket
    var socket  = Wechaty.socket = io.connect('https://127.0.0.1:' + port)

    // ding -> dong. for test & live check purpose
    // ping/pong are reserved by socket.io https://github.com/socketio/socket.io/issues/2414
    socket.on('ding', function(e) {
      clog('received socket io event: ding. emit dong...')
      socket.emit('dong', 'dong')
    })

    socket.on('connect'   , function(e) { clog('connected to server:' + e) })
    socket.on('disconnect', function(e) { clog('socket disconnect:' + e) })

    //   // Reconnect...
    //   setTimeout(function () {
    //     clog('starting initSocket after disconnect')
    //     initSocket()
    //   }, 1000)
    // })
  }

  window.Wechaty = Wechaty

  if (Wechaty.isLogin()) {
    Wechaty.emit('login', 'page refresh')
  }
  var callback = arguments[arguments.length - 1]
  if (typeof callback === 'function') {
    return callback('Wechaty')
  }

  return 'Wechaty'

}.apply(window, arguments))
