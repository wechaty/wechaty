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

  /*
   * Wechaty injectio must return this object.
   * PuppetWebBridge need this to decide if injection is successful.
   */
  retObj = {
    code: 200 // 2XX ok, 4XX/5XX error. HTTP like
    , message: 'any message'
    , port: port
  }

  if (typeof this.Wechaty !== 'undefined') {
    retObj.code = 201
    retObj.message = 'Wechaty already injected?'
    return retObj
  }

  var Wechaty = {
    glue: {
      // will be initialized by glueToAngular() function
    }

    // glue funcs
    , getLoginStatusCode: function() { return Wechaty.glue.loginScope.code }
    , getLoginQrImgUrl:   function() { return Wechaty.glue.loginScope.qrcodeUrl }
    , angularIsReady:    angularIsReady

    // variable
    , vars: {
      logined:      false
      , inited:     false

      , socket:     null
      , eventsBuf:  []
      , scanCode:   null
      , heartBeatTimmer:   null
    }

    // funcs
    , init: init  // initialize Wechaty @ Browser
    , send: send  // send message to wechat user
    , clog: clog  // log to Console
    , slog: slog  // log to SocketIO
    , log:  log   // log to both Console & SocketIO
    , ding: ding  // simple return 'dong'
    , quit: quit  // quit wechat
    , emit: emit  // send event to server

    , getContact: getContact
    , getUserName: getUserName
    , getMsgImg: getMsgImg

    // test purpose
    , isLogin: isLogin
    , initClog: initClog
  }

  this.Wechaty = Wechaty
  retObj.code = 200
  retObj.message = 'Wechaty Inject Succ'
  return retObj

  /**
   * Two return mode of WebDriver (should be one of them at a time)
   * 1. a callback. return a value by call callback with args
   * 2. direct return
   */
  // var callback = arguments[arguments.length - 1]
  // if (typeof callback === 'function') {
  //   return callback(retObj)
  // } else {
  // return retObj
  // }

  retObj.code = 500
  retObj.message = 'SHOULD NOT RUN TO HERE'
  return retObj

  /////////////////////////////////////////////////////////////////////////////

  function init() {
    if (!initClog()) { // make console.log work (wxapp disabled the console.log)
      retObj.code = 501
      retObj.message = 'initClog fail'
      return retObj
    }

    if (Wechaty.vars.inited === true) {
      log('Wechaty.init() called twice: already inited')
      retObj.code = 201
      retObj.message = 'init() already inited before. returned with do nothing'
      return retObj
    }

    if (!angularIsReady()) {
      clog('angular not ready. wait 500ms...')
      setTimeout(init, 1000)
      retObj.code = 202
      retObj.message = 'init() entered waiting angular loop'// AngularJS not ready, wait 500ms then try again.
      return retObj
    }

    clog('init on port:' + port)

    if (MMCgiLogined()) {
      login('page refresh')
    }

    glueToAngular()
    connectSocket()
    hookEvents()

    checkScan()

    heartBeat(true)

    clog('inited!. ;-D')
    Wechaty.vars.inited = true

    retObj.code = 200
    retObj.message = 'init(): success on port ' + port
    return retObj
  }

  /**
  * Log to console
  * http://stackoverflow.com/a/7089553/1123955
  */
  function initClog() {
    if (Wechaty.vars.iframe) {
      log('initClog() again? there is already a iframe')
      return true
    }

    if (!document.body) {
      log('initClog() not ready because document.body not ready')
      return false
    }

    var i = document.createElement('iframe')
    if (!i) {
      log('initClog() not ready because document.createElement fail')
      return false
    }

    // slog('initClog got iframe element')
    i.style.display = 'none'
    document.body.appendChild(i)
    Wechaty.vars.iframe = i
    // if (!Wechaty.vars.iframe) {
    //   throw new Error('iframe gone after appendChild, WTF???')
    // }
    // slog('initClog done')
    return true
  }

  function clog(s) {
    var d = new Date()
    s = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ' <Wechaty> ' + s

    if (Wechaty.vars.iframe) {
      Wechaty.vars.iframe.contentWindow.console.log(s)
    } else {
      throw new Error('clog() iframe not found when be invocked')
    }
  }

  function slog(msg)  { Wechaty.emit('log', msg) }
  function log(s)     { clog(s); slog(s) }

  /**
   * Wechaty.emit, will save event & data when there's no socket io connection to prevent event lost
   * NOTICE: only clog available here, because slog & log will call emit, death loop
   */
  function emit(event, data) {
    var eventsBuf = Wechaty.vars.eventsBuf
    if (!eventsBuf.map) {
      throw new Error('Wechaty.vars.eventsBuf must be a Array')
    }
    if (event) {
      eventsBuf.push([event, data])
    }
    var socket = Wechaty.vars.socket
    if (!socket) {
      clog('Wechaty.vars.socket not ready')
      return setTimeout(emit, 1000) // resent eventsBuf after 1000ms
    }
    var bufLen = eventsBuf.length
    if (bufLen) {
      if (bufLen > 1) { clog('Wechaty.vars.eventsBuf has ' + bufLen + ' unsend events') }

      while (eventsBuf.length) {
        var eventData = eventsBuf.pop()
        if (eventData && eventData.map && eventData.length===2) {
          clog('emiting ' + eventData[0])
          socket.emit(eventData[0], eventData[1])
        } else { clog('Wechaty.emit() got invalid eventData: ' + eventData[0] + ', ' + eventData[1] + ', length: ' + eventData.length) }
      }

      if (bufLen > 1) { clog('Wechaty.vars.eventsBuf[' + bufLen + '] all sent') }
    }
  }

  /**
  *
  * Functions that Glued with AngularJS
  *
  */
  function MMCgiLogined() { return !!(window.MMCgi && window.MMCgi.isLogin) }
  function angularIsReady() {
    return !!(
      (typeof angular) !== 'undefined'
      && angular.element
      && angular.element('body')
    )
  }

  function heartBeat(firstTime) {
    var TIMEOUT = 15000 // 15s
    if (firstTime && Wechaty.vars.heartBeatTimmer) {
      Wechaty.log('heartBeat timer exist when 1st time is true? return for do nothing')
      return
    }
    Wechaty.emit('ding', 'heartbeat@browser')
    Wechaty.vars.heartBeatTimmer = setTimeout(heartBeat, TIMEOUT)
    return TIMEOUT
  }

  function glueToAngular() {
    var injector  = angular.element(document).injector()

    var http            = injector.get('$http')
    var accountFactory  = injector.get('accountFactory')
    var chatFactory     = injector.get('chatFactory')
    var confFactory     = injector.get('confFactory')
    var contactFactory  = injector.get('contactFactory')

    var rootScope   = injector.get('$rootScope')
    var appScope    = angular.element('[ng-controller="appController"]').scope()
    var loginScope  = angular.element('[ng-controller="loginController"]').scope()

    /**
     * generate $scope with a contoller (as it is not assigned in html staticly)
     * https://github.com/angular/angular.js/blob/a4e60cb6970d8b6fa9e0af4b9f881ee3ba7fdc99/test/ng/controllerSpec.js#L24
     */
    var contentChatScope  = rootScope.$new()
    injector.get('$controller')('contentChatController', {$scope: contentChatScope })
    /*
    s =

    */

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

      , contentChatScope: contentChatScope
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
    if (url && code !== Wechaty.vars.scanCode) {

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
    setTimeout(checkScan, 1000)
    return
  }

  function isLogin() { return !!Wechaty.vars.logined }
  function login(data) {
    log('login(' + data + ')')
    Wechaty.vars.logined = true
    Wechaty.emit('login', data)
  }
  function logout(data) {
    log('logout(' + data + ')')
    Wechaty.vars.logined = false
    Wechaty.emit('logout', data)
    checkScan()
  }
  function quit() {
    log('quit()')
    logout('quit()')
    if (Wechaty.vars.socket) {
      Wechaty.vars.socket.close()
      Wechaty.vars.socket = null
    }
  }

  function ding() { log('recv ding'); return 'dong' }
  function hookEvents() {
    var rootScope = Wechaty.glue.rootScope
    var appScope = Wechaty.glue.appScope
    if (!rootScope || !appScope) {
      log('hookEvents() no rootScope')
      return false
    }
    rootScope.$on('message:add:success', function(event, data) {
      if (!isLogin()) { // in case of we missed the pageInit event
        login('by event[message:add:success]')
      }
      Wechaty.emit('message', data)
    })
    rootScope.$on('root:pageInit:success'), function (event, data) {
      login('by event[root:pageInit:success]')
    }
    appScope.$on("newLoginPage", function(event, data) {
      login('by event[newLoginPage]')
    })
    window.addEventListener('unload', function(e) {
      // XXX only 1 event can be emitted here???
      Wechaty.emit('unload', e)
      // Wechaty.slog('emit unload')
      // Wechaty.emit('logout', e)
      // Wechaty.slog('emit logout')
      // Wechaty.slog('emit logout&unload over')
    })
    return true
  }
  function connectSocket() {
    log('connectSocket()')
    if (typeof io !== 'function') {
      log('connectSocket: io not found. loading lib...')
      // http://stackoverflow.com/a/3248500/1123955
      var script = document.createElement('script')
      script.onload = function() {
        log('socket io lib loaded.')
        connectSocket()
      }
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js'
      document.getElementsByTagName('head')[0].appendChild(script)
      return // wait to be called via script.onload()
    }

    /*global io*/ // Wechaty global variable: socket
    var socket  = Wechaty.vars.socket = io.connect('https://127.0.0.1:' + port)

    // ding -> dong. for test & live check purpose
    // ping/pong are reserved by socket.io https://github.com/socketio/socket.io/issues/2414
    socket.on('ding', function(data) {
      log('received socket io event: ding(' + data + '). emit dong...')
      socket.emit('dong', data)
    })

    socket.on('connect'   , function(e) { clog('connected to server:' + e) })
    socket.on('disconnect', function(e) { clog('socket disconnect:'   + e) })
  }

  /**
   *
   * Help Functions which Proxy to WXAPP AngularJS Scope & Factory
   *
   */
  function getMsgImg(id) {
    var contentChatScope = Wechaty.glue.contentChatScope
    if (!contentChatScope) {
      throw new Error('getMsgImg() contentChatScope not found')
    }
    var location = window.location.href.replace(/\/$/, '')
    var path = contentChatScope.getMsgImg(id)
    return location + path
  }

  function send(ToUserName, Content) {
    var chatFactory = Wechaty.glue.chatFactory
    var confFactory = Wechaty.glue.confFactory

    if (!chatFactory || !confFactory) {
      log('send() chatFactory or confFactory not exist.')
      return false
    }
    var m = chatFactory.createMessage({
      ToUserName: ToUserName
      , Content: Content
      , MsgType: confFactory.MSGTYPE_TEXT
    })
    chatFactory.appendMessage(m)
    return chatFactory.sendMessage(m)
  }
  function getContact(id) {
    var contactFactory = Wechaty.glue.contactFactory
    if (!contactFactory) {
      log('contactFactory not inited')
      return null
    }
    var c = contactFactory.getContact(id)
    if (c && c.isContact) {
      c.stranger = !(c.isContact())
    }
    return c
  }
  function getUserName() {
    var accountFactory = Wechaty.glue.accountFactory
    return accountFactory
    ? accountFactory.getUserName()
    : null
  }

}.apply(window, arguments))