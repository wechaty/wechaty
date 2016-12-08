/**
 *
 * Wechaty - Wechat for Bot, and human who talk to bot.
 *
 * Class PuppetWebInjectio
 *
 * Inject this js code to browser,
 * in order to interactive with wechat web program.
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 *
 * ATTENTION:
 *
 * JAVASCRIPT IN THIS FILE
 * IS RUN INSIDE
 *
 *    BROWSER
 *
 * INSTEAD OF
 *
 *    NODE
 *
 * read more about this in puppet-web-bridge.js
 *
 */

/*global angular*/

(function(port) {

  function init() {
    if (!angularIsReady()) {
      retObj.code = 503 // 503 SERVICE UNAVAILABLE https://httpstatuses.com/503
      retObj.message = 'init() without a ready angular env'
      return retObj
    }

    if (!initClog(false)) { // make console.log work (wxapp disabled the console.log)
      retObj.code = 503 // 503 Service Unavailable http://www.restapitutorial.com/httpstatuscodes.html
      retObj.message = 'initClog fail'
      return retObj
    }

    if (WechatyBro.vars.initStatus === true) {
      log('WechatyBro.init() called twice: already inited')
      retObj.code = 304 // 304 Not Modified https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.3.5
      retObj.message = 'init() already inited before. returned with do nothing'
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
    WechatyBro.vars.initStatus = true

    retObj.code = 200
    retObj.message = 'WechatyBro Init Succ on port: ' + port
    return retObj
  }

  /**
  * Log to console
  * http://stackoverflow.com/a/7089553/1123955
  */
  function initClog(enabled) {
    if (!enabled) {
      return true
    }

    if (WechatyBro.vars.iframe) {
      log('initClog() again? there is already a iframe')
      return true
    }

    if (!document.body) { // Javascript Error Null is not an Object
      // log('initClog() not ready because document.body not ready')
      return false
    }

    var i = document.createElement('iframe')
    if (!i) {
      // log('initClog() not ready because document.createElement fail')
      return false
    }

    // slog('initClog got iframe element')
    i.style.display = 'none'
    document.body.appendChild(i)
    WechatyBro.vars.iframe = i
    // if (!WechatyBro.vars.iframe) {
    //   throw new Error('iframe gone after appendChild, WTF???')
    // }
    // slog('initClog done')
    return true
  }

  function clog(s) {
    if (!WechatyBro.vars.iframe) {
      // throw new Error('clog() iframe not found when be invocked')
      return
    }

    var d = new Date()
    s = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ' <WechatyBro> ' + s

    WechatyBro.vars.iframe.contentWindow.console.log(s)
  }

  function slog(msg)  { WechatyBro.emit('log', msg) }
  function log(s)     { clog(s); slog(s) }

  /**
   * WechatyBro.emit, will save event & data when there's no socket io connection to prevent event lost
   * NOTICE: only clog available here, because slog & log will call emit, death loop
   */
  function emit(event, data) {
    var eventsBuf = WechatyBro.vars.eventsBuf
    if (!eventsBuf.map) {
      throw new Error('WechatyBro.vars.eventsBuf must be a Array')
    }
    if (event) {
      eventsBuf.unshift([event, data])
    }
    var socket = WechatyBro.vars.socket
    if (!socket) {
      clog('WechatyBro.vars.socket not ready')
      return setTimeout(emit, 1000) // resent eventsBuf after 1000ms
    }
    var bufLen = eventsBuf.length
    if (bufLen) {
      if (bufLen > 1) { clog('WechatyBro.vars.eventsBuf has ' + bufLen + ' unsend events') }

      while (eventsBuf.length) {
        var eventData = eventsBuf.pop()
        if (eventData && eventData.map && eventData.length===2) {
          clog('emiting ' + eventData[0])
          socket.emit(eventData[0], eventData[1])
        } else { clog('WechatyBro.emit() got invalid eventData: ' + eventData[0] + ', ' + eventData[1] + ', length: ' + eventData.length) }
      }

      if (bufLen > 1) { clog('WechatyBro.vars.eventsBuf[' + bufLen + '] all sent') }
    }
  }

  /**
  *
  * Functions that Glued with AngularJS
  *
  */
  function MMCgiLogined() { return !!(window.MMCgi && window.MMCgi.isLogin) }

  function angularIsReady() {
    // don't log inside, because we has not yet init clog here.
    return !!(
      (typeof angular) !== 'undefined'
      && angular.element
      && angular.element('body')
      && angular.element(document).injector()
    )
  }

  function heartBeat(firstTime) {
    var TIMEOUT = 15000 // 15s
    if (firstTime && WechatyBro.vars.heartBeatTimmer) {
      WechatyBro.log('heartBeat timer exist when 1st time is true? return for do nothing')
      return
    }
    WechatyBro.emit('ding', 'heartbeat@browser')
    WechatyBro.vars.heartBeatTimmer = setTimeout(heartBeat, TIMEOUT)
    return TIMEOUT
  }

  function glueToAngular() {
    var injector  = angular.element(document).injector()
    if (!injector) {
      throw new Error('glueToAngular cant get injector(right now)')
    }

    var accountFactory  = injector.get('accountFactory')
    var appFactory      = injector.get('appFactory')
    var chatroomFactory = injector.get('chatroomFactory')
    var chatFactory     = injector.get('chatFactory')
    var contactFactory  = injector.get('contactFactory')
    var confFactory     = injector.get('confFactory')
    var emojiFactory    = injector.get('emojiFactory')
    var loginFactory    = injector.get('loginFactory')

    var http            = injector.get('$http')
    var state           = injector.get('$state')
    var mmHttp          = injector.get('mmHttp')

    var appScope    = angular.element('[ng-controller="appController"]').scope()
    var rootScope   = injector.get('$rootScope')
    var loginScope  = angular.element('[ng-controller="loginController"]').scope()

/*
    // method 1
    appFactory.syncOrig = appFactory.sync
    appFactory.syncCheckOrig = appFactory.syncCheck
    appFactory.sync = function() { WechatyBro.log('appFactory.sync() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); return appFactory.syncOrig(arguments) }
    appFactory.syncCheck = function() { WechatyBro.log('appFactory.syncCheck() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); return appFactory.syncCheckOrig(arguments) }

    // method 2
    $.ajaxOrig = $.ajax
    $.ajax = function() { WechatyBro.log('$.ajax() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); return $.ajaxOrig(arguments) }

    $.ajax({
      url: "https://wx.qq.com/zh_CN/htmledition/v2/images/webwxgeticon.jpg"
      , type: "GET"
    }).done(function (response) {
      alert("success");
    })

    // method 3 - mmHttp
    mmHttp.getOrig = mmHttp.get
    mmHttp.get = function() { WechatyBro.log('mmHttp.get() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); return mmHttp.getOrig(arguments) }
*/

    /**
     * generate $scope with a contoller (as it is not assigned in html staticly)
     * https://github.com/angular/angular.js/blob/a4e60cb6970d8b6fa9e0af4b9f881ee3ba7fdc99/test/ng/controllerSpec.js#L24
     */
    var contentChatScope  = rootScope.$new()
    injector.get('$controller')('contentChatController', {$scope: contentChatScope })

    // get all we need from wx in browser(angularjs)
    WechatyBro.glue = {
      injector:       injector
      , http:         http
      , mmHttp:       mmHttp
      , state:        state

      , accountFactory:  accountFactory
      , chatroomFactory: chatroomFactory
      , chatFactory:     chatFactory
      , confFactory:     confFactory
      , contactFactory:  contactFactory
      , emojiFactory:    emojiFactory
      , loginFactory:    loginFactory

      , rootScope:    rootScope
      , appScope:     appScope
      , loginScope:   loginScope

      , contentChatScope: contentChatScope
    }

    return true
  }

  function checkScan() {
    clog('checkScan()')
    if (isLogin()) {
      log('checkScan() - already login, no more check, and return(only)') //but I will emit a login event')
      // login('checkScan found already login')
      return
    }
    if (!WechatyBro.glue.loginScope) {
      log('checkScan() - loginScope disappeared, no more check')
      login('loginScope disappeared')
      return
    }

    // loginScope.code:
    // 0:   显示二维码
    // 408: 未确认（显示二维码后30秒触发）
    // 201: 扫描，未确认
    // 200: 登录成功
    var code  = +WechatyBro.glue.loginScope.code
    var url   =  WechatyBro.glue.loginScope.qrcodeUrl
    if (url && code !== WechatyBro.vars.scanCode) {

      log('checkScan() - code change detected: from '
        + WechatyBro.vars.scanCode
        + ' to '
        + code
      )
      WechatyBro.emit('scan', {
        code:   code
        , url:  url
      })
      WechatyBro.vars.scanCode = code
    }

    if (code === 200) {
      login('scan code 200')
    } else {
      setTimeout(checkScan, 1000)
    }
    return
  }

  function isLogin() { return !!WechatyBro.vars.loginStatus }
  function login(data) {
    log('login(' + data + ')')
    if (!WechatyBro.vars.loginStatus) {
      WechatyBro.vars.loginStatus = true
    }
    WechatyBro.emit('login', data)
  }
  function logout(data) {
    log('logout(' + data + ')')
    WechatyBro.vars.loginStatus = false
    // WechatyBro.emit('logout', data)
    if (WechatyBro.glue.loginFactory) {
      WechatyBro.glue.loginFactory.loginout()
    }
    checkScan()
  }
  function quit() {
    log('quit()')
    logout('quit()')
    if (WechatyBro.vars.socket) {
      WechatyBro.vars.socket.close()
      WechatyBro.vars.socket = null
    }
  }

  function ding(data) { log('recv ding'); return data || 'dong' }
  function hookEvents() {
    var rootScope = WechatyBro.glue.rootScope
    var appScope = WechatyBro.glue.appScope
    if (!rootScope || !appScope) {
      log('hookEvents() no rootScope')
      return false
    }
    rootScope.$on('message:add:success', function(event, data) {
      if (!isLogin()) { // in case of we missed the pageInit event
        login('by event[message:add:success]')
      }
      WechatyBro.emit('message', data)
    })
    rootScope.$on('root:pageInit:success'), function (event, data) {
      login('by event[root:pageInit:success]')
    }
    // newLoginPage seems not stand for a user login action
    // appScope.$on("newLoginPage", function(event, data) {
    //   login('by event[newLoginPage]')
    // })
    window.addEventListener('unload', function(e) {
      // XXX only 1 event can be emitted here???
      WechatyBro.emit('unload', String(e))
      // WechatyBro.slog('emit unload')
      // WechatyBro.emit('logout', e)
      // WechatyBro.slog('emit logout')
      // WechatyBro.slog('emit logout&unload over')
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
      script.src = '//cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js'
      document.getElementsByTagName('head')[0].appendChild(script)
      return // wait to be called via script.onload()
    }

    /*global io*/ // WechatyBro global variable: socket
    var socket  = WechatyBro.vars.socket = io.connect('wss://127.0.0.1:' + port/*, {transports: ['websocket']}*/)

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
   *  getMsgImg(message.MsgId,'slave')
   *  getMsgImg(message.MsgId,'big',message)
   */
  function getMsgImg(id, type, message) {
    var contentChatScope = WechatyBro.glue.contentChatScope
    if (!contentChatScope) {
      throw new Error('getMsgImg() contentChatScope not found')
    }
    var location = window.location.href.replace(/\/$/, '')
    var path = contentChatScope.getMsgImg(id, type, message)
    return location + path
  }

  function getMsgEmoticon(id) {
    var chatFactory = WechatyBro.glue.chatFactory

    var message = chatFactory.getMsg(id)
    return message.MMPreviewSrc || getMsgImg(message.MsgId,'big',message)  || message.MMThumbSrc
  }

  function getMsgVideo(id) {
    var contentChatScope = WechatyBro.glue.contentChatScope
    if (!contentChatScope) {
      throw new Error('getMsgVideo() contentChatScope not found')
    }
    var location = window.location.href.replace(/\/$/, '')
    var path = contentChatScope.getMsgVideo(id)
    return location + path
  }

  /**
   * from playVoice()
   */
  function getMsgVoice(id) {
    var confFactory     = WechatyBro.glue.confFactory
    var accountFactory  = WechatyBro.glue.accountFactory

    var location = window.location.href.replace(/\/$/, '')
    var path = confFactory.API_webwxgetvoice + "?msgid=" + id + "&skey=" + accountFactory.getSkey()
    return location + path
  }

  function getMsgPublicLinkImg(id) {
    var location = window.location.href.replace(/\/$/, '')
    var path = '/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg?url=xxx&msgid=' + id + '&pictype=location'
    return location + path
  }

  function send(ToUserName, Content) {
    var chatFactory = WechatyBro.glue.chatFactory
    var confFactory = WechatyBro.glue.confFactory

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
    var contactFactory = WechatyBro.glue.contactFactory
    if (!contactFactory) {
      log('contactFactory not inited')
      return null
    }
    var c = contactFactory.getContact(id)
    var contactWithoutFunction = {}

    if (c) {
      if (c.isContact) {
        // extend rawObj to identify `stranger`
        c.stranger = !(c.isContact())
      }

      Object.keys(c).forEach(function(k) {
        if (typeof c[k] !== 'function') {
          contactWithoutFunction[k] = c[k]
        }
      })

    } else {

      /**
       * when `id` does not exist in _contact Array, maybe it is belongs to a stranger in a room.
       * try to find in room's member list for this `id`, and return the contact info, if any.
       */
      c = Object.keys(_contacts)
                .filter(function(id) { return id.match(/^@@/) })    // only search in room
                .map(function(id) { return _contacts[id] })         // map to room array
                .filter(function(r) { return r.MemberList.length }) // get rid of room without member list
                .filter(function(r) { return r.MemberList
                                              .filter(function(m) { return m.UserName === id })
                                              .length
                })
                .map(function(c) { return c.MemberList
                                           .filter(function(m) { return m.UserName === id })
                                           [0]
                })
                [0]

      if (c) {
        c.stranger = true

        Object.keys(c).forEach(function(k) {
          if (typeof c[k] !== 'function') {
            contactWithoutFunction[k] = c[k]
          }
        })
      }

    }

    return contactWithoutFunction
  }

  function getUserName() {
    var accountFactory = WechatyBro.glue.accountFactory
    return accountFactory
            ? accountFactory.getUserName()
            : null
  }

  function contactFindAsync(filterFunction) {
    var callback = arguments[arguments.length - 1]
    if (typeof callback !== 'function') {
      // here we should in sync mode, because there's no callback
      throw new Error('async method need to be called via webdriver.executeAsyncScript')
    }

    var contactFactory = WechatyBro.glue.contactFactory

    var match
    if (!filterFunction) {
      match = function() { return true }
    } else {
      match = eval(filterFunction)
    }

    retryFind(0)

    return

    // retry 3 times, sleep 300ms between each time
    function retryFind(attempt) {
      attempt = attempt || 0;

      var contactList = contactFactory
                          .getAllFriendContact()
                          .filter(function(c) { return match(c) })
                          .map(function(c) { return c.UserName })

      if (contactList && contactList.length) {
        callback(contactList)
      } else if (attempt > 3) {
        callback([])
      } else {
        attempt++
        setTimeout(function() { return retryFind(attempt) }, 300)
      }

    }
  }

  function contactRemarkAsync(UserName, remark) {
    var callback = arguments[arguments.length - 1]
    if (typeof callback !== 'function') {
      // here we should in sync mode, because there's no callback
      throw new Error('async method need to be called via webdriver.executeAsyncScript')
    }

    var accountFactory  = WechatyBro.glue.accountFactory
    var confFactory     = WechatyBro.glue.confFactory
    var emojiFactory    = WechatyBro.glue.emojiFactory
    var mmHttp          = WechatyBro.glue.mmHttp

    mmHttp({
      method: "POST",
      url: confFactory.API_webwxoplog,
      data: angular.extend({
        UserName: UserName,
        CmdId: confFactory.oplogCmdId.MODREMARKNAME,
        RemarkName: emojiFactory.formatHTMLToSend(remark)
      }, accountFactory.getBaseRequest()),
      MMRetry: {
        count: 3,
        timeout: 1e4,
        serial: !0
      }
    }).success(function() {
      callback(true)
    }).error(function() {
      callback(false)
    })
  }

  function roomFind(filterFunction) {
    var contactFactory = WechatyBro.glue.contactFactory

    var match
    if (!filterFunction) {
      match = function() { return true }
    } else {
      match = eval(filterFunction)
    }
    // log(match.toString())
    return contactFactory.getAllChatroomContact()
                         .filter(function(r) { return match(r.NickName) })
                         .map(function(r) { return r.UserName })
  }

  function roomDelMember(ChatRoomName, UserName) {
    var chatroomFactory = WechatyBro.glue.chatroomFactory
    return chatroomFactory.delMember(ChatRoomName, UserName)
  }

  function roomAddMemberAsync(ChatRoomName, UserName) {
    var callback = arguments[arguments.length - 1]
    if (typeof callback !== 'function') {
      // here we should in sync mode, because there's no callback
      throw new Error('async method need to be called via webdriver.executeAsyncScript')
    }

    var chatroomFactory = WechatyBro.glue.chatroomFactory
    // log(ChatRoomName)
    // log(UserName)

    // There's no return value of addMember :(
    // https://github.com/wechaty/webwx-app-tracker/blob/f22cb043ff4201ee841990dbeb59e22643092f92/formatted/webwxApp.js#L2404-L2413
    var timer = setTimeout(function() {
      log('roomAddMemberAsync() timeout')
      callback(0)
    }, 10 * 1000)

    chatroomFactory.addMember(ChatRoomName, UserName, function(result) {

      clearTimeout(timer)
      callback(1)

      log('roomAddMemberAsync() return: ')
      log(result)

    })
  }

  function roomModTopic(ChatRoomName, topic) {
    var chatroomFactory = WechatyBro.glue.chatroomFactory
    return chatroomFactory.modTopic(ChatRoomName, topic)
  }

  function roomCreateAsync(UserNameList, topic) {
    var callback = arguments[arguments.length - 1]
    if (typeof callback !== 'function') {
      // here we should in sync mode, because there's no callback
      throw new Error('async method need to be called via webdriver.executeAsyncScript')
    }

    var UserNameListArg = UserNameList.map(function(n) { return { UserName: n } })

    var chatroomFactory = WechatyBro.glue.chatroomFactory
    var state           = WechatyBro.glue.state
    chatroomFactory.create(UserNameListArg)
                    .then(function(r) {
                      if (r.BaseResponse && 0 == r.BaseResponse.Ret || -2013 == r.BaseResponse.Ret) {
                        state.go('chat', { userName: r.ChatRoomName }) // BE CAREFUL: key name is userName, not UserName! 20161001
                        // if (topic) {
                        //   setTimeout(_ => roomModTopic(r.ChatRoomName, topic), 3000)
                        // }
                        if (!r.ChatRoomName) {
                          throw new Error('chatroomFactory.create() got empty r.ChatRoomName')
                        }
                        callback(r.ChatRoomName)
                      } else {
                        throw new Error('chatroomFactory.create() error with Ret: '
                                          + r && r.BaseResponse.Ret
                                          + 'with ErrMsg: '
                                          + r && r.BaseResponse.ErrMsg
                                      )
                      }
                    })
                    .catch(function(e) {
                      // Async can only return by call callback
                      callback(
                        JSON.parse(
                          JSON.stringify(
                            e
                            , Object.getOwnPropertyNames(e)
                          )
                        )
                      )
                    })
  }

  function verifyUserRequestAsync(UserName, VerifyContent) {
    var callback = arguments[arguments.length - 1]
    if (typeof callback !== 'function') {
      // here we should in sync mode, because there's no callback
      throw new Error('async method need to be called via webdriver.executeAsyncScript')
    }

    VerifyContent = VerifyContent || '';

    var contactFactory = WechatyBro.glue.contactFactory
    var confFactory = WechatyBro.glue.confFactory

    var Ticket = '' // what's this?

    contactFactory.verifyUser({
      UserName:        UserName
      , Opcode:        confFactory.VERIFYUSER_OPCODE_SENDREQUEST
      , Scene:         confFactory.ADDSCENE_PF_WEB
      , Ticket:        Ticket
      , VerifyContent: VerifyContent
    })
    .then(function() {  // succ
      // alert('ok')
      // log('friendAdd(' + UserName + ', ' + VerifyContent + ') done')
      callback(true)
    }, function(t) {    // fail
      // alert('not ok')
      log('friendAdd(' + UserName + ', ' + VerifyContent + ') fail: ' + t)
      callback(false)
    })
  }

  function verifyUserOkAsync(UserName, Ticket) {
    var callback = arguments[arguments.length - 1]
    if (typeof callback !== 'function') {
      // here we should in sync mode, because there's no callback
      throw new Error('async method need to be called via webdriver.executeAsyncScript')
    }

    var contactFactory  = WechatyBro.glue.contactFactory
    var confFactory     = WechatyBro.glue.confFactory

    contactFactory.verifyUser({
      UserName:   UserName
      , Opcode:   confFactory.VERIFYUSER_OPCODE_VERIFYOK
      , Scene:    confFactory.ADDSCENE_PF_WEB
      , Ticket:   Ticket
    }).then(function() {  // succ
      // alert('ok')
      log('friendVerify(' + UserName + ', ' + Ticket + ') done')
      callback(true)
    }, function(err) {       // fail
      // alert('err')
      log('friendVerify(' + UserName + ', ' + Ticket + ') fail')
      callback(false)
    })
  }




  /////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////





  port = port || 8788

  /*
   * WechatyBro injectio must return this object.
   * PuppetWebBridge need this to decide if injection is successful.
   */
  var retObj = {
    code: 200 // 2XX ok, 4XX/5XX error. HTTP like
    , message: 'any message'
    , port: port
  }

  if (typeof this.WechatyBro !== 'undefined') {
    retObj.code = 201
    retObj.message = 'WechatyBro already injected?'
    return retObj
  }

  var WechatyBro = {
    glue: {
      // will be initialized by glueToAngular() function
    }

    // glue funcs
    // , getLoginStatusCode: function() { return WechatyBro.glue.loginScope.code }
    // , getLoginQrImgUrl:   function() { return WechatyBro.glue.loginScope.qrcodeUrl }
    , angularIsReady:    angularIsReady

    // variable
    , vars: {
      loginStatus:      false
      , initStatus:     false

      , socket:     null
      , eventsBuf:  []
      , scanCode:   null
      , heartBeatTimmer:   null
    }

    // funcs
    , init: init  // initialize WechatyBro @ Browser
    , send: send  // send message to wechat user
    , clog: clog  // log to Console
    , slog: slog  // log to SocketIO
    , log:  log   // log to both Console & SocketIO
    , ding: ding  // simple return 'dong'
    , quit: quit  // quit wechat
    , emit: emit  // send event to server
    , logout: logout // logout current logined user

    , getContact:          getContact
    , getUserName:         getUserName
    , getMsgImg:           getMsgImg
    , getMsgEmoticon:      getMsgEmoticon
    , getMsgVideo:         getMsgVideo
    , getMsgVoice:         getMsgVoice
    , getMsgPublicLinkImg: getMsgPublicLinkImg

    // for Wechaty Contact Class
    , contactFindAsync:   contactFindAsync
    , contactRemarkAsync: contactRemarkAsync

    // for Wechaty Room Class
    , roomCreateAsync:    roomCreateAsync
    , roomAddMemberAsync: roomAddMemberAsync
    , roomFind:           roomFind
    , roomDelMember:      roomDelMember
    , roomModTopic:       roomModTopic

    // for Friend Request
    , verifyUserRequestAsync: verifyUserRequestAsync
    , verifyUserOkAsync:      verifyUserOkAsync
    // , friendAdd
    // , friendVerify

    // test purpose
    , isLogin: isLogin
    , initClog: initClog
  }

  this.WechatyBro = WechatyBro
  retObj.code = 200
  retObj.message = 'WechatyBro Inject Done'

  /**
   * Two return mode of WebDriver (should be one of them at a time)
   * 1. a callback. return a value by call callback with args
   * 2. direct return
   */
  var callback = arguments[arguments.length - 1]
  if (typeof callback === 'function') {
    return callback(retObj)
  }
  return retObj

  // retObj.code = 500
  // retObj.message = 'SHOULD NOT RUN TO HERE'
  // return retObj

}.apply(window, arguments))
