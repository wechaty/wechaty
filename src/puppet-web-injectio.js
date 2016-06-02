/**
 *
 * Wechaty - Wechat for Bot, and human who talk to bot.
 *
 * Class PuppetWebInjectio
 *
 * Inject this js code to browser,
 * in order to interactive with wechat web program.
 *
 * Licenst: MIT
 * https://github.com/zixia/wechaty-lib
 *
 */

/*global angular*/

return (function(port) {
  port = port || 8788

  if (typeof Wechaty !== 'undefined') {
    return 'Wechaty already injected?'
  }

  var Wechaty = {
    glue: {
    } // will be initialized by glueAngular() function

    // glue funcs
    , getLoginStatusCode: function() { return Wechaty.glue.loginScope.code }
    , getLoginQrImgUrl:   function() { return Wechaty.glue.loginScope.qrcodeUrl }
    , isReady:            isReady

    // variable
    , vars: {
      logined:      false
      , inited:     false

      , socket:     null
      , eventsBuf:  []
      , scanCode:   null
    }

    // funcs
    , init: init
    , send: send
    , clog: clog // Console log
    , slog: slog // log throw Socket IO
    , log:  log
    , ding: ding
    , quit: quit
    , emit: emit

    , getContact: getContact
    , getUserName: getUserName
  }

  window.Wechaty = Wechaty

  if (isWxLogin()) {
    login('page refresh')
  }

  /**
   * Two return mode of WebDriver (should be one of them at a time)
   * 1. a callback. return a value by call callback with args
   * 2. direct return
   */
  var callback = arguments[arguments.length - 1]
  if (typeof callback === 'function') {
    return callback('Wechaty')
  } else {
    return 'Wechaty'
  }

  return 'Should not run to here'

  /////////////////////////////////////////////////////////////////////////////

  /**
  *
  * Functions that Glued with AngularJS
  *
  */
  function isWxLogin() { return !!(window.MMCgi && window.MMCgi.isLogin) }
  function isReady() {
    return !!(
      (typeof angular) !== 'undefined'
      && angular.element
      && angular.element('body')
    )
  }
  function init() {
    if (Wechaty.vars.inited === true) {
      log('Wechaty.init() called twice: already inited')
      return
    }

    if (!isReady()) {
      clog('angular not ready. wait 500ms...')
      setTimeout(init, 500)
      return // AngularJS not ready, wait 500ms then try again.
    }

    clog('init on port:' + port)
    glueAngular()
    connectSocket()
    hookEvents()

    checkScan()

    heartBeat()

    clog('inited!. ;-D')
    return Wechaty.vars.inited = true
  }

  function heartBeat() {
    Wechaty.emit('ding', 'heartbeat in browser')
    setTimeout(heartBeat, 15000)
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

  function checkScan() {
    clog('checkScan()')
    if (isLogin()) {
      log('checkScan() - already login, no more check')
      return
    }
    if (!Wechaty.glue.loginScope) {
      log('checkScan() - loginScope disappeared, no more check')
      login('loginScope disappeared')
      return
    }

    // loginScope.code:
    // 0:   显示二维码
    // 201: 扫描，未确认
    // 200: 登录成功
    // 408: 未确认
    var code  = +Wechaty.glue.loginScope.code
    var url   =  Wechaty.glue.loginScope.qrcodeUrl
    if (code !== Wechaty.vars.scanCode) {
      log('checkScan() - code change detected. from '
        + Wechaty.vars.scanCode
        + ' to '
        + code
      )
      Wechaty.emit('scan', {
        code:   code
        , url:  url
      })
      Wechaty.vars.scanCode = code
    }
    setTimeout(checkScan, 100)
    return
  }

  function isLogin() { return !!Wechaty.vars.logined }
  function login(data) {
    clog('login()')
    Wechaty.vars.logined = true
    Wechaty.emit('login', data)
  }
  function logout(data) {
    clog('logout()')
    Wechaty.vars.logined = false
    Wechaty.emit('logout', data)
    checkScan()
  }
  function quit() {
    clog('quit()')
    if (Wechaty.vars.socket) {
      Wechaty.vars.socket.close()
      Wechaty.vars.socket = null
    }
  }
  function log(s)     { clog(s); slog(s) }
  function slog(msg)  { return Wechaty.vars.socket && Wechaty.vars.socket.emit('log', msg) }
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
  function getContact(id) {
    if (Wechaty.glue.contactFactory) {
      var c = Wechaty.glue.contactFactory.getContact(id)
      if (c && c.isContact) {
        c.stranger = !(c.isContact())
      }
      return c
    }
    log('contactFactory not inited')
    return null
  }
  function getUserName() {
    return Wechaty.glue.accountFactory
    ? Wechaty.glue.accountFactory.getUserName()
    : null
  }
  function hookEvents() {
    Wechaty.glue.rootScope.$on('message:add:success', function(event, data) {
      if (!isLogin()) { // in case of we missed the pageInit event
        login('by event[message:add:success]')
      }
      Wechaty.emit('message', data)
    })
    Wechaty.glue.appScope.$on("newLoginPage", function(event, data) {
      login('by event[newLoginPage]')
    })
    Wechaty.glue.rootScope.$on('root:pageInit:success'), function (event, data) {
      login('by event[root:pageInit:success]')
    }
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
    if (event) {
      Wechaty.vars.eventsBuf.push([event, data])
    }
    if (!Wechaty.vars.socket) {
      clog('Wechaty.vars.socket not ready')
      return setTimeout(emit, 1000) // resent eventsBuf after 1000ms
    }
    if (Wechaty.vars.eventsBuf.length) {
      clog('Wechaty.vars.eventsBuf has ' + Wechaty.vars.eventsBuf.length + ' unsend events')
      while (Wechaty.vars.eventsBuf.length) {
        var eventData = Wechaty.vars.eventsBuf.pop()
        Wechaty.vars.socket.emit(eventData[0], eventData[1])
      }
      clog('Wechaty.vars.eventsBuf all sent')
    }
    // if (event) {
    //   Wechaty.vars.socket.emit(event, data)
    // }
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

    /*global io*/ // Wechaty global variable: socket
    var socket  = Wechaty.vars.socket = io.connect('https://127.0.0.1:' + port)

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

}.apply(window, arguments))
