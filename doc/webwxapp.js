!function() {
    var e, t = function() {}
    , o = ["assert", "clear", "count", "debug", "dir", "dirxml", "error", "exception", "group", "groupCollapsed", "groupEnd", "info", "log", "markTimeline", "profile", "profileEnd", "table", "time", "timeEnd", "timeStamp", "trace", "warn"], n = o.length;
    0 == /mmdebug/.test(location.search) && location.href.indexOf("dev.web.weixin") < 0 && (window.console = {});
    for (var r = window.console = window.console || {}; n--; )
        e = o[n],
        r[e] || (r[e] = t)
}(),
angular.module("Controllers", []),
!function() {
    "use strict";
    location.href.indexOf("dev.web") < 0 ? angular.module("exceptionOverride", []).factory("$exceptionHandler", [function() {
        return function(e) {
            throw window._errorHandler && window._errorHandler(e),
            console.log(e),
            e
        }
    }
    ]) : angular.module("exceptionOverride", []),
    angular.module("Controllers").controller("appController", ["$rootScope", "$scope", "$timeout", "$log", "$state", "$window", "ngDialog", "mmpop", "appFactory", "loginFactory", "contactFactory", "accountFactory", "chatFactory", "confFactory", "contextMenuFactory", "notificationFactory", "utilFactory", "reportService", "actionTrack", "surviveCheckService", "subscribeMsgService", "stateManageService", function(
      e   // $rootScope
      , t // $scope
      , o // $timeout
      , n // $log
      , r // $state
      , a // $window
      , i // ngDialog
      , c // mmpop
      , s // appFactory
      , l // loginFactory
      , u // contactFactory
      , f // accountFactory
      , d // chatFactory
      , g // confFactory
      , m // contextMenuFactory
      , p // notificationFactory
      , h // utilFactory
      , M // reportService
      , y // actionTrack
      , C // surviveCheckService
      , v // subscribeMsgService
      , w // stateManageService
    ) {
        function S() {
            return u.pickContacts(["friend", "chatroom"], {
                chatroom: {
                    keyword: t.keyword,
                    isNewArray: !0
                },
                friend: {
                    keyword: t.keyword,
                    isNewArray: !0,
                    isWithoutBrand: !0,
                    showFriendHeader: !0
                }
            }, !0).result
        }
        function b() {
            var e = k;
            e && setTimeout(function() {
                var t = (e[0].clientHeight - e.find(".ngdialog-content").height()) / 2;
                e.css("paddingTop", t)
            }, 20)
        }
        function T() {
            t.isLoaded = !0,
            t.isUnLogin = !1,
            M.report(M.ReportType.timing, {
                timing: {
                    initStart: Date.now()
                }
            }),
            s.init().then(function(n) {
                if (h.log("initData", n),
                n.BaseResponse && "0" != n.BaseResponse.Ret)
                    return console.log("BaseResponse.Ret", n.BaseResponse.Ret),
                    void (l.timeoutDetect(n.BaseResponse.Ret) || i.openConfirm({
                        className: "default ",
                        templateUrl: "comfirmTips.html",
                        controller: ["$scope", function(e) {
                            e.title = MM.context("02d9819"),
                            e.content = MM.context("0d2fc2c"),
                            M.report(M.ReportType.initError, {
                                text: "程序初始化失败，点击确认刷新页面",
                                code: n.BaseResponse.Ret,
                                cookie: document.cookie
                            }),
                            e.callback = function() {
                                document.location.reload(!0)
                            }
                        }
                        ]
                    }));
                f.setUserInfo(n.User),
                f.setSkey(n.SKey),
                f.setSyncKey(n.SyncKey),
                u.addContact(n.User),
                u.addContacts(n.ContactList),
                d.initChatList(n.ChatSet),
                d.notifyMobile(f.getUserName(), g.StatusNotifyCode_INITED),
                v.init(n.MPSubscribeMsgList),
                e.$broadcast("root:pageInit:success"),
                h.setCheckUrl(f),
                h.log("getUserInfo", f.getUserInfo()),
                t.$broadcast("updateUser"),
                M.report(M.ReportType.timing, {
                    timing: {
                        initEnd: Date.now()
                    }
                });
                var r = n.ClickReportInterval || 3e5;
                setTimeout(function a() {
                    y.report(),
                    setTimeout(a, r)
                }, r),
                o(function() {
                    function e(o) {
                        u.initContact(o).then(function(o) {
                            u.addContacts(o.MemberList),
                            M.report(M.ReportType.timing, {
                                timing: {
                                    initContactEnd: Date.now()
                                },
                                needSend: !0
                            }),
                            16 >= t && o.Seq && 0 != o.Seq && (t++,
                            e(o.Seq))
                        })
                    }
                    M.report(M.ReportType.timing, {
                        timing: {
                            initContactStart: Date.now()
                        }
                    });
                    var t = 1;
                    e(0)
                }, 0),
                t.account = u.getContact(f.getUserName()),
                E()
            })
        }
        function E() {
            t.debug && (F && o.cancel(F),
            C.start(4e4),
            F = o(function() {
                s.syncCheck().then(function(e) {
                    return C.start(5e3),
                    e
                }, function(e) {
                    return C.start(2e3),
                    e
                }).then(N, P)
            }, g.TIMEOUT_SYNC_CHECK))
        }
        function N(e) {
            h.log("syncCheckHasChange", e);
            try {
                f.setSyncKey(e.SyncKey),
                f.updateUserInfo(e.Profile, function() {}),
                angular.forEach(e.DelContactList, function(t) {
                    d.deleteChatList(t.UserName),
                    d.deleteChatMessage(t.UserName),
                    u.deleteContact(t),
                    d.getCurrentUserName() == t.UserName && d.setCurrentUserName(""),
                    console.log("DelContactList", e.DelContactList)
                }),
                angular.forEach(e.ModContactList, function(t) {
                    u.addContact(t),
                    console.log("ModContactList", e.ModContactList)
                }),
                angular.forEach(e.AddMsgList, function(e) {
                    d.messageProcess(e)
                })
            } catch (t) {
                t.other = {
                    reason: "throw err when syncChackHasChange"
                },
                window._errorHandler && window._errorHandler(t)
            } finally {
                E()
            }
        }
        function P() {
            E()
        }
        window._appTiming = {},
        r.go("chat"),
        e.CONF = g,
        t.isUnLogin = !window.MMCgi.isLogin,
        t.debug = !0,
        t.isShowReader = /qq\.com/gi.test(location.href),
        window.MMCgi.isLogin && (T(),
        h.browser.chrome && !MMDEV && (window.onbeforeunload = function(e) {
            return e = e || window.event,
            e && (e.returnValue = "关闭浏览器聊天内容将会丢失。"),
            "关闭浏览器聊天内容将会丢失。"
        }
        )),
        t.$on("newLoginPage", function(e, t) {
            console.log("newLoginPage", t),
            f.setSkey(t.SKey),
            f.setSid(t.Sid),
            f.setUin(t.Uin),
            f.setPassticket(t.Passticket),
            T()
        });
        var A, I;
        t.search = function() {
            A && o.cancel(A),
            A = o(function() {
                return t.keyword ? (I && I.close(),
                void (I = c.open({
                    templateUrl: "searchList.html",
                    controller: ["$rootScope", "$scope", "$state", function(e, t, o) {
                        t.$watch(function() {
                            return u.contactChangeFlag
                        }, function() {
                            t.allContacts.length = 0,
                            t.allContacts.push.apply(t.allContacts, S())
                        }),
                        t.clickUserCallback = function(n) {
                            n.UserName && (o.go("chat", {
                                userName: n.UserName
                            }),
                            t.closeThisMmPop(),
                            e.$broadcast("root:searchList:cleanKeyWord"))
                        }
                    }
                    ],
                    scope: {
                        keyword: t.keyword,
                        allContacts: S(),
                        heightCalc: function(e) {
                            return "header" === e.type ? 31 : 60
                        }
                    },
                    className: "recommendation",
                    autoFoucs: !1,
                    container: angular.element(document.querySelector("#search_bar"))
                }))) : void (I && I.close())
            }, 200)
        }
        ,
        t.searchKeydown = function(t) {
            switch (t.keyCode) {
            case g.KEYCODE_ARROW_UP:
                I && I.isOpen() && e.$broadcast("root:searchList:keyArrowUp"),
                t.preventDefault(),
                t.stopPropagation();
                break;
            case g.KEYCODE_ARROW_DOWN:
                I && I.isOpen() && e.$broadcast("root:searchList:keyArrowDown"),
                t.preventDefault(),
                t.stopPropagation();
                break;
            case g.KEYCODE_ENTER:
                I && I.isOpen() && e.$broadcast("root:searchList:keyEnter"),
                t.preventDefault(),
                t.stopPropagation()
            }
        }
        ,
        t.$on("root:searchList:cleanKeyWord", function() {
            t.keyword = ""
        });
        var k;
        t.$on("ngDialog.opened", function(e, t) {
            w.change("dialog:open", !0),
            k = t,
            b()
        }),
        t.$on("ngDialog.closed", function() {
            w.change("dialog:open", !1),
            k = null
        }),
        $(window).on("resize", function() {
            b()
        }),
        t.appClick = function(e) {
            t.$broadcast("app:contextMenu:hide", e)
        }
        ,
        t.showContextMenu = function(e) {
            t.$broadcast("app:contextMenu:show", e)
        }
        ,
        t.toggleSystemMenu = function() {
            c.toggleOpen({
                templateUrl: "systemMenu.html",
                top: 60,
                left: 85,
                container: angular.element(document.querySelector(".panel")),
                controller: "systemMenuController",
                singletonId: "mmpop_system_menu",
                className: "system_menu"
            })
        }
        ,
        t.showProfile = function(e) {
            if (t.account) {
                var o = t.account
                  , n = e.pageY + 25
                  , a = e.pageX + 6;
                c.open({
                    templateUrl: "profile_mini.html",
                    className: "profile_mini_wrap scale-fade",
                    top: n,
                    left: a,
                    blurClose: !0,
                    singletonId: "mmpop_profile",
                    controller: ["$scope", function(e) {
                        e.contact = o,
                        e.addUserContent = "",
                        e.isShowSendBox = !1,
                        e.chat = function(t) {
                            r.go("chat", {
                                userName: t
                            }),
                            e.closeThisMmPop()
                        }
                    }
                    ]
                })
            }
        }
        ,
        t.dblclickChat = function() {
            t.$broadcast("app:chat:dblclick")
        }
        ,
        t.requestPermission = function() {
            p.requestPermission(function() {
                h.log("请求权限了...")
            })
        }
        ,
        C.callback(E);
        var F
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("loginController", ["$scope", "loginFactory", "utilFactory", "reportService", function(
      e   // $scope
      , t // loginFactory
      , o // utilFactory
      , n // reportService
    ) {
        $(".lang .lang-item").click(function(e) {
            $("script").remove(),
            location.href = e.target.href,
            e.preventDefault()
        }),
        window.MMCgi.isLogin || t.getUUID().then(function(r) {
            function a(i) {
                switch (i.code) {
                case 200:
                    t.newLoginPage(i.redirect_uri).then(function(t) {
                        var r = t.match(/<ret>(.*)<\/ret>/)
                          , a = t.match(/<script>(.*)<\/script>/)
                          , i = t.match(/<skey>(.*)<\/skey>/)
                          , c = t.match(/<wxsid>(.*)<\/wxsid>/)
                          , s = t.match(/<wxuin>(.*)<\/wxuin>/)
                          , l = t.match(/<pass_ticket>(.*)<\/pass_ticket>/)
                          , u = t.match(/<redirecturl>(.*)<\/redirecturl>/);
                        return u ? void (window.location.href = u[1]) : (e.$emit("newLoginPage", {
                            Ret: r && r[1],
                            SKey: i && i[1],
                            Sid: c && c[1],
                            Uin: s && s[1],
                            Passticket: l && l[1],
                            Code: a
                        }),
                        void (o.getCookie("webwx_data_ticket") || n.report(n.ReportType.cookieError, {
                            text: "webwx_data_ticket 票据丢失",
                            cookie: document.cookie
                        })))
                    });
                    break;
                case 201:
                    e.isScan = !0,
                    n.report(n.ReportType.timing, {
                        timing: {
                            scan: Date.now()
                        }
                    }),
                    t.checkLogin(r).then(a);
                    break;
                case 408:
                    t.checkLogin(r).then(a);
                    break;
                case 400:
                case 500:
                case 0:
                    document.location.reload()
                }
                e.code = i.code,
                e.userAvatar = i.userAvatar,
                o.log("get code", i.code)
            }
            o.log("login", r),
            e.uuid = r,
            e.qrcodeUrl = "https://login.weixin.qq.com/qrcode/" + r,
            e.code = 0,
            e.isScan = !1,
            e.isIPad = o.isIPad,
            e.isMacOS = o.isMacOS,
            e.isWindows = o.isWindows,
            e.lang = o.queryParser().lang || "zh_CN";
            var i = !1;
            n.report(n.ReportType.timing, {
                timing: {
                    qrcodeStart: Date.now()
                }
            }),
            setTimeout(function() {
                i || n.report(n.ReportType.picError, {
                    text: "qrcode can not load",
                    src: e.qrcodeUrl
                })
            }, 3e3),
            e.qrcodeLoad = function() {
                i = !0,
                n.report(n.ReportType.timing, {
                    timing: {
                        qrcodeEnd: Date.now()
                    }
                })
            }
            ,
            window.MMCgi.isLogin || t.checkLogin(r, 1).then(a)
        })
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("contentChatController", ["$scope", "$timeout", "$state", "$log", "$document", "$compile", "chatFactory", "accountFactory", "contactFactory", "appFactory", "confFactory", "utilFactory", "chatroomFactory", "mmpop", "ngDialog", "preview", "reportService", "mmHttp", "emojiFactory", function(
      e   // $scope of contentChatController
      , t // $timeout
      , o // $state
      , n // $log
      , r // $document
      , a // $compile
      , i // chatFactory
      , c // accountFactory
      , s // contactFactory
      , l // appFactory
      , u // confFactory
      , f // utilFactory
      , d // chatroomFactory
      , g // mmpop
      , m // ngDialog
      , p // preview
      , h // reportService
      , M // mmHttp
      , y // emojiFactory
    ) {
        function C(o) {
            var n = e.currentContact = s.getContact(o);
            if (e.currentUser = o,
            e.chatContent = i.getChatMessage(o, !0),
            e.imagesMessagesList = [],
            e.messagesAnimate = !1,
            t(function() {
                e.messagesAnimate = !0
            }, 200),
            n) {
                var r = "newsapp,fmessage,filehelper,weibo,qqmail,fmessage,tmessage,qmessage,qqsync,floatbottle,lbsapp,shakeapp,medianote,qqfriend,readerapp,blogapp,facebookapp,masssendapp,meishiapp,feedsapp,voip,blogappweixin,weixin,brandsessionholder,weixinreminder,wxid_novlwrv3lqwv11,gh_22b87fa7cb3c,officialaccounts,notification_messages,wxid_novlwrv3lqwv11,gh_22b87fa7cb3c,wxitil,userexperience_alarm,notification_messages";
                n.MMCanCreateChatroom = r.indexOf(n.UserName) < 0
            }
        }
        function v(t) {
            for (var o = e.imagesMessagesList, n = 0; n < o.length; n++)
                if (o[n].msg.MsgId == t.MsgId) {
                    o.splice(n, 1);
                    break
                }
        }
        function w(e, t) {
            var o, n;
            for (n = 0; n <= e.length; n++) {
                if (o = e[n],
                !o) {
                    e.push(t);
                    break
                }
                if (t.msg._index < o.msg._index) {
                    e.splice(n, 1, t, o);
                    break
                }
            }
            return n
        }
        var S = r.find("#chatArea .scrollbar-dynamic")[0];
        e.delState = !1,
        e.chatContent = [],
        e.isShowChatRoomMembers = !1,
        e.$on("message:add:success", function(t, o) {
            o.MMPeerUserName !== i.getCurrentUserName() && (o._h || e.heightCalc(o, function(e) {
                o._h = e
            }))
        }),
        e.$watch(function() {
            return i.getCurrentUserName()
        }, function(e) {
            C(e),
            setTimeout(function() {
                S.scrollTop = 999999
            }, 10)
        }),
        e.$on("root:cleanMsg", function(t, o) {
            i.cleanChatMessage(o),
            i.getChatList(),
            o == i.getCurrentUserName() && (e.imagesMessagesList = [])
        }),
        e.$on("root:profile", function(t, o) {
            e.showProfile(o.event, o.userName, o.isAdd)
        }),
        e.$on("root:msgSend:success", function(t, o) {
            if (o.MsgType == u.MSGTYPE_IMAGE && e.imageInit(o),
            o.ToUserName == e.currentUser)
                for (var n = 0, r = e.chatContent.length; r > n; ++n) {
                    var a = e.chatContent[n];
                    if (a.MsgId == o.MsgId) {
                        switch (o.AppMsgType) {
                        case u.APPMSGTYPE_ATTACH:
                            a.MMAppMsgDownloadUrl = a.MMAppMsgDownloadUrl.replace("#MediaId#", o.MediaId).replace("mediaid=undefined", "mediaid=" + o.MediaId)
                        }
                        return void (e.$$phase || e.$digest())
                    }
                }
        }),
        e.$on("root:mmpop:closed", function(t, o) {
            "mmpop_chatroom_members" == o && (e.isShowChatRoomMembers = !1,
            e.$digest())
        }),
        e.getMsgImg = function(e, t, o) {
            return o && "undefined" != typeof o.MMStatus && o.MMStatus != u.MSG_SEND_STATUS_SUCC ? void 0 : u.API_webwxgetmsgimg + "?&MsgID=" + e + "&skey=" + encodeURIComponent(c.getSkey()) + (t ? "&type=" + t : "")
        }
        ,
        e.getMsgVideo = function(e) {
            return u.API_webwxgetvideo + "?msgid=" + e + "&skey=" + encodeURIComponent(c.getSkey())
        }
        ,
        e.messageHandle = function(e) {
            e.MMRecall && v(e)
        }
        ,
        e.getUserContact = function(e, t) {
            return e || t ? t && e != t ? s.getContact(e, t) : s.getContact(e) : void 0
        }
        ,
        e.appMsgClick = function(e, t) {
            t && (alert(t),
            e.preventDefault())
        }
        ,
        e.showVideo = function(t) {
            m.open({
                className: "default microvideo_preview_dialog",
                template: '<div jplayer-directive                                id="jplayer-dialog-{{MsgId}}"                                class="jp-jplayer microvideo"                                src="{{getMsgVideo(MsgId)}}"                                timeout="10"                                ng-class="{loaded:loaded}"                                poster="{{getMsgImg(MsgId,\'slave\')}}" autoplay loop></div>',
                plain: !0,
                controller: ["$scope", function(o) {
                    o.MsgId = t,
                    o.getMsgVideo = e.getMsgVideo,
                    o.getMsgImg = e.getMsgImg,
                    o.width = 800,
                    o.height = 600
                }
                ]
            })
        }
        ,
        e.showMicroVideo = function(t) {
            m.open({
                className: "default microvideo_preview_dialog",
                template: '<div jplayer-directive                                id="jplayer-dialog-{{MsgId}}"                                class="jp-jplayer microvideo"                                src="{{getMsgVideo(MsgId)}}"                                timeout="10"                                ng-class="{loaded:loaded}"                                poster="{{getMsgImg(MsgId,\'slave\')}}" autoplay loop></div>',
                plain: !0,
                controller: ["$scope", function(o) {
                    o.MsgId = t,
                    o.getMsgVideo = e.getMsgVideo,
                    o.getMsgImg = e.getMsgImg,
                    o.width = 800,
                    o.height = 600
                }
                ]
            })
        }
        ,
        e.previewImg = function(t) {
            for (var o, n, r = 0; r < e.imagesMessagesList.length; r++)
                if (o = e.imagesMessagesList[r],
                o.msg == t) {
                    n = r;
                    break
                }
            var a = t.MMStatus;
            (void 0 === a || a == u.MSG_SEND_STATUS_SUCC) && p.open({
                imageList: e.imagesMessagesList,
                current: n
            })
        }
        ,
        e.resendMsg = function(e) {
            i.sendMessage(e)
        }
        ,
        e.imageInit = function(t, o) {
            for (var n, r, a, i = e.imagesMessagesList, c = !1, r = e.getMsgImg(t.MsgId), s = 0; s < i.length; s++)
                if (n = i[s],
                n.msg === t) {
                    c = !0,
                    n.url = r,
                    a = s;
                    break
                }
            if (!c) {
                var l;
                l = "undefined" == typeof t.MMStatus || t.MMStatus == u.MSG_SEND_STATUS_SUCC ? {
                    url: r,
                    msg: t,
                    preview: o
                } : {
                    msg: t,
                    preview: o
                },
                a = w(i, l)
            }
            return a
        }
        ,
        e.showChatRoomMembers = function(o) {
            g.toggleOpen({
                templateUrl: "chatRoomMember.html",
                scope: e,
                container: angular.element(document.getElementById("chatRoomMembersWrap")),
                className: "members_wrp slide-down",
                singletonId: "mmpop_chatroom_members",
                stopPropagation: !1,
                controller: ["$scope", function(o) {
                    t(function() {
                        o.currentContact = e.currentContact,
                        o.accountUserName = c.getUserName()
                    }, 100),
                    o.addCharRoomMember = function() {
                        var e = {};
                        angular.forEach(o.currentContact.MemberList, function(t) {
                            e[t.UserName] = t
                        }),
                        d.setCurrentContact(o.currentContact),
                        d.setFilterContacts(e),
                        m.open({
                            templateUrl: "createChatroom.html",
                            controller: "createChatroomController",
                            className: "default add_chatroom",
                            data: {
                                isAdd: !0
                            }
                        }),
                        o.closeThisMmPop()
                    }
                    ,
                    o.createChatroom = function() {
                        m.open({
                            templateUrl: "createChatroom.html",
                            controller: "createChatroomController",
                            className: "default create_chatroom_dlg",
                            data: {
                                isCreate: !0,
                                initSelectedContacts: [o.currentContact]
                            }
                        }),
                        o.closeThisMmPop()
                    }
                }
                ]
            }),
            e.isShowChatRoomMembers = !0,
            console.log(e.isShowChatRoomMembers),
            o.preventDefault()
        }
        ,
        e.showProfile = function(t, n, r) {
            var a;
            a = n ? s.getContact(n, e.currentContact.UserName) : e.currentContact;
            var i = angular.element(window)
              , l = 230
              , f = 360
              , d = i.width()
              , p = i.height()
              , h = t.pageY
              , C = t.pageX;
            d - t.pageX < l && (C = t.pageX - l),
            p - t.pageY < f && (h = t.pageY - f),
            g.open({
                templateUrl: "profile_mini.html",
                className: "profile_mini_wrap scale-fade",
                top: h,
                left: C,
                blurClose: !0,
                singletonId: "mmpop_profile",
                controller: ["$scope", function(e) {
                    e.contact = a,
                    e.MMDefaultRemark = MM.context("8d521cc"),
                    e.addUserContent = MM.context("5a97440") + y.formatHTMLToSend(c.getUserInfo().NickName),
                    e.isShowSendBox = r || !1,
                    e.chat = function(t) {
                        o.go("chat", {
                            userName: t
                        }),
                        e.closeThisMmPop()
                    }
                    ,
                    e.verifyUser = function() {
                        s.verifyUser({
                            UserName: a.UserName,
                            Opcode: u.VERIFYUSER_OPCODE_VERIFYOK,
                            Scene: u.ADDSCENE_PF_WEB,
                            Ticket: a.Ticket
                        }).then(function() {
                            e.closeThisMmPop()
                        }, function() {
                            e.closeThisMmPop(),
                            alert("verify user error.")
                        })
                    }
                    ,
                    e.editRemarkName = function() {
                        e.MMDefaultRemark == MM.context("8d521cc") && (e.MMDefaultRemark = "")
                    }
                    ,
                    e.text = y.transformSpanToImg(e.contact.RemarkName || ""),
                    e.save = function(t) {
                        var o = $(".profile_mini_wrap .J_Text")
                          , n = o.text()
                          , r = n.length;
                        return t && -1 === [8, 37, 39, 46, 13].indexOf(t.keyCode) && r > 13 ? void t.preventDefault() : void (t && 13 != t.keyCode || (n.length > 17 && (n = n.substring(0, 18)),
                        e.editing = !1,
                        e.contact.RemarkName = n,
                        M({
                            method: "POST",
                            url: u.API_webwxoplog,
                            data: angular.extend({
                                UserName: e.contact.UserName,
                                CmdId: u.oplogCmdId.MODREMARKNAME,
                                RemarkName: y.formatHTMLToSend(n)
                            }, c.getBaseRequest()),
                            MMRetry: {
                                count: 3,
                                timeout: 1e4,
                                serial: !0
                            }
                        }).success(function() {
                            e.MMDefaultRemark = MM.context("8d521cc")
                        }).error(function() {}),
                        $('<div contenteditable="true"></div>').appendTo("body").focus().remove()))
                    }
                    ,
                    e.addUser = function(t, o) {
                        s.verifyUser({
                            UserName: a.UserName,
                            Opcode: u.VERIFYUSER_OPCODE_SENDREQUEST,
                            Scene: u.ADDSCENE_PF_WEB,
                            Ticket: a.Ticket,
                            VerifyContent: o || ""
                        }).then(function() {
                            e.closeThisMmPop()
                        }, function(t) {
                            e.closeThisMmPop(),
                            m.openConfirm({
                                className: "default ",
                                templateUrl: "comfirmTips.html",
                                controller: ["$scope", function(e) {
                                    e.title = MM.context("02d9819"),
                                    e.content = t.BaseResponse.ErrMsg || MM.context("f45a3d8"),
                                    e.callback = function() {
                                        e.closeThisDialog()
                                    }
                                }
                                ]
                            })
                        })
                    }
                }
                ]
            })
        }
        ,
        e.removeMemberFromChatroom = function(e, t) {
            d.delMember(e, t),
            g.close("mmpop_chatroom_members")
        }
        ;
        var b = jQuery("#voiceMsgPlayer")
          , T = function() {
            window.MMplayingMsg && (window.MMplayingMsg.MMPlaying = !1,
            window.MMplayingMsg = null ,
            e.$$phase || e.$digest())
        }
        ;
        e.playVoice = function(e) {
            require.async(["jplayer"], function() {
                if (window.MMplayingMsg) {
                    if (e.MsgId == window.MMplayingMsg.MsgId && e.MMPlaying)
                        return void b.jPlayer("stop");
                    T()
                }
                var t = u.API_webwxgetvoice + "?msgid=" + e.MsgId + "&skey=" + c.getSkey();
                e.MMVoiceUnRead && (e.MMVoiceUnRead = !1),
                e.MMPlaying = !0,
                b.jPlayer({
                    ready: function() {},
                    timeupdate: function() {},
                    play: function() {},
                    pause: T,
                    ended: T,
                    swfPath: window.MMSource.jplayerSwfPath,
                    solution: "html, flash",
                    supplied: "mp3",
                    wmode: "window"
                }),
                b.jPlayer("stop"),
                window.MMplayingMsg = e,
                b.jPlayer("setMedia", {
                    mp3: t
                }),
                b.jPlayer("play")
            })
        }
        ;
        var E = !1;
        e.$on("mmRepeat:change", function() {
            E && (S.scrollTop = 99999)
        });
        var N, P = !0;
        e.$watchCollection("chatContent", function(e) {
            if (e.length > 0 && e[e.length - 1].FromUserName === c.getUserName())
                E = !0;
            else {
                if (N && clearTimeout(N),
                N = setTimeout(function() {
                    P = !0
                }, 100),
                !P)
                    return;
                E = S.scrollTop + S.clientHeight + 10 >= S.scrollHeight,
                P = !1
            }
        }),
        e.heightCalc = function(t, o) {
            var n = "<div message-directive ></div>"
              , r = e.$new();
            r.imageInit = function() {}
            ,
            r.message = t;
            var i = a(n)(r);
            $("#prerender").append(i),
            function(t, o, n, r) {
                setTimeout(function() {
                    function a() {
                        console.log("height", o.height()),
                        l.height = c.height(),
                        l.width = c.width(),
                        n.MMImgStyle = l,
                        r(o.height()),
                        t.$destroy(),
                        o.remove()
                    }
                    function i(e) {
                        console.error(e),
                        h.report(h.ReportType.imageLoadError, {
                            text: "chat content image preload fail",
                            src: this.src
                        }),
                        l.height = 110,
                        l.width = 110,
                        n.MMImgStyle = l,
                        t.$digest(),
                        r(o.height()),
                        t.$destroy(),
                        o.remove()
                    }
                    if (n.MsgType == u.MSGTYPE_EMOTICON || n.MsgType == u.MSGTYPE_IMAGE || n.MsgType == u.MSGTYPE_VIDEO) {
                        t.$digest();
                        var c = o.find(".content .msg-img")
                          , s = c.height()
                          , l = {};
                        if (console.log("preload!!!!!!!!!!!!!!!!!!!", n, s > 40 || 1 == c[0].complete && !(0 === c[0].naturalWidth) && s > 0, n.ImgHeight),
                        n.ImgHeight)
                            n.MsgType == u.MSGTYPE_EMOTICON ? (l.height = n.ImgHeight * c.width() / n.ImgWidth + "px",
                            l.widht = c.width() + "px") : (l.height = n.ImgHeight,
                            l.width = n.ImgWidth),
                            n.MMImgStyle = l,
                            t.$digest(),
                            r(o.height()),
                            t.$destroy(),
                            o.remove();
                        else if (s > 40 || 1 == c[0].complete && 0 !== c[0].naturalWidth && s > 0)
                            r(o.height()),
                            t.$destroy(),
                            o.remove();
                        else {
                            if (n.MMPreviewSrc)
                                return c[0].onload = a,
                                c[0].onerror = i,
                                void (c[0].src = n.MMPreviewSrc);
                            if ("undefined" != typeof n.MMStatus && n.MMStatus != u.MSG_SEND_STATUS_SUCC)
                                var f = e.$watch(function() {
                                    return n.MMStatus
                                }, function(t) {
                                    t == u.MSG_SEND_STATUS_SUCC && (c[0].onload = a,
                                    c[0].onerror = i,
                                    c[0].src = e.getMsgImg(n.MsgId, "slave"),
                                    console.log("preload!!!!!!!!!!!!!!!!!! ", c[0].src),
                                    f())
                                });
                            else
                                c[0].onload = a,
                                c[0].onerror = i
                        }
                    } else
                        t.$digest(),
                        console.log(o.height()),
                        r(o.height()),
                        t.$destroy(),
                        o.remove()
                }, 0)
            }(r, i, t, o)
        }
        ,
        e.cancelUploadFile = function(e) {
            e.MMCancelUploadFileFunc(e)
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("contentContactController", ["$scope", "contactFactory", function(e, t) {
        e.$watch(function() {
            return t.getCurrentContact()
        }, function(o) {
            o && (e.currentContact = t.getCurrentContact())
        })
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("chatSenderController", ["$rootScope", "$scope", "$http", "$timeout", "ngDialog", "confFactory", "accountFactory", "contactFactory", "chatFactory", "screenShotFactory", "utilFactory", "mmpop", "stateManageService", "emojiFactory", "reportService", function(e, t, o, n, r, a, i, c, s, l, u, f, d, g, m) {
        function p() {
            var e = "undefined" != typeof D.textContent ? D.textContent : D.innerText
              , t = D.getElementsByTagName("img").length > 0;
            e.length > 0 || t ? d.change("sender:hasText", !0) : d.change("sender:hasText", !1)
        }
        function h() {
            window.getSelection ? (P = window.getSelection(),
            A = P.getRangeAt(0)) : A = document.selection.createRange()
        }
        function M() {
            A ? window.getSelection ? (P.removeAllRanges(),
            P.addRange(A)) : A.select() : y()
        }
        function y() {
            var e, t;
            document.createRange ? (e = document.createRange(),
            e.selectNodeContents(D),
            e.collapse(!1),
            t = window.getSelection(),
            t.removeAllRanges(),
            t.addRange(e)) : document.selection && (e = document.body.createTextRange(),
            e.moveToElementText(D),
            e.collapse(!1),
            e.select())
        }
        function C(e) {
            var t, o, n = "";
            if (window.getSelection)
                t = window.getSelection(),
                t.rangeCount > 0 && (o = t.getRangeAt(0).cloneRange(),
                o.collapse(!0),
                o.setStart(D, 0),
                n = o.toString().slice(-e));
            else if ((t = document.selection) && "Control" != t.type) {
                var r;
                o = t.createRange(),
                r = o.duplicate(),
                r.moveToElementText(D),
                r.setEndPoint("EndToStart", o),
                n = r.text.slice(-e)
            }
            return n
        }
        function v(e, t) {
            var o, n;
            if (t || M(),
            window.getSelection) {
                !t && A ? (o = P,
                n = A) : (o = window.getSelection(),
                n = o.getRangeAt(0)),
                n.deleteContents();
                var r;
                if (n.createContextualFragment)
                    r = n.createContextualFragment(e);
                else {
                    var a = document.createElement("div");
                    a.innerHTML = e,
                    r = document.createDocumentFragment();
                    for (var i, c; i = a.firstChild; )
                        c = r.appendChild(i)
                }
                var s = r.lastChild;
                n.insertNode(r),
                n.setStartAfter(s),
                o.removeAllRanges(),
                o.addRange(n);
                var l = s.offsetTop - 42 + s.offsetHeight - D.offsetHeight;
                D.scrollTop < l && (D.scrollTop = l)
            } else
                n = t || !A ? document.selection.createRange() : A,
                e = e.replace(/</gi, "&lt;").replace(/>/gi, "&gt;"),
                n.pasteHTML(e),
                n.select()
        }
        function w() {
            window.getSelection && (window.getSelection().getRangeAt(0).insertNode(I),
            k = I.offsetLeft,
            F = I.offsetTop - D.scrollTop,
            U.appendChild(I))
        }
        function S(t) {
            var o = r.open({
                template: "imageUploadPreview.html",
                controller: ["$scope", function(e) {
                    x = !0;
                    var o = "";
                    e.src = "",
                    e.send = function() {
                        o && (t.MediaId = o,
                        s.appendMessage(t),
                        s.sendMessage(t),
                        r.close())
                    }
                    ,
                    e.cancel = function() {
                        r.close(),
                        t = null
                    }
                    ,
                    e.$on("root:uploadImg:success", function(n, r) {
                        e.src = r.src,
                        t.MMPreviewSrc = r.src,
                        o = r.mediaId,
                        e.$digest()
                    })
                }
                ],
                className: "default image_preview"
            });
            return {
                update: function(t, o) {
                    e.$broadcast("root:uploadImg:success", {
                        src: t,
                        mediaId: o
                    })
                },
                close: o.close
            }
        }
        function b(e) {
            D.innerHTML = t.editAreaCtn = e || "",
            D.focus(),
            p(),
            d.change("sender:active", !0),
            e && (y(),
            h())
        }
        function T(e) {
            return j[e.toLowerCase()]
        }
        function E(e, t) {
            angular.extend(e, {
                onQueued: K,
                onProgress: K,
                onSuccess: K,
                onError: K
            }, t)
        }
        function N() {
            require.async(["webuploader"], function(e) {
                window.WebUploader = e;
                try {
                    Y = e.create({
                        auto: !0,
                        dnd: "#chatArea",
                        paste: u.browser.webkit ? "#chatArea" : void 0,
                        swf: a.RES_PATH + "third_party/webuploader-0.1.5/Uploader.swf",
                        server: a.API_webwxuploadmedia + "?f=json",
                        fileVal: "filename",
                        pick: ".js_fileupload",
                        compress: !1,
                        duplicate: !0
                    }).on("beforeFileQueued", function(e) {
                        if (T(e.ext)) {
                            if (e.size > 1024 * B * 1024)
                                return alert(MM.context("8c88ff6") + B + "M"),
                                !1
                        } else if (e.size > 1024 * H * 1024)
                            return alert(MM.context("0c9c48a") + H + "M"),
                            !1;
                        /untitled\d+.png/i.test(e.name) ? E(e, W) : E(e, V)
                    }).on("filesQueued", function(e) {
                        for (var t = 0, o = e.length; o > t; ++t) {
                            var n = e[t];
                            n.onQueued.call(n)
                        }
                    }).on("uploadBeforeSend", function(e, t) {
                        var o = e.file;
                        t.mediatype = T(o.ext) ? "pic" : "doc",
                        t.uploadmediarequest = JSON.stringify(angular.extend(i.getBaseRequest(), {
                            ClientMediaId: u.now(),
                            TotalLen: o.size,
                            StartPos: 0,
                            DataLen: o.size,
                            MediaType: a.UPLOAD_MEDIA_TYPE_ATTACHMENT
                        })),
                        t.webwx_data_ticket = u.getCookie("webwx_data_ticket"),
                        t.pass_ticket = decodeURIComponent(i.getPassticket())
                    }).on("uploadProgress", function(e, t) {
                        e.onProgress.call(e, t)
                    }).on("uploadFinished", function() {
                        Y.reset()
                    }).on("uploadSuccess", function(e, t) {
                        e.onSuccess.call(e, t)
                    }).on("uploadError", function(e, t) {
                        e.onError.call(e, t)
                    }).on("error", function(e) {
                        m.report(m.ReportType.uploaderError, {
                            text: "WebUploader 出错",
                            type: e
                        })
                    })
                } catch (o) {
                    t.noflash = !0,
                    m.report(m.ReportType.uploaderError, {
                        text: "WebUploader 出错",
                        type: "no_flash"
                    })
                }
            })
        }
        var P, A, I = document.getElementById("caretPosHelper"), k = 0, F = 0, D = document.getElementById("editArea"), U = D.parentNode, R = u.getShareObject("editingContents"), x = !1;
        $(D).on("input", function() {
            h()
        }).on("click", function() {
            h()
        }),
        t.isDisabled = !t.userName,
        t.isMacOS = navigator.userAgent.toUpperCase().indexOf("MAC OS") > -1,
        t.editAreaCtn = "";
        var O;
        t.$on("$destroy", function() {
            O && (R[O] = D.innerHTML)
        }),
        t.$watch(function() {
            return s.getCurrentUserName()
        }, function(e, t) {
            t && e != t && (R[t] = D.innerHTML),
            O = e,
            b(R[e])
        }),
        t.showEmojiPanel = function(e) {
            f.toggleOpen({
                top: -272,
                left: 15,
                templateUrl: "expression.html",
                className: "slide-top",
                controller: "emojiController",
                singletonId: "mmpop_emoji_panel",
                scope: t,
                autoFoucs: !1,
                container: angular.element(document.getElementById("tool_bar"))
            }),
            e.preventDefault()
        }
        ,
        t.screenShot = function() {
            var e;
            l.isSupport() ? l.capture({
                ok: function() {
                    var t = s.createMessage({
                        MsgType: a.MSGTYPE_IMAGE,
                        Type: a.MSGTYPE_IMAGE
                    });
                    e = S(t),
                    l.upload(JSON.stringify(t), function(t) {
                        !t.BaseResponse || t.BaseResponse && 0 != t.BaseResponse.Ret ? (alert(MM.context("76a7e04")),
                        e.close()) : (console.log("capture upload success"),
                        e.update(a.API_webwxpreview + "?fun=preview&mediaid=" + t.MediaId, t.MediaId))
                    })
                }
            }) : "Win64" == navigator.platform && u.browser.msie ? alert(MM.context("82cf63d")) : confirm(MM.context("112a5c0")) && l.install()
        }
        ;
        var L, G;
        t.editAreaKeyup = function(e) {
            if (MMDEV && e.keyCode == a.KEYCODE_NUM2 && "@" == C(1)) {
                var o = s.getCurrentUserName();
                if (!u.isRoomContact(o))
                    return;
                w(),
                G = function() {
                    L = null ,
                    G = null ;
                    var e = c.getChatRoomMembersContact(o, "withoutMe");
                    h(),
                    f.open({
                        templateUrl: "editAreaContactPanel.html",
                        controller: "editAreaContactListController",
                        left: k,
                        top: F,
                        scope: {
                            chatRoomUserName: o,
                            memberList: angular.copy(e),
                            insertContactToEditArea: t.insertToEditArea
                        },
                        autoFoucs: !1,
                        container: angular.element(U)
                    })
                }
                ,
                !L && G && G(),
                clearTimeout(L),
                L = setTimeout(function() {
                    G && G(),
                    L = null
                }, 300)
            }
        }
        ,
        t.editAreaKeydown = function(e) {
            if (p(),
            L)
                return void e.preventDefault();
            var o = e.keyCode;
            if (o == a.KEYCODE_ENTER) {
                if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
                    var n = "<br>";
                    if (!u.browser.msie && window.getSelection) {
                        var r = window.getSelection().focusNode.nextSibling;
                        do
                            if (!r || r.nodeValue || "BR" == r.tagName)
                                break;
                        while (r = r.nextSibling);r || (n += n)
                    }
                    t.insertToEditArea(n, !0),
                    D.scrollTop = D.scrollHeight
                } else
                    t.sendTextMessage();
                e.preventDefault()
            }
            83 == o && e.altKey && (t.sendTextMessage(),
            e.preventDefault()),
            (o >= 65 && 111 >= o || o >= 186 && 222 >= o) && f.close()
        }
        ,
        t.editAreaBlur = function() {
            G = null ,
            d.change("sender:active", !1)
        }
        ,
        t.editAreaClick = function() {
            w()
        }
        ,
        t.sendTextMessage = function() {
            if (f.close(),
            !t.editAreaCtn.replace(/<br\/?>/g, "").match(/^\s*$/)) {
                var e = s.createMessage({
                    MsgType: a.MSGTYPE_TEXT,
                    Content: t.editAreaCtn
                });
                s.appendMessage(e),
                s.sendMessage(e),
                R[s.getCurrentUserName()] = "",
                t.editAreaCtn = ""
            }
        }
        ,
        t.$on("root:quoteMsg", function(e, t) {
            b(t + (D.innerHTML.replace("<br>", "") ? D.innerHTML : "<br>")),
            D.scrollTop = 9999
        }),
        t.insertToEditArea = function(e, o) {
            v(e, o),
            t.editAreaCtn = D.innerHTML
        }
        ,
        t.sendTuzkiEmoji = function(e, t) {
            var o = s.createMessage({
                MsgType: a.MSGTYPE_EMOTICON,
                Content: e,
                EmojiFlag: a.EMOJI_FLAG_GIF,
                EMoticonMd5: e
            });
            o.MMPreviewSrc = a.RES_PATH + "images/icon/Tuzki/" + t,
            s.appendMessage(o),
            s.sendMessage(o)
        }
        ,
        t.sendGif = function() {}
        ;
        var Y, B = 10, H = 20, j = {
            bmp: 1,
            png: 1,
            jpeg: 1,
            jpg: 1,
            gif: 0
        }, q = function(e) {
            Y.cancelFile(e.MMFileId),
            e.MMFileStatus = a.MM_SEND_FILE_STATUS_CANCEL
        }
        , K = function() {}
        , V = {
            onQueued: function() {
                return "gif" == this.ext.toLowerCase() ? (this.MMSendMsg = s.createMessage({
                    MsgType: a.MSGTYPE_EMOTICON,
                    EmojiFlag: a.EMOJI_FLAG_GIF
                }),
                void function(e) {
                    Y.makeThumb(e, function(t, o) {
                        o && (e.MMSendMsg.MMThumbSrc = o),
                        s.appendMessage(e.MMSendMsg),
                        console.log(o)
                    }, 1, 1)
                }(this)) : (this.MMSendMsg = s.createMessage({
                    MsgType: T(this.ext) ? a.MSGTYPE_IMAGE : a.MSGTYPE_APP,
                    FileName: this.name,
                    FileSize: this.size,
                    MMFileId: this.id,
                    MMFileExt: this.ext,
                    MMUploadProgress: 0,
                    MMFileStatus: a.MM_SEND_FILE_STATUS_QUEUED,
                    MMCancelUploadFileFunc: q
                }),
                void (T(this.ext) ? !function(t) {
                    t.MMSendMsg.MMThumbSrc = "",
                    Y.makeThumb(t, function(o, n) {
                        (o || !n) && m.report(m.ReportType.uploaderError, {
                            text: "创建缩略图失败",
                            fileName: t.MMSendMsg.MMFileExt,
                            fileSize: t.MMSendMsg.FileSize
                        }),
                        n && (t.MMSendMsg.MMThumbSrc = n),
                        s.appendMessage(t.MMSendMsg),
                        e.$digest()
                    })
                }(this) : s.appendMessage(this.MMSendMsg)))
            },
            onProgress: function(e) {
                var o = this;
                t.$apply(function() {
                    o.MMSendMsg.MMFileStatus = a.MM_SEND_FILE_STATUS_SENDING,
                    o.MMSendMsg.MMUploadProgress = parseInt(100 * e)
                })
            },
            onSuccess: function(e) {
                if (0 == e.BaseResponse.Ret) {
                    var o = this.MMSendMsg;
                    o.MediaId = e.MediaId,
                    s.sendMessage(o),
                    t.$apply(function() {
                        o.MMFileStatus = a.MM_SEND_FILE_STATUS_SUCCESS
                    })
                } else
                    this.onError("Ret: " + e.BaseResponse.Ret)
            },
            onError: function(e) {
                var o = this;
                m.report(m.ReportType.uploaderError, {
                    text: "chooseFile 上传失败",
                    reason: e,
                    fileName: this.ext,
                    fileSize: this.size
                }),
                t.$apply(function() {
                    o.MMSendMsg.MMFileStatus = a.MM_SEND_FILE_STATUS_FAIL,
                    o.MMSendMsg.MMStatus = a.MSG_SEND_STATUS_FAIL
                })
            }
        }, W = {
            onQueued: function() {
                var e = s.createMessage({
                    MsgType: a.MSGTYPE_IMAGE,
                    Type: a.MSGTYPE_IMAGE
                });
                this._uploadPreviewUpdate = S(e).update
            },
            onSuccess: function(e) {
                0 == e.BaseResponse.Ret ? this._uploadPreviewUpdate(a.API_webwxpreview + "?fun=preview&mediaid=" + e.MediaId, e.MediaId) : this.onError("Ret: " + e.BaseResponse.Ret)
            },
            onError: function(e) {
                m.report(m.ReportType.uploaderError, {
                    text: "pasteImg 上传失败",
                    reason: e,
                    fileName: this.ext,
                    fileSize: this.size
                }),
                alert(MM.context("c5795a7") + e)
            }
        };
        window.WebUploader ? N() : e.$on("root:pageInit:success", function() {
            N()
        })
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("emojiController", ["$rootScope", "$scope", "$timeout", "emojiFactory", "confFactory", "utilFactory", function(e, t, o, n, r, a) {
        o(function() {
            t.QQFaceList = n.QQFaceList,
            t.EmojiList = n.EmojiList,
            t.TuzkiList = n.TuzkiList
        }, 100),
        t.index = 1,
        t.RES_PATH = r.RES_PATH,
        t.selectEmoticon = function(e) {
            var o = e.target;
            if ("A" == o.tagName) {
                var r = o.innerText || o.textContent
                  , i = o.getAttribute("type");
                switch (i) {
                case "qq":
                    r = "[" + r + "]",
                    a.browser.msie && a.browser.version < 9 || (r = n.getEmoticonByText(r)),
                    t.insertToEditArea(r);
                    break;
                case "emoji":
                    r = "<" + r + ">",
                    a.browser.msie && a.browser.version < 9 || (r = n.getEmoticonByText(r)),
                    t.insertToEditArea(r);
                    break;
                case "Tuzki":
                    t.sendTuzkiEmoji(n.getMd5ByTuzki(r), r)
                }
                e.preventDefault()
            }
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("createChatroomController", ["$rootScope", "$scope", "$timeout", "$state", "$log", "$document", "chatFactory", "contactFactory", "appFactory", "chatroomFactory", "confFactory", "mmpop", "ngDialog", "utilFactory", "stateManageService", "accountFactory", function(e, t, o, n, r, a, i, c, s, l, u, f, d, g, m, p) {
        o(function() {
            t.ngDialogData.isCreate && (h = []),
            t.allContacts = c.pickContacts(["star", "friend"], {
                star: {
                    filterContacts: h
                },
                friend: {
                    filterContacts: h,
                    isWithoutStar: !0,
                    isWithoutBrand: !0
                }
            }, !0).result,
            t.chatroomContacts = c.pickContacts(["chatroom"], {
                chatroom: {
                    noHeader: !0
                }
            }, !0).result
        }, 100),
        t.selectedUsers = t.ngDialogData.initSelectedContacts || [];
        var h = t.ngDialogData.isCreate ? {} : l.getFilterContacts();
        t.pickConfig = {
            types: ["star", "friend"],
            opt: {
                star: {},
                friend: {
                    isWithoutStar: !0,
                    isWithoutBrand: !0
                },
                all: {
                    filterContacts: h
                }
            }
        },
        t.add = function() {
            var e = l.getCurrentContact()
              , o = [];
            angular.forEach(t.selectedUsers, function(e) {
                o.push(e.UserName)
            }),
            l.addMember(e.UserName, o.join(","), function(e) {
                e.BaseResponse && 0 != e.BaseResponse.Ret && -2013 != e.BaseResponse.Ret && d.openConfirm({
                    className: "default ",
                    templateUrl: "comfirmTips.html",
                    controller: ["$scope", function(t) {
                        t.title = MM.context("02d9819"),
                        t.content = e.BaseResponse.ErrMsg || MM.context("f45a3d8"),
                        t.callback = function() {
                            t.closeThisDialog()
                        }
                    }
                    ]
                })
            }),
            t.closeThisDialog()
        }
        ,
        t.create = function() {
            var e = [];
            return angular.forEach(t.selectedUsers, function(e, o) {
                return e.UserName == p.getUserName() ? void t.selectedUsers.splice(o, 1) : void 0
            }),
            1 === t.selectedUsers.length ? (n.go("chat", {
                userName: t.selectedUsers[0].UserName
            }),
            void t.closeThisDialog()) : (angular.forEach(t.selectedUsers, function(t) {
                e.push({
                    UserName: t.UserName
                })
            }),
            l.create(e).then(function(e) {
                e.BaseResponse && 0 == e.BaseResponse.Ret || -2013 == e.BaseResponse.Ret ? (n.go("chat", {
                    userName: e.ChatRoomName
                }),
                console.log("careate chat room success. chatroom userName:", e.ChatRoomName)) : d.openConfirm({
                    className: "default ",
                    templateUrl: "comfirmTips.html",
                    controller: ["$scope", function(t) {
                        t.title = MM.context("02d9819"),
                        t.content = e.BaseResponse.ErrMsg || MM.context("0d42740"),
                        t.callback = function() {
                            t.closeThisDialog()
                        }
                    }
                    ]
                })
            }, function(e) {
                d.openConfirm({
                    className: "default ",
                    templateUrl: "comfirmTips.html",
                    controller: ["$scope", function(t) {
                        t.title = MM.context("02d9819"),
                        t.content = e.BaseResponse.ErrMsg || MM.context("0d42740"),
                        t.callback = function() {
                            t.closeThisDialog()
                        }
                    }
                    ]
                })
            }),
            void t.closeThisDialog())
        }
        ,
        t.selectChatroom = function(e) {
            n.go("chat", {
                userName: e.UserName
            }),
            t.closeThisDialog()
        }
        ,
        t.chatRoomHeightCalc = function() {
            return 64
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("contextMenuController", ["$rootScope", "$scope", "$state", "contextMenuFactory", "accountFactory", "confFactory", "contactFactory", "ngDialog", "chatroomFactory", "emojiFactory", "utilFactory", "chatFactory", function(
        e   // $rootScope
        , t // $scope
        , o // $state
        , n // contextMenuFactory
        , r // accountFactory
        , a // confFactory
        , i // contactFactory
        , c // ngDialog
        , s // chatroomFactory
        , l // emojiFactory
        , u // utilFactory
        , f // chatFactory
        ) {
        function d(e) {
            function o(e) {
                return e.parentNode != e.document ? (n.push(e.parentNode),
                o(e.parentNode)) : n
            }
            for (var n = [e.target], r = e.path || e.originalEvent.path || o(e.target), a = 0, i = r.length; i > a; a++) {
                var c = angular.element(r[a]).attr("data-cm");
                if (c) {
                    switch (c = JSON.parse(c),
                    t.isShowContextMenu = !0,
                    t.contextStyle = {
                        top: e.pageY,
                        left: e.pageX
                    },
                    c.type) {
                    case "chat":
                        g(c.username),
                        e.preventDefault();
                        break;
                    case "clean":
                        m(c.username),
                        e.preventDefault();
                        break;
                    case "avatar":
                        p(e, c.username, c.isFriend),
                        e.preventDefault();
                        break;
                    case "message":
                        h(c.actualSender, c.msgType, c.subType, c.msgId, e)
                    }
                    var s = angular.element(document.getElementById("contextMenu"))
                      , l = angular.element(window)
                      , u = s.width()
                      , f = s.height()
                      , d = l.width()
                      , M = l.height();
                    d - e.pageX < u && (t.contextStyle = {
                        top: e.pageY,
                        left: e.pageX - u
                    }),
                    M - e.pageY < f && (t.contextStyle = {
                        top: e.pageY - f,
                        left: e.pageX - u
                    });
                    break
                }
            }
        }
        function g(o) {
            t.contextMenuList = [];
            var n = i.getContact(o);
            (n.isRoomContact() || n.isContact()) && t.contextMenuList.push(n.isTop() ? {
                content: MM.context("84e4fac"),
                callback: function() {
                    i.setTopContact(o, !1)
                }
            } : {
                content: MM.context("3d43ff1"),
                callback: function() {
                    i.setTopContact(o, !0)
                }
            }),
            n.isRoomContact() && t.contextMenuList.push({
                content: MM.context("1f9be6d"),
                callback: function() {
                    c.open({
                        className: "default chatroom_topic",
                        template: "editorDialog.html",
                        controller: ["$scope", function(e) {
                            e.keypress = function(e) {
                                var t = $(".chatroom_topic .chatroom_name").text().length;
                                -1 === [8, 37, 39, 46].indexOf(e.keyCode) && t > 17 && e.preventDefault()
                            }
                            ,
                            e.text = l.transformSpanToImg(n.getDisplayName()),
                            e.send = function() {
                                var e = $(".chatroom_topic .chatroom_name").text();
                                e.length > 17 && (e = e.substring(0, 18)),
                                e.length > 0 && e != n.getDisplayName() && s.modTopic(n.UserName, l.formatHTMLToSend(e)),
                                c.close()
                            }
                            ,
                            e.cancel = function() {
                                c.close()
                            }
                        }
                        ]
                    })
                }
            }),
            t.contextMenuList.push({
                content: MM.context("685739c"),
                callback: function() {
                    e.$broadcast("root:deleteChat", o)
                }
            })
        }
        function m(o) {
            t.contextMenuList = [{
                content: MM.context("91382d9"),
                callback: function() {
                    e.$broadcast("root:cleanMsg", o)
                }
            }]
        }
        function p(n, r, a) {
            var i = [{
                content: MM.context("7068541"),
                callback: function() {
                    e.$broadcast("root:profile", {
                        userName: r,
                        event: n
                    })
                }
            }];
            i.push("true" == a ? {
                content: MM.context("b5f1591"),
                callback: function() {
                    o.go("chat", {
                        userName: r
                    })
                }
            } : {
                content: MM.context("0bd10a8"),
                callback: function() {
                    e.$broadcast("root:profile", {
                        userName: r,
                        isAdd: !0,
                        event: n
                    })
                }
            }),
            t.contextMenuList = i
        }
        function h(o, n, s, l, d) {
            function g(e) {
                var t = e && e.target;
                if (!t)
                    return !1;
                if (t = angular.element(t),
                t.hasClass("js_message_bubble") || (t = t.parents(".js_message_bubble")),
                t = t.find(".js_message_plain"),
                t.length) {
                    var o = t.html().replace(new RegExp("<(?!br|" + a.EMOTICON_REG + ").*?>","g"), "")
                      , n = u.htmlDecode(o);
                    return n
                }
                return ""
            }
            var m = f.getMsg(l);
            if (!m)
                return void (t.isShowContextMenu = !1);
            var p = m.MMDigest
              , h = i.getContact(o)
              , M = i.getContact(m.FromUserName);
            if (!h || !M)
                return void (t.isShowContextMenu = !1);
            switch (+n) {
            case a.MSGTYPE_TEXT:
                t.contextMenuList = [];
                var y;
                if (y = M.isRoomContact() ? h.getMemberDisplayName(m.FromUserName) || h.NickName : h.NickName,
                s && parseInt(s))
                    return void (t.isShowContextMenu = !1);
                p = y ? y + ":" + m.MMActualContent : m.MMActualContent,
                p = p.replace(":", ": "),
                t.contextMenuList.push({
                    content: MM.context("3b61c96"),
                    callback: function() {
                        var t = [MM.context("d9eb6f5"), p, MM.context("83b6d34"), "<br>—————————<br>"].join("");
                        e.$broadcast("root:quoteMsg", t)
                    }
                }),
                t.contextMenuList.push({
                    isCopy: !0,
                    content: MM.context("79d3abe"),
                    callback: function() {
                        console.log("复制成功"),
                        t.isShowContextMenu = !1
                    },
                    copyCallBack: function() {
                        var e = $.Range.current().toString();
                        return e ? e : g(d)
                    }
                }),
                d.preventDefault();
                break;
            case a.MSGTYPE_IMAGE:
                t.contextMenuList = [],
                t.contextMenuList.push({
                    isDownload: !0,
                    downloadUrl: a.API_webwxgetmsgimg + "?MsgID=" + l + "&skey=" + r.getSkey(),
                    content: MM.context("f26ef91"),
                    callback: function() {
                        console.log("下载成功")
                    }
                }),
                d.preventDefault();
                break;
            default:
                t.contextMenuList = []
            }
            (m.MsgType == a.MSGTYPE_TEXT || m.MsgType == a.MSGTYPE_APP && m.AppMsgType == a.APPMSGTYPE_ATTACH) && t.contextMenuList.push({
                content: MM.context("21e106f"),
                callback: function() {
                    c.open({
                        templateUrl: "transpond.dialog.html",
                        controller: "transpondDialogController",
                        className: "default transpond-dialog",
                        data: {
                            msg: m
                        }
                    })
                }
            }),
            t.contextMenuList.length > 0 ? d.preventDefault() : t.isShowContextMenu = !1
        }
        t.$on("app:contextMenu:show", function(e, t) {
            d(t)
        }),
        t.$on("app:contextMenu:hide", function() {
            t.isShowContextMenu = !1
        })
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("editAreaContactListController", ["$scope", "confFactory", "utilFactory", "$timeout", function(e, t, o) {
        function n(t, n) {
            n = o.clearHtmlStr(n) + " ",
            c.innerHTML = n;
            var r = c.offsetWidth;
            c.innerHTML = " ",
            e.insertContactToEditArea("<input type='text' un='" + t + "' value='" + n + "' style='width:" + r + "px' readonly='readonly' />"),
            e.closeThisMmPop()
        }
        function r(e) {
            var t = l + u
              , o = e * t
              , n = i.scrollTop;
            if (n > o)
                return void (i.scrollTop = o);
            var r = o + t + u - i.offsetHeight;
            r > n && (i.scrollTop = r)
        }
        var a = document.getElementById("editArea")
          , i = document.getElementById("editAreaContactPanel")
          , c = document.getElementById("caretPosHelper")
          , s = e.memberList.length - 1
          , l = 42
          , u = 10;
        e.selectIndex = 0,
        setTimeout(function() {
            i.focus()
        }, 5),
        e.click = function(e) {
            n(e.currentTarget.getAttribute("username"), e.currentTarget.getAttribute("displayname"))
        }
        ,
        e.keydown = function(o) {
            switch (o.keyCode) {
            case t.KEYCODE_ARROW_UP:
                e.selectIndex = --e.selectIndex < 0 ? 0 : e.selectIndex,
                r(e.selectIndex),
                o.stopPropagation();
                break;
            case t.KEYCODE_ARROW_DOWN:
                e.selectIndex = ++e.selectIndex > s ? s : e.selectIndex,
                r(e.selectIndex),
                o.stopPropagation();
                break;
            case t.KEYCODE_ENTER:
                var i = e.memberList[e.selectIndex];
                if (!i.getDisplayName)
                    break;
                n(i.UserName, i.getDisplayName(e.chatRoomUserName));
                break;
            default:
                e.closeThisMmPop(),
                setTimeout(function() {
                    a.blur(),
                    a.focus()
                }, 0)
            }
            o.preventDefault()
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("systemMenuController", ["$rootScope", "$scope", "$timeout", "ngDialog", "loginFactory", "confFactory", "accountFactory", "utilFactory", "oplogFactory", function(e, t, o, n, r, a, i, c, s) {
        t.createChatroom = function() {
            n.open({
                templateUrl: "createChatroom.html",
                controller: "createChatroomController",
                className: "default create_chatroom_dlg",
                closeByDocument: !1,
                data: {
                    isCreate: !0,
                    fromSystemMenu: !0
                }
            }),
            t.closeThisMmPop()
        }
        ,
        t.loginout = function() {
            r.loginout(),
            t.closeThisMmPop()
        }
        ,
        t.isNotifyOpen = i.isNotifyOpen(),
        t.closeNotify = function() {
            i.closeNotify(),
            t.closeThisMmPop()
        }
        ,
        t.openNotify = function() {
            i.openNotify(),
            t.closeThisMmPop()
        }
        ,
        t.isSoundOpen = i.isSoundOpen(),
        t.closeSound = function() {
            i.closeSound(),
            t.closeThisMmPop()
        }
        ,
        t.openSound = function() {
            i.openSound(),
            t.closeThisMmPop()
        }
        ,
        t.feedback = function() {
            n.open({
                templateUrl: "feedback.html",
                controller: ["$scope", function(e) {
                    e.content = "",
                    e.send = function() {
                        var t = "【新版web微信】【" + navigator.userAgent.toLowerCase() + "】" + e.content;
                        t = c.htmlEncode(t),
                        s.feedback(t),
                        e.closeThisDialog()
                    }
                }
                ],
                className: "default"
            }),
            t.closeThisMmPop()
        }
        ,
        t.sendFeedback = function() {
            console.log()
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("readMenuController", ["$rootScope", "$scope", "subscribeMsgService", function(e, t, o) {
        t.copyCallback = function() {
            console.log("复制成功")
        }
        ,
        t.copyLink = function() {
            return console.log(o.current),
            console.log("fuck you copy link"),
            t.closeThisMmPop(),
            o.current && o.current.Url
        }
        ,
        t.forwarding = function() {
            console.log("fuck you forwarding"),
            t.closeThisMmPop()
        }
        ,
        t.openTab = function() {
            var e = o.current.Url
              , n = window.open(e, "_blank");
            n.focus(),
            t.closeThisMmPop()
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Controllers").controller("transpondDialogController", ["$rootScope", "$scope", "$timeout", "$state", "$log", "$document", "chatFactory", "contactFactory", "appFactory", "chatroomFactory", "confFactory", "mmpop", "ngDialog", "utilFactory", "stateManageService", "accountFactory", function(e, t, o, n, r, a, i, c, s, l, u, f, d, g, m, p) {
        function h(e, t) {
            var o = angular.copy(e);
            o.ToUserName = t,
            o.FromUserName = p.getUserName(),
            o._h = void 0,
            o._offsetTop = void 0,
            o.MMSourceMsgId = e.MsgId,
            o.Content = o.MMActualContent,
            o = i.createMessage(o),
            i.appendMessage(o),
            i.sendMessage(o)
        }
        var M = t.ngDialogData.msg;
        t.pickConfig = {
            types: ["chatroom", "star", "friend"],
            opt: {
                star: {},
                chatroom: {
                    isSaved: !0
                },
                friend: {
                    isWithoutStar: !0,
                    isWithoutBrand: !0
                }
            }
        };
        var y = angular.copy(i.getChatList());
        y.unshift({
            text: MM.context("b3b6735"),
            type: "header"
        }),
        t.initList = y,
        t.ensure = function() {
            var e = t.selectedUsers;
            t.comfirming = !1;
            for (var o = 0; o < e.length; o++)
                h(M, e[o].UserName);
            t.closeThisDialog()
        }
        ,
        t.cancel = function() {
            t.comfirming = !1
        }
        ,
        t.send = function() {
            var e = t.selectedUsers.length;
            if (e > 0) {
                if (1 == e)
                    return void t.ensure();
                if (e > 200)
                    return void alert("选择的人数必须少于200");
                t.comfirming = !0
            }
        }
    }
    ])
}(),
angular.module("Services", []),
!function() {
    "use strict";
    angular.module("Services").factory("appFactory", ["$http", "$q", "confFactory", "accountFactory", "loginFactory", "utilFactory", "reportService", "mmHttp", function(e, t, o, n, r, a, i, c) {
        var s = {
            globalData: {
                chatList: []
            },
            init: function() {
                var e = t.defer();
                return c({
                    method: "POST",
                    url: o.API_webwxinit,
                    MMRetry: {
                        count: 1,
                        timeout: 1
                    },
                    data: {
                        BaseRequest: {
                            Uin: n.getUin(),
                            Sid: n.getSid(),
                            Skey: n.getSkey(),
                            DeviceID: n.getDeviceID()
                        }
                    }
                }).success(function(t) {
                    e.resolve(t)
                }).error(function(t) {
                    e.reject("error:" + t)
                }),
                e.promise
            },
            sync: function() {
                var e = t.defer();
                return c({
                    method: "POST",
                    MMRetry: {
                        serial: !0
                    },
                    url: o.API_webwxsync + "?" + ["sid=" + n.getSid(), "skey=" + n.getSkey()].join("&"),
                    data: angular.extend(n.getBaseRequest(), {
                        SyncKey: n.getSyncKey(),
                        rr: ~new Date
                    })
                }).success(function(t) {
                    e.resolve(t),
                    a.getCookie("webwx_data_ticket") || i.report(i.ReportType.cookieError, {
                        text: "webwx_data_ticket 票据丢失",
                        cookie: document.cookie
                    })
                }).error(function(t) {
                    e.reject("error:" + t),
                    a.log("sync error")
                }),
                e.promise
            },
            syncCheck: function() {
                var e = t.defer()
                  , c = this
                  , s = o.API_synccheck + "?" + ["r=" + a.now(), "skey=" + encodeURIComponent(n.getSkey()), "sid=" + encodeURIComponent(n.getSid()), "uin=" + n.getUin(), "deviceid=" + n.getDeviceID(), "synckey=" + encodeURIComponent(n.getFormateSyncKey())].join("&");
                return window.synccheck && (window.synccheck.selector = 0),
                $.ajax({
                    url: s,
                    dataType: "script",
                    timeout: 35e3
                }).done(function() {
                    window.synccheck && "0" == window.synccheck.retcode ? "0" != window.synccheck.selector ? c.sync().then(function(t) {
                        e.resolve(t)
                    }, function(t) {
                        console.log("syncCheck sync nothing", t),
                        e.reject("sycn net error")
                    }) : e.reject(window.synccheck && window.synccheck.selector) : !window.synccheck || "1101" != window.synccheck.retcode && "1102" != window.synccheck.retcode ? window.synccheck && "1100" == window.synccheck.retcode ? r.loginout(0) : (e.reject("syncCheck net error"),
                    i.report(i.ReportType.netError, {
                        text: "syncCheck net error",
                        url: s
                    })) : r.loginout(1)
                }),
                e.promise
            },
            report: function() {}
        };
        return s
    }
    ])
}(),
!function(_aoUndefined) {
    "use strict";
    angular.module("Services").factory("chatFactory", ["$rootScope", "$timeout", "$http", "$q", "contactFactory", "accountFactory", "emojiFactory", "confFactory", "notificationFactory", "utilFactory", "reportService", "mmHttp", "titleRemind", function($rootScope, $timeout, $http, $q, contactFactory, accountFactory, emojiFactory, confFactory, notificationFactory, utilFactory, reportService, mmHttp, titleRemind) {
        function handleChatList(e) {
            for (var t, o = [], n = [], r = 0; r < e.length; r++)
                t = e[r],
                t.isTop() ? o.push(t) : n.push(t);
            return [].unshift.apply(n, o),
            n
        }
        var _chatList = []
          , _chatListInfos = []
          , _chatMessages = window._chatContent = {}
          , _currentUserName = ""
          , _addedMsgIdsMap = {}
          , _msgMap = {}
          , service = {
            setCurrentUserName: function(e) {
                _currentUserName = e
            },
            getCurrentUserName: function() {
                return _currentUserName
            },
            createMessage: function(e) {
                switch (e.FromUserName || (e.FromUserName = accountFactory.getUserName()),
                e.ToUserName || (e.ToUserName = this.getCurrentUserName()),
                e.ClientMsgId = e.LocalID = e.MsgId = (utilFactory.now() + Math.random().toFixed(3)).replace(".", ""),
                e.CreateTime = Math.round(utilFactory.now() / 1e3),
                e.MMStatus = confFactory.MSG_SEND_STATUS_READY,
                e.MsgType) {
                case confFactory.MSGTYPE_TEXT:
                    var t = [];
                    e.Content = e.Content.replace(/<input.*?un="(.*?)".*?value="(.*?)".*?>/g, function(e, o, n) {
                        return t.push(o),
                        n
                    }),
                    e.MMAtContacts = t.join(","),
                    e.MMSendContent = utilFactory.htmlDecode(utilFactory.clearHtmlStr(e.Content.replace(/<(?:img|IMG).*?text="(.*?)".*?>/g, function(e, t) {
                        return t.replace(confFactory.MM_EMOTICON_WEB, "")
                    }).replace(/<(?:br|BR)\/?>/g, "\n"))).replace(/<(.*?)>/g, function(e) {
                        return emojiFactory.EmojiCodeMap[emojiFactory.QQFaceMap[e]] || e
                    }),
                    e.Content = e.Content.replace(/<(?!(img|IMG|br|BR))[^>]*>/g, "").replace(/\n/g, "<br>");
                    break;
                case confFactory.MSGTYPE_APP:
                    e.AppMsgType = confFactory.APPMSGTYPE_ATTACH,
                    e.Content = "<msg><appmsg appid='wxeb7ec651dd0aefa9' sdkver=''><title>" + e.FileName + "</title><des></des><action></action><type>" + confFactory.APPMSGTYPE_ATTACH + "</type><content></content><url></url><lowurl></lowurl><appattach><totallen>" + e.FileSize + "</totallen><attachid>#MediaId#</attachid><fileext>" + e.MMFileExt + "</fileext></appattach><extinfo></extinfo></appmsg></msg>"
                }
                return e
            },
            appendMessage: function(e) {
                e.MMStatus = confFactory.MSG_SEND_STATUS_SENDING,
                this.messageProcess(e)
            },
            sendMessage: function(e) {
                switch (e.MMStatus = confFactory.MSG_SEND_STATUS_SENDING,
                e.MsgType) {
                case confFactory.MSGTYPE_TEXT:
                    this.postTextMessage(e);
                    break;
                case confFactory.MSGTYPE_IMAGE:
                    this.postImgMessage(e);
                    break;
                case confFactory.MSGTYPE_APP:
                    this.postAppMessage(e);
                    break;
                case confFactory.MSGTYPE_EMOTICON:
                    this.postEmoticonMessage(e)
                }
            },
            _postMessage: function(url, data, msg) {
                data.FromUserName = msg.FromUserName,
                data.ToUserName = msg.ToUserName,
                data.LocalID = msg.LocalID,
                data.ClientMsgId = msg.ClientMsgId,
                data = angular.extend(accountFactory.getBaseRequest(), {
                    Msg: data
                }),
                utilFactory.browser.msie && parseInt(utilFactory.browser.version) < 9 && url == confFactory.API_webwxsendmsg && (data = eval("'" + JSON.stringify(data) + "'")),
                mmHttp({
                    method: "POST",
                    url: url,
                    data: data,
                    MMRetry: {
                        serial: !0
                    }
                }).success(function(e) {
                    0 == e.BaseResponse.Ret ? (msg.MsgId = e.MsgID,
                    _msgMap[msg.MsgId] = msg,
                    _addedMsgIdsMap[msg.MsgId] = !0,
                    msg.MMStatus = confFactory.MSG_SEND_STATUS_SUCC,
                    $rootScope.$broadcast("root:msgSend:success", msg)) : (reportService.report(reportService.ReportType.netError, {
                        text: "postMessage error",
                        url: url,
                        res: e
                    }),
                    msg.MMStatus = confFactory.MSG_SEND_STATUS_FAIL)
                }).error(function(e) {
                    reportService.report(reportService.ReportType.netError, {
                        text: "postMessage error",
                        url: url,
                        res: e
                    }),
                    msg.MMStatus = confFactory.MSG_SEND_STATUS_FAIL
                })
            },
            postTextMessage: function(e) {
                var t = {
                    Type: confFactory.MSGTYPE_TEXT,
                    Content: e.MMSendContent
                };
                e.MMAtContacts && e.MMAtContacts.length && (t.MsgSource = "<msgsource><atusername>" + e.MMAtContacts + "</atusername><atchatroomname>" + e.ToUserName + "</atchatroomname></msgsource>"),
                this._postMessage(confFactory.API_webwxsendmsg, t, e)
            },
            postImgMessage: function(e) {
                var t = {
                    Type: confFactory.MSGTYPE_IMAGE,
                    MediaId: e.MediaId
                };
                this._postMessage(confFactory.API_webwxsendmsgimg + "?fun=async&f=json", t, e)
            },
            postAppMessage: function(e) {
                var t = {
                    Type: confFactory.APPMSGTYPE_ATTACH,
                    Content: "<appmsg appid='wxeb7ec651dd0aefa9' sdkver=''><title>" + e.FileName + "</title><des></des><action></action><type>" + confFactory.APPMSGTYPE_ATTACH + "</type><content></content><url></url><lowurl></lowurl><appattach><totallen>" + e.FileSize + "</totallen><attachid>" + e.MediaId + "</attachid><fileext>" + e.MMFileExt + "</fileext></appattach><extinfo></extinfo></appmsg>"
                };
                this._postMessage(confFactory.API_webwxsendappmsg + "?fun=async&f=json", t, e)
            },
            postEmoticonMessage: function(e) {
                var t = {
                    Type: confFactory.MSGTYPE_EMOTICON,
                    EmojiFlag: e.EmojiFlag,
                    EMoticonMd5: e.EMoticonMd5 || e.md5
                };
                e.MediaId && (t.MediaId = e.MediaId),
                e.MMSourceMsgId && "undefined" != typeof e.MMStatus && e.MMStatus != confFactory.MSG_SEND_STATUS_SUCC && (e.MMPreviewSrc = confFactory.API_webwxgetmsgimg + "?&MsgID=" + e.MMSourceMsgId + "&skey=" + encodeURIComponent(accountFactory.getSkey()) + "&type=big"),
                this._postMessage(confFactory.API_webwxsendemoticon + "?fun=sys", t, e)
            },
            initChatList: function(e) {
                var t = this
                  , o = e.split(",");
                angular.forEach(o, function(e) {
                    if (e && !utilFactory.isShieldUser(e) && !utilFactory.isSpUser(e)) {
                        var t = _chatList.indexOf(e);
                        -1 == t && (_chatList.push(e),
                        utilFactory.isRoomContact(e) && contactFactory.addBatchgetChatroomContact(e))
                    }
                }),
                t.getChatList()
            },
            addChatList: function(e) {
                var t = this;
                e && (angular.isArray(e) || (e = [e]),
                angular.forEach(e, function(e) {
                    var t = ""
                      , o = 0;
                    if (t = e.UserName ? e.UserName : e.FromUserName == accountFactory.getUserInfo().UserName ? e.ToUserName : e.FromUserName,
                    o = _chatList.indexOf(t),
                    -1 == o)
                        _chatList.unshift(t),
                        utilFactory.isRoomContact(t) && contactFactory.addBatchgetChatroomContact(t);
                    else {
                        var n = _chatList.splice(o, 1);
                        _chatList.unshift(n[0])
                    }
                }),
                t.getChatList(),
                $rootScope.$broadcast("chat:add:success"))
            },
            deleteChatList: function(e) {
                var t = this;
                e && (angular.isArray(e) || (e = [e]),
                angular.forEach(e, function(e) {
                    var t = _chatList.indexOf(e);
                    t > -1 && _chatList.splice(t, 1)
                }),
                t.getChatList())
            },
            getChatList: function() {
                var e = this
                  , t = [];
                return _chatListInfos.length = 0,
                angular.forEach(_chatList, function(o) {
                    var n, r = contactFactory.getContact(o), a = {};
                    !r || r.isBrandContact() || r.isShieldUser() || (o == _currentUserName && e.markMsgsRead(o) && e.notifyMobile(o, confFactory.StatusNotifyCode_READED),
                    n = e._getLastMessage(r.UserName),
                    angular.extend(a, r, {
                        MMDigest: n.MMDigest || "",
                        NoticeCount: e.getUnreadMsgsCount(o),
                        MMStatus: n.MMStatus,
                        MMTime: n.MMTime || "",
                        MMDigestTime: n.MMDigestTime || ""
                    }),
                    t.push(a))
                }),
                [].push.apply(_chatListInfos, handleChatList(t)),
                _chatListInfos
            },
            _getLastMessage: function(e) {
                var t = this
                  , o = t.getChatMessage(e);
                return o.length ? o[o.length - 1] : {}
            },
            addChatMessage: function(e) {
                if (e) {
                    var t = this
                      , o = (e.FromUserName,
                    e.ToUserName,
                    _chatMessages[e.MMPeerUserName] || (_chatMessages[e.MMPeerUserName] = []));
                    _addedMsgIdsMap[e.MsgId] || (_addedMsgIdsMap[e.MsgId] = !0,
                    _msgMap[e.MsgId] = e,
                    o.push(e),
                    $rootScope.$broadcast("message:add:success", e),
                    t.getChatList())
                }
            },
            getMsg: function(e) {
                return _msgMap[e]
            },
            deleteChatMessage: function(e) {
                _chatMessages[e] = []
            },
            updateChatMessage: function() {},
            showMessage: function(e, t) {
                if (e)
                    t.DisplayName = e;
                else {
                    var o = contactFactory.getContact(t.MMActualSender);
                    t.DisplayName = o && o.DisplayName ? o.DisplayName : t.MMActualSender
                }
            },
            updateMessage: function(e, t, o) {
                angular.extend(e[t], o)
            },
            getChatMessage: function(e, t) {
                var o = this;
                return t && (_currentUserName = e,
                o.markMsgsRead(e)),
                _chatMessages[e] || (_chatMessages[e] = []),
                _chatMessages[e]
            },
            cleanChatMessage: function(e) {
                _chatMessages[e] && _chatMessages[e].splice(0, _chatMessages[e].length)
            },
            getChatMessageBySlice: function(e, t, o) {
                var n = this;
                return _currentUserName = e,
                n.clearChatNoticeCount(),
                _chatMessages[e] ? _chatMessages[e].slice(t, o) : []
            },
            getUnreadMsgsCount: function(e) {
                var t, o = 0;
                if (t = _chatMessages[e])
                    for (var n = t.length - 1; n >= 0; n--)
                        t[n].MMUnread && ++o;
                return o
            },
            markMsgsRead: function(e) {
                for (var t = this.getChatMessage(e), o = !1, n = 0, r = t.length; r > n; n++)
                    t[n].MMUnread && (o = !0),
                    t[n].MMUnread = !1;
                return o
            },
            messageProcess: function(e) {
                var t = this
                  , o = contactFactory.getContact(e.FromUserName, "", !0);
                if (!o || o.isMuted() || o.isSelf() || o.isShieldUser() || o.isBrandContact() || titleRemind.increaseUnreadMsgNum(),
                e.MMPeerUserName = t._getMessagePeerUserName(e),
                e.MsgType == confFactory.MSGTYPE_STATUSNOTIFY)
                    return void t._statusNotifyProcessor(e);
                if (e.MsgType == confFactory.MSGTYPE_SYSNOTICE)
                    return void console.log("MSGTYPE_SYSNOTICE", e.Content);
                if (!(utilFactory.isShieldUser(e.FromUserName) || utilFactory.isShieldUser(e.ToUserName) || e.MsgType == confFactory.MSGTYPE_VERIFYMSG && e.RecommendInfo && e.RecommendInfo.UserName == accountFactory.getUserInfo().UserName)) {
                    switch (t._commonMsgProcess(e),
                    e.MsgType) {
                    case confFactory.MSGTYPE_APP:
                        try {
                            t._appMsgProcess(e)
                        } catch (n) {
                            console.log("catch _appMsgProcess error", n, e)
                        }
                        break;
                    case confFactory.MSGTYPE_EMOTICON:
                        t._emojiMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_IMAGE:
                        t._imageMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_VOICE:
                        t._voiceMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_VIDEO:
                        t._videoMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_MICROVIDEO:
                        t._mircovideoMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_TEXT:
                        "newsapp" == e.FromUserName ? t._newsMsgProcess(e) : e.AppMsgType == confFactory.APPMSGTYPE_RED_ENVELOPES ? (e.MsgType = confFactory.MSGTYPE_APP,
                        t._appMsgProcess(e)) : e.SubMsgType == confFactory.MSGTYPE_LOCATION ? t._locationMsgProcess(e) : t._textMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_RECALLED:
                        return void t._recalledMsgProcess(e);
                    case confFactory.MSGTYPE_LOCATION:
                        t._locationMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_VOIPMSG:
                    case confFactory.MSGTYPE_VOIPNOTIFY:
                    case confFactory.MSGTYPE_VOIPINVITE:
                        t._voipMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_POSSIBLEFRIEND_MSG:
                        t._recommendMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_VERIFYMSG:
                        t._verifyMsgProcess(e);
                        break;
                    case confFactory.MSGTYPE_SHARECARD:
                        t._shareCardProcess(e);
                        break;
                    case confFactory.MSGTYPE_SYS:
                        t._systemMsgProcess(e);
                        break;
                    default:
                        e.MMDigest = MM.context("938b111")
                    }
                    e.MMActualContent = utilFactory.hrefEncode(e.MMActualContent);
                    var r = contactFactory.getContact(e.MMPeerUserName);
                    e.MMIsSend || r && (r.isMuted() || r.isBrandContact()) || e.MsgType == confFactory.MSGTYPE_SYS || (accountFactory.isNotifyOpen() && t._notify(e),
                    accountFactory.isSoundOpen() && utilFactory.initMsgNoticePlayer(confFactory.RES_SOUND_RECEIVE_MSG)),
                    t.addChatMessage(e),
                    t.addChatList([e])
                }
            },
            _statusNotifyProcessor: function(e) {
                var t = this;
                switch (e.StatusNotifyCode) {
                case confFactory.StatusNotifyCode_SYNC_CONV:
                    t.initChatList(e.StatusNotifyUserName);
                    break;
                case confFactory.StatusNotifyCode_ENTER_SESSION:
                    t.markMsgsRead(e.MMPeerUserName),
                    t.addChatList([e]);
                    break;
                case confFactory.StatusNotifyCode_QUIT_SESSION:
                }
            },
            _commonMsgProcess: function(e) {
                var t, o, n = this, r = "", a = "", i = "";
                e.Content = e.Content || "",
                e.MMDigest = "",
                e.MMIsSend = e.FromUserName == accountFactory.getUserName() || "" == e.FromUserName,
                o = n.getChatMessage(e.MMPeerUserName),
                utilFactory.isRoomContact(e.MMPeerUserName) ? (e.MMIsChatRoom = !0,
                r = e.Content.replace(/^(@[a-zA-Z0-9]+|[a-zA-Z0-9_-]+):<br\/>/, function(e, t) {
                    return a = t,
                    ""
                }),
                a && a != accountFactory.getUserName() && (t = contactFactory.getContact(a, e.MMPeerUserName),
                t && (i = t.getDisplayName(e.MMPeerUserName),
                i && (e.MMDigest = i + ":")))) : (e.MMIsChatRoom = !1,
                r = e.Content),
                e.MMIsSend || e.MMUnread != _aoUndefined || e.MsgType == confFactory.MSGTYPE_SYS || (e.MMUnread = !0),
                e.LocalID || (e.ClientMsgId = e.LocalID = e.MsgId),
                r = emojiFactory.emoticonFormat(r),
                e.MMActualContent = r,
                e.MMActualSender = a || e.FromUserName,
                n._calcMsgDisplayTime(o[o.length - 1], e)
            },
            _textMsgProcess: function(e) {
                e.MsgType = confFactory.MSGTYPE_TEXT,
                e.MMDigest += e.MMActualContent.replace(/<br ?[^><]*\/?>/g, "")
            },
            _imageMsgProcess: function(e) {
                e.MsgType = confFactory.MSGTYPE_IMAGE,
                e.MMDigest += MM.context("a5627e8")
            },
            _voiceMsgProcess: function(e) {
                e.MsgType = confFactory.MSGTYPE_VOICE,
                e.MMDigest += MM.context("b28dac0"),
                e.MMVoiceUnRead = !e.MMIsSend && e.MMUnread
            },
            _videoMsgProcess: function(e) {
                e.MsgType = confFactory.MSGTYPE_VIDEO,
                e.MMDigest += MM.context("4078104")
            },
            _mircovideoMsgProcess: function(e) {
                e.MsgType = confFactory.MSGTYPE_MICROVIDEO,
                e.MMDigest += MM.context("1f94b1b")
            },
            _newsMsgProcess: function(e) {
                var t = utilFactory.htmlDecode(e.MMActualContent).replace(/<br\/>/g, "");
                t = utilFactory.encodeEmoji(t),
                t = utilFactory.xml2json(t),
                e.MMCategory = t && t.category
            },
            _emojiMsgProcess: function(e) {
                var t = this;
                if (e.HasProductId)
                    e.MMActualContent = e.MMIsSend ? "" + MM.context("80f56fb") : MM.context("2242ac7") + "",
                    t._textMsgProcess(e);
                else {
                    e.MsgType = confFactory.MSGTYPE_EMOTICON;
                    var o = utilFactory.xml2json(utilFactory.htmlDecode(e.MMActualContent));
                    o && o.emoji && o.emoji.md5 && (e.md5 = o.emoji.md5),
                    e.MMDigest += MM.context("e230fc1")
                }
            },
            _voipMsgProcess: function(e) {
                this._appAsTextMsgProcess(e, MM.context("fdaa3a3"))
            },
            _locationMsgProcess: function(e) {
                var t = e.Content.split(":<br/>");
                t[2] ? (e.MMLocationDesc = t[1],
                e.MMLocationUrl = t[2]) : (e.MMLocationDesc = t[0],
                e.MMLocationUrl = t[1]),
                e.MMLocationUrl = e.Url || e.MMLocationUrl,
                e.MMDigest += e.MMLocationDesc
            },
            _appMsgProcess: function(e) {
                var t = this;
                switch (e.AppMsgType) {
                case confFactory.APPMSGTYPE_TEXT:
                    t._appTextMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_IMG:
                    t._imageMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_AUDIO:
                    t._appAudioMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_VIDEO:
                    t._appVideoMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_EMOJI:
                    t._emojiMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_URL:
                    t._appUrlMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_ATTACH:
                    t._appAttachMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_TRANSFERS:
                    t._appTransfersMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_RED_ENVELOPES:
                    t._appRedEnvelopesMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_CARD_TICKET:
                    t._appCardTicketMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_OPEN:
                    t._appOpenMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_REALTIME_SHARE_LOCATION:
                    t._appRealtimeShareLocationMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_SCAN_GOOD:
                    t._appScanGoodMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_GOOD:
                    t._appGoodMsgProcess(e);
                    break;
                case confFactory.APPMSGTYPE_EMOTION:
                    t._appEmotionMsgProcess(e);
                    break;
                default:
                    t._appUnknowMsgProcess(e)
                }
            },
            _appTextMsgProcess: function(e) {
                var t = utilFactory.htmlDecode(e.MMActualContent).replace(/<br\/>/g, "");
                t = utilFactory.encodeEmoji(t),
                t = utilFactory.xml2json(t),
                this._appAsTextMsgProcess(e, utilFactory.decodeEmoji(t.appmsg.title))
            },
            _appAudioMsgProcess: function(e) {
                var t = this
                  , o = MM.context("0e23719") + e.FileName;
                t._appUrlMsgProcess(e, o)
            },
            _appVideoMsgProcess: function(e) {
                var t = this
                  , o = MM.context("4078104") + e.FileName;
                t._appUrlMsgProcess(e, o)
            },
            _appOpenMsgProcess: function(e) {
                var t = this
                  , o = MM.context("4f20785");
                t._appUrlMsgProcess(e, o),
                e.MMAlert = MM.context("c4e04ee")
            },
            _appUrlMsgProcess: function(e, t) {
                e.MsgType = confFactory.MSGTYPE_APP,
                e.AppMsgType = confFactory.APPMSGTYPE_URL,
                t = t || MM.context("e5b228c") + e.FileName;
                var o = utilFactory.htmlDecode(e.MMActualContent).replace(/<br\/>/g, "");
                o = utilFactory.encodeEmoji(o),
                o = utilFactory.xml2json(o),
                e.MMAppMsgDesc = utilFactory.decodeEmoji(o.appmsg.des),
                e.MMDigest += t,
                o.appmsg.mmreader && this._appReaderMsgProcess(e, o.appmsg.mmreader)
            },
            _appReaderMsgProcess: function(e, t) {
                e.MsgType = confFactory.MSGTYPE_APP,
                e.AppMsgType = confFactory.APPMSGTYPE_READER_TYPE,
                e.MMCategory = 1 == t.category.count ? [t.category.item] : t.category.item,
                angular.forEach(e.MMCategory, function(e) {
                    var t = new Date(1e3 * e.pub_time);
                    e.pub_time = utilFactory.formatNum(t.getMonth() + 1, 2) + "-" + utilFactory.formatNum(t.getDate(), 2);
                    var o = e.cover.split("|");
                    3 == o.length && (e.cover = o[0],
                    e.width = o[1],
                    e.height = o[2])
                }),
                e.MMDigest += e.MMCategory.length && e.MMCategory[0].title
            },
            _appAttachMsgProcess: function(e) {
                var t = utilFactory.htmlDecode(e.MMActualContent).replace(/<br\/>/g, "");
                t = utilFactory.encodeEmoji(t),
                t = utilFactory.xml2json(t),
                e.MMDigest += MM.context("6daeae3"),
                e.MMFileStatus = confFactory.MM_SEND_FILE_STATUS_SUCCESS,
                e.MMAppMsgFileExt = t.appmsg.appattach.fileext.toLowerCase(),
                e.MMAppMsgFileSize = utilFactory.getSize(+t.appmsg.appattach.totallen),
                e.MMAppMsgDownloadUrl = confFactory.API_webwxdownloadmedia + "?sender=" + e.FromUserName + "&mediaid=" + e.MediaId + "&filename=" + encodeURIComponent(e.FileName) + "&fromuser=" + accountFactory.getUin() + "&pass_ticket=" + encodeURIComponent(accountFactory.getPassticket()) + "&webwx_data_ticket=" + encodeURIComponent(utilFactory.getCookie("webwx_data_ticket"))
            },
            _appTransfersMsgProcess: function(e) {
                this._appAsTextMsgProcess(e, MM.context("0cdad09"))
            },
            _appCardTicketMsgProcess: function(e) {
                this._appAsTextMsgProcess(e, MM.context("c534fc3"))
            },
            _appRealtimeShareLocationMsgProcess: function(e) {
                var t = "";
                if (e.FromUserName == accountFactory.getUserName())
                    t = "[" + MM.context("8e94ca5") + "]";
                else {
                    var o, n = contactFactory.getContact(e.MMActualSender);
                    n && (o = n.getDisplayName(utilFactory.isRoomContact(e.FromUserName) ? e.FromUserName : null )),
                    t = "[" + (o ? o : MM.context("a41d576")) + MM.context("a1f1299") + "]"
                }
                this._appAsTextMsgProcess(e, t)
            },
            _appScanGoodMsgProcess: function(e) {
                this._appAsTextMsgProcess(e, MM.context("95afe20"))
            },
            _appGoodMsgProcess: function(e) {
                this._appAsTextMsgProcess(e, MM.context("355765a"))
            },
            _appEmotionMsgProcess: function(e) {
                this._appAsTextMsgProcess(e, MM.context("9d7f4bb"))
            },
            _appRedEnvelopesMsgProcess: function(e) {
                e.MMDigest += MM.context("e24e75c")
            },
            _appUnknowMsgProcess: function(e) {
                this._appAsTextMsgProcess(e, "[收到一条网页版微信暂不支持的消息类型，请在手机上查看]")
            },
            _appAsTextMsgProcess: function(e, t) {
                e.MMActualContent = t,
                this._textMsgProcess(e)
            },
            _recalledMsgProcess: function(e) {
                var t, o, n = this, r = utilFactory.htmlDecode(e.MMActualContent), a = "", i = MM.context("ded861c"), c = n.getChatMessage(e.MMPeerUserName);
                if (r = utilFactory.encodeEmoji(r),
                a = utilFactory.xml2json(r).revokemsg,
                0 == a.msgid) {
                    for (var s = c.length - 1; s >= 0; --s)
                        if (c[s].FromUserName == accountFactory.getUserName()) {
                            t = s;
                            break
                        }
                } else
                    t = n._findMessageByMsgId(c, a.msgid);
                if (t > -1) {
                    var l = c[t];
                    if (l.MMIsSend)
                        o = MM.context("df1fd91");
                    else {
                        var u = contactFactory.getContact(e.MMActualSender, e.MMPeerUserName);
                        o = u ? u.getDisplayName(e.MMPeerUserName) : ""
                    }
                    angular.extend(l, {
                        MMRecall: !0,
                        MsgType: confFactory.MSGTYPE_SYS,
                        MMActualContent: o + i,
                        MMDigest: o + i,
                        _h: 0
                    }),
                    n.getChatList()
                }
            },
            _recommendMsgProcess: function(e) {
                e.Contact = e.RecommendInfo,
                e.Content = e.MsgType == confFactory.MSGTYPE_VERIFYMSG ? e.Contact.NickName || e.Contact.UserName + MM.context("ebeaf99") : e.Contact.NickName || e.Contact.UserName + "text_posible_friend_msg_digest"
            },
            _verifyMsgProcess: function(e) {
                e.MMDigest = e.RecommendInfo.NickName + MM.context("ebeaf99");
                for (var t in e.RecommendInfo)
                    e.RecommendInfo[t] || delete e.RecommendInfo[t];
                e.RecommendInfo.HeadImgUrl = utilFactory.getContactHeadImgUrl({
                    UserName: e.RecommendInfo.UserName,
                    Skey: accountFactory.getSkey(),
                    MsgId: e.MsgId
                }),
                e.RecommendInfo.MMFromVerifyMsg = !0,
                contactFactory.addStrangerContact(e.RecommendInfo)
            },
            _shareCardProcess: function(e) {
                e.MMDigest += e.MMActualSender == accountFactory.getUserName() ? MM.context("9a2223f") + e.RecommendInfo.NickName : MM.context("dd14577") + e.RecommendInfo.NickName;
                for (var t in e.RecommendInfo)
                    e.RecommendInfo[t] || delete e.RecommendInfo[t];
                var o = utilFactory.htmlDecode(e.MMActualContent).replace(/<br\/>/g, "");
                o = utilFactory.encodeEmoji(o),
                o = utilFactory.xml2json(o),
                e.MMUserName = o.alias || o.username,
                e.RecommendInfo.NickName = utilFactory.decodeEmoji(e.RecommendInfo.NickName),
                e.RecommendInfo.HeadImgUrl = utilFactory.getContactHeadImgUrl({
                    UserName: e.RecommendInfo.UserName,
                    Skey: accountFactory.getSkey(),
                    MsgId: e.MsgId
                }),
                contactFactory.getContact(e.RecommendInfo.UserName, "", !0) || contactFactory.addStrangerContact(e.RecommendInfo)
            },
            _systemMsgProcess: function(e) {
                var t = e.MMActualContent.match(/&lt;a href=(?:'|").*?(?:'|").*?&gt;.*?&lt;\/a&gt;/g);
                if (t)
                    for (var o, n, r = 0, a = t.length; a > r; ++r)
                        o = /&lt;a href=(?:'|")(.*?)(?:'|").*?&gt;.*?&lt;\/a&gt;/.exec(t[r]),
                        o && o[1] && (n = o[1],
                        e.MMActualContent = e.MMActualContent.replace(/&lt;a href=(?:'|")weixin:\/\/.*?&lt;\/a&gt;/, ""));
                e.MMDigest += e.MMActualContent
            },
            _notify: function(e) {
                function t() {
                    for (var t = contactFactory.getContact(e.MMPeerUserName), o = t ? t.getDisplayName(e.MMPeerUserName) : "", n = t ? t.HeadImgUrl : "", r = e.MMDigest.replace(/(<img.*?\/>)|<span class="emoji.*?<\/span>/g, MM.context("809bb9d")), a = utilFactory.clearHtmlStr(r), i = "", c = 80, s = 0, l = 0; l < a.length; l++) {
                        if (s += a.charCodeAt(l) <= 128 ? 1 : 2,
                        s >= c) {
                            i = a.slice(0, l + 1),
                            l < a.length - 1 && (i += "…");
                            break
                        }
                        i = a
                    }
                    var u = notificationFactory.createNotification(utilFactory.clearHtmlStr(o), {
                        body: i,
                        icon: n
                    });
                    u && (u.onclick = function() {
                        try {
                            window.focus(),
                            $rootScope.$broadcast("root:notification:click", e.FromUserName)
                        } catch (t) {
                            reportService.report(reportService.ReportType.logicError, {
                                text: "notification click"
                            })
                        }
                    }
                    )
                }
                window.isFocus || (notificationFactory.permissionLevel() === notificationFactory.PERMISSION_DEFAULT ? notificationFactory.requestPermission(t) : t())
            },
            notifyMobile: function(e, t) {
                $http({
                    method: "POST",
                    url: confFactory.API_webwxstatusnotify,
                    data: angular.extend(accountFactory.getBaseRequest(), {
                        Code: t,
                        FromUserName: accountFactory.getUserName(),
                        ToUserName: e,
                        ClientMsgId: utilFactory.now()
                    })
                }).success(function() {}).error(function() {})
            },
            _getMessagePeerUserName: function(e) {
                var t = e.FromUserName == accountFactory.getUserName() || "" == e.FromUserName;
                return t ? e.ToUserName : e.FromUserName
            },
            _findMessageByMsgId: function(e, t) {
                for (var o = 0; o < e.length; ++o)
                    if (e[o].MsgId == t)
                        return o;
                return -1
            },
            _calcMsgDisplayTime: function(e, t) {
                if (t && !(t.MsgType < 0))
                    if (!e || e.MsgType < 0) {
                        var o = new Date(1e3 * t.CreateTime);
                        t.MMDigestTime = o.getHours() + ":" + utilFactory.formatNum(o.getMinutes(), 2),
                        t.MMDisplayTime = t.CreateTime,
                        t.MMTime = t.MMDigestTime
                    } else {
                        var o = new Date(1e3 * t.CreateTime);
                        t.MMDigestTime = o.getHours() + ":" + utilFactory.formatNum(o.getMinutes(), 2),
                        Math.abs(e.MMDisplayTime - t.CreateTime) >= 180 ? (t.MMDisplayTime = t.CreateTime,
                        t.MMTime = t.MMDigestTime) : (t.MMDisplayTime = e.MMDisplayTime,
                        t.MMTime = "")
                    }
            },
            _findByVerifyMsgUserName: function(e, t) {
                for (var o = 0; o < e.length; ++o) {
                    var n = e[o];
                    if (n.MsgType == confFactory.MSGTYPE_VERIFYMSG && n.RecommendInfo.UserName == t)
                        return o
                }
                return -1
            }
        };
        return service
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("chatroomFactory", ["$rootScope", "$timeout", "$http", "$q", "contactFactory", "accountFactory", "emojiFactory", "confFactory", "utilFactory", "reportService", "mmHttp", function(e, t, o, n, r, a, i, c, s, l) {
        var u, f = {}, d = {
            setCurrentContact: function(e) {
                u = e
            },
            getCurrentContact: function() {
                return u
            },
            setFilterContacts: function(e) {
                f = e || {}
            },
            getFilterContacts: function() {
                return f
            },
            create: function(e) {
                var t = n.defer()
                  , r = angular.extend({
                    MemberCount: e.length,
                    MemberList: e,
                    Topic: ""
                }, a.getBaseRequest());
                return o({
                    method: "POST",
                    url: c.API_webwxcreatechatroom + "?r=" + s.now(),
                    data: r
                }).success(function(e) {
                    e && e.BaseResponse && 0 == e.BaseResponse.Ret ? t.resolve(e) : (l.report(l.ReportType.netError, {
                        text: "create classroom net error",
                        url: c.API_webwxcreatechatroom,
                        params: r,
                        res: e
                    }),
                    t.reject(e))
                }).error(function(e) {
                    t.reject(e),
                    l.report(l.ReportType.netError, {
                        text: "create classroom net error",
                        url: c.API_webwxcreatechatroom,
                        params: r
                    })
                }),
                t.promise
            },
            addMember: function(e, t, o) {
                var n = r.getContact(e);
                n.MemberList.length + t.split(",").length >= 40 ? (console.log("invite", n.MemberList.length + t.split(",").length),
                this._update("invitemember", e, {
                    inviteMembers: t
                }, o)) : this._update("addmember", e, {
                    addMembers: t
                }, o)
            },
            delMember: function(e, t) {
                this._update("delmember", e, {
                    delMember: t
                }),
                r.getContact(e)
            },
            quit: function(e) {
                this._update("quitchatroom", e)
            },
            modTopic: function(e, t) {
                this._update("modtopic", e, {
                    topic: t
                })
            },
            _update: function(e, t, n, i) {
                n = n || {};
                var s = angular.extend({
                    AddMemberList: n.addMembers,
                    DelMemberList: n.delMember,
                    InviteMemberList: n.inviteMembers,
                    NewTopic: n.topic,
                    ChatRoomName: t
                }, a.getBaseRequest())
                  , u = c.API_webwxupdatechatroom + "?fun=" + e;
                o({
                    method: "POST",
                    url: u,
                    data: s
                }).success(function(o) {
                    var a = r.getContact(t);
                    if ("delmember" == e) {
                        for (var c = a.MemberList.length - 1; c >= 0; c--)
                            a.MemberList[c].UserName == n.delMember && a.MemberList.splice(c, 1);
                        a.MemberCount = a.MemberList.length
                    }
                    i && i(o)
                }).error(function() {
                    l.report(l.ReportType.netError, {
                        text: "update classroom net error",
                        url: u,
                        params: s
                    })
                })
            }
        };
        return d
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("accountFactory", ["$q", "confFactory", "utilFactory", function(e, t, o) {
        var n, r, a, i = {}, c = null , s = {
            type: "",
            ver: ""
        }, l = "" === o.getCookie("MM_WX_NOTIFY_STATE") ? t.MM_NOTIFY_OPEN : o.getCookie("MM_WX_NOTIFY_STATE"), u = "" === o.getCookie("MM_WX_SOUND_STATE") ? t.MM_SOUND_OPEN : o.getCookie("MM_WX_SOUND_STATE"), f = {
            openNotify: function() {
                l = t.MM_NOTIFY_OPEN,
                o.setCookie("MM_WX_NOTIFY_STATE", t.MM_NOTIFY_OPEN)
            },
            closeNotify: function() {
                l = t.MM_NOTIFY_CLOSE,
                o.setCookie("MM_WX_NOTIFY_STATE", t.MM_NOTIFY_CLOSE)
            },
            isNotifyOpen: function() {
                return !!l
            },
            openSound: function() {
                u = t.MM_SOUND_OPEN,
                o.setCookie("MM_WX_SOUND_STATE", t.MM_SOUND_OPEN)
            },
            closeSound: function() {
                u = t.MM_SOUND_CLOSE,
                o.setCookie("MM_WX_SOUND_STATE", t.MM_SOUND_CLOSE)
            },
            isSoundOpen: function() {
                return !!u
            },
            setUserInfo: function(e) {
                angular.extend(i, e)
            },
            updateUserInfo: function(e, o) {
                var n = this;
                if (e && e.BitFlag == t.PROFILE_BITFLAG_CHANGE) {
                    var r = {};
                    e.HeadImgUpdateFlag && (r.HeadImgUrl = e.HeadImgUrl),
                    e.NickName.Buff && (r.NickName = e.NickName.Buff),
                    n.setUserInfo(r),
                    o && o()
                }
            },
            getUserInfo: function() {
                return i
            },
            getUserName: function() {
                return this.getUserInfo() && this.getUserInfo().UserName
            },
            getSyncKey: function() {
                return c || {
                    List: []
                }
            },
            getFormateSyncKey: function() {
                for (var e = this.getSyncKey().List, t = [], o = 0, n = e.length; n > o; o++)
                    t.push(e[o].Key + "_" + e[o].Val);
                return t.join("|")
            },
            setSyncKey: function(e) {
                e && e.Count > 0 ? c = e : o.log("JS Function: setSyncKey. Error. no synckey")
            },
            setPassticket: function(e) {
                a = e
            },
            getPassticket: function() {
                return a
            },
            getSid: function() {
                return n || (n = o.getCookie("wxsid"))
            },
            setSid: function(e) {
                e && (n = e)
            },
            getSkey: function() {
                return r || ""
            },
            setSkey: function(e) {
                e && (r = e)
            },
            setUin: function(e) {
                this.getUserInfo().Uin = e
            },
            getUin: function() {
                return this.getUserInfo() && this.getUserInfo().Uin || o.getCookie("wxuin")
            },
            getBaseRequest: function() {
                return {
                    BaseRequest: {
                        Uin: this.getUin(),
                        Sid: this.getSid(),
                        Skey: this.getSkey(),
                        DeviceID: this.getDeviceID()
                    }
                }
            },
            getDeviceID: function() {
                return "e" + ("" + Math.random().toFixed(15)).substring(2, 17)
            },
            isHigherVer: function() {
                return s.ver >= 4.5
            },
            setClientVer: function(e) {
                var t = parseInt(e, 10).toString(16)
                  , o = t.substr(0, 1)
                  , t = t.substr(1, 3).replace("0", ".");
                s.type = o,
                s.ver = t
            }
        };
        return l == t.MM_NOTIFY_OPEN ? f.openNotify() : f.closeNotify(),
        u == t.MM_SOUND_OPEN ? f.openSound() : f.closeSound(),
        f
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("confFactory", ["$q", function() {
        var e = location.host
          , t = "weixin.qq.com"
          , o = "file.wx.qq.com"
          , n = "webpush.weixin.qq.com";
        e.indexOf("wx2.qq.com") > -1 ? (t = "weixin.qq.com",
        o = "file2.wx.qq.com",
        n = "webpush2.weixin.qq.com") : e.indexOf("qq.com") > -1 ? (t = "weixin.qq.com",
        o = "file.wx.qq.com",
        n = "webpush.weixin.qq.com") : e.indexOf("web1.wechat.com") > -1 ? (t = "wechat.com",
        o = "file1.wechat.com",
        n = "webpush1.wechat.com") : e.indexOf("web2.wechat.com") > -1 ? (t = "wechat.com",
        o = "file2.wechat.com",
        n = "webpush2.wechat.com") : e.indexOf("wechat.com") > -1 ? (t = "wechat.com",
        o = "file.wechat.com",
        n = "webpush.wechat.com") : e.indexOf("web1.wechatapp.com") > -1 ? (t = "wechatapp.com",
        o = "file1.wechatapp.com",
        n = "webpush1.wechatapp.com") : (t = "wechatapp.com",
        o = "file.wechatapp.com",
        n = "webpush.wechatapp.com");
        var r = navigator.language || navigator.browserLanguage;
        r || (r = "zh-cn"),
        r = r.split("-"),
        r = r[0].toLowerCase() + "_" + (r[1] || "").toUpperCase();
        var a = {
            LANG: r,
            EMOTICON_REG: 'img\\sclass="(qq)?emoji (qq)?emoji([\\da-f]*?)"\\s(text="[^<>\\s]*")?\\s?src="[^<>\\s]*"\\s*',
            RES_PATH: "/zh_CN/htmledition/v2/",
            API_jsLogin: "https://login." + t + "/jslogin?appid=wx782c26e4c19acffb&redirect_uri=" + encodeURIComponent(location.protocol + "//" + location.host + "/cgi-bin/mmwebwx-bin/webwxnewloginpage") + "&fun=new&lang=" + r,
            API_login: "https://login." + t + "/cgi-bin/mmwebwx-bin/login",
            API_synccheck: "https://" + n + "/cgi-bin/mmwebwx-bin/synccheck",
            API_webwxdownloadmedia: "https://" + o + "/cgi-bin/mmwebwx-bin/webwxgetmedia",
            API_webwxuploadmedia: "https://" + o + "/cgi-bin/mmwebwx-bin/webwxuploadmedia",
            API_webwxpreview: "/cgi-bin/mmwebwx-bin/webwxpreview",
            API_webwxinit: "/cgi-bin/mmwebwx-bin/webwxinit?r=" + ~new Date,
            API_webwxgetcontact: "/cgi-bin/mmwebwx-bin/webwxgetcontact",
            API_webwxsync: "/cgi-bin/mmwebwx-bin/webwxsync",
            API_webwxbatchgetcontact: "/cgi-bin/mmwebwx-bin/webwxbatchgetcontact",
            API_webwxgeticon: "/cgi-bin/mmwebwx-bin/webwxgeticon",
            API_webwxsendmsg: "/cgi-bin/mmwebwx-bin/webwxsendmsg",
            API_webwxsendmsgimg: "/cgi-bin/mmwebwx-bin/webwxsendmsgimg",
            API_webwxsendemoticon: "/cgi-bin/mmwebwx-bin/webwxsendemoticon",
            API_webwxsendappmsg: "/cgi-bin/mmwebwx-bin/webwxsendappmsg",
            API_webwxgetheadimg: "/cgi-bin/mmwebwx-bin/webwxgetheadimg",
            API_webwxgetmsgimg: "/cgi-bin/mmwebwx-bin/webwxgetmsgimg",
            API_webwxgetmedia: "/cgi-bin/mmwebwx-bin/webwxgetmedia",
            API_webwxgetvideo: "/cgi-bin/mmwebwx-bin/webwxgetvideo",
            API_webwxlogout: "/cgi-bin/mmwebwx-bin/webwxlogout",
            API_webwxgetvoice: "/cgi-bin/mmwebwx-bin/webwxgetvoice",
            API_webwxupdatechatroom: "/cgi-bin/mmwebwx-bin/webwxupdatechatroom",
            API_webwxcreatechatroom: "/cgi-bin/mmwebwx-bin/webwxcreatechatroom",
            API_webwxstatusnotify: "/cgi-bin/mmwebwx-bin/webwxstatusnotify",
            API_webwxcheckurl: "/cgi-bin/mmwebwx-bin/webwxcheckurl",
            API_webwxverifyuser: "/cgi-bin/mmwebwx-bin/webwxverifyuser",
            API_webwxfeedback: "/cgi-bin/mmwebwx-bin/webwxsendfeedback",
            API_webwxreport: "/cgi-bin/mmwebwx-bin/webwxstatreport",
            API_webwxsearch: "/cgi-bin/mmwebwx-bin/webwxsearchcontact",
            API_webwxoplog: "/cgi-bin/mmwebwx-bin/webwxoplog",
            oplogCmdId: {
                TOPCONTACT: 3,
                MODREMARKNAME: 2
            },
            SP_CONTACT_FILE_HELPER: "filehelper",
            SP_CONTACT_NEWSAPP: "newsapp",
            SP_CONTACT_RECOMMEND_HELPER: "fmessage",
            CONTACTFLAG_CONTACT: 1,
            CONTACTFLAG_CHATCONTACT: 2,
            CONTACTFLAG_CHATROOMCONTACT: 4,
            CONTACTFLAG_BLACKLISTCONTACT: 8,
            CONTACTFLAG_DOMAINCONTACT: 16,
            CONTACTFLAG_HIDECONTACT: 32,
            CONTACTFLAG_FAVOURCONTACT: 64,
            CONTACTFLAG_3RDAPPCONTACT: 128,
            CONTACTFLAG_SNSBLACKLISTCONTACT: 256,
            CONTACTFLAG_NOTIFYCLOSECONTACT: 512,
            CONTACTFLAG_TOPCONTACT: 2048,
            MM_USERATTRVERIFYFALG_BIZ: 1,
            MM_USERATTRVERIFYFALG_FAMOUS: 2,
            MM_USERATTRVERIFYFALG_BIZ_BIG: 4,
            MM_USERATTRVERIFYFALG_BIZ_BRAND: 8,
            MM_USERATTRVERIFYFALG_BIZ_VERIFIED: 16,
            MM_DATA_TEXT: 1,
            MM_DATA_HTML: 2,
            MM_DATA_IMG: 3,
            MM_DATA_PRIVATEMSG_TEXT: 11,
            MM_DATA_PRIVATEMSG_HTML: 12,
            MM_DATA_PRIVATEMSG_IMG: 13,
            MM_DATA_VOICEMSG: 34,
            MM_DATA_PUSHMAIL: 35,
            MM_DATA_QMSG: 36,
            MM_DATA_VERIFYMSG: 37,
            MM_DATA_PUSHSYSTEMMSG: 38,
            MM_DATA_QQLIXIANMSG_IMG: 39,
            MM_DATA_POSSIBLEFRIEND_MSG: 40,
            MM_DATA_SHARECARD: 42,
            MM_DATA_VIDEO: 43,
            MM_DATA_VIDEO_IPHONE_EXPORT: 44,
            MM_DATA_EMOJI: 47,
            MM_DATA_LOCATION: 48,
            MM_DATA_APPMSG: 49,
            MM_DATA_VOIPMSG: 50,
            MM_DATA_STATUSNOTIFY: 51,
            MM_DATA_VOIPNOTIFY: 52,
            MM_DATA_VOIPINVITE: 53,
            MM_DATA_MICROVIDEO: 62,
            MM_DATA_SYSNOTICE: 9999,
            MM_DATA_SYS: 1e4,
            MM_DATA_RECALLED: 10002,
            MSGTYPE_TEXT: 1,
            MSGTYPE_IMAGE: 3,
            MSGTYPE_VOICE: 34,
            MSGTYPE_VIDEO: 43,
            MSGTYPE_MICROVIDEO: 62,
            MSGTYPE_EMOTICON: 47,
            MSGTYPE_APP: 49,
            MSGTYPE_VOIPMSG: 50,
            MSGTYPE_VOIPNOTIFY: 52,
            MSGTYPE_VOIPINVITE: 53,
            MSGTYPE_LOCATION: 48,
            MSGTYPE_STATUSNOTIFY: 51,
            MSGTYPE_SYSNOTICE: 9999,
            MSGTYPE_POSSIBLEFRIEND_MSG: 40,
            MSGTYPE_VERIFYMSG: 37,
            MSGTYPE_SHARECARD: 42,
            MSGTYPE_SYS: 1e4,
            MSGTYPE_RECALLED: 10002,
            MSG_SEND_STATUS_READY: 0,
            MSG_SEND_STATUS_SENDING: 1,
            MSG_SEND_STATUS_SUCC: 2,
            MSG_SEND_STATUS_FAIL: 5,
            APPMSGTYPE_TEXT: 1,
            APPMSGTYPE_IMG: 2,
            APPMSGTYPE_AUDIO: 3,
            APPMSGTYPE_VIDEO: 4,
            APPMSGTYPE_URL: 5,
            APPMSGTYPE_ATTACH: 6,
            APPMSGTYPE_OPEN: 7,
            APPMSGTYPE_EMOJI: 8,
            APPMSGTYPE_VOICE_REMIND: 9,
            APPMSGTYPE_SCAN_GOOD: 10,
            APPMSGTYPE_GOOD: 13,
            APPMSGTYPE_EMOTION: 15,
            APPMSGTYPE_CARD_TICKET: 16,
            APPMSGTYPE_REALTIME_SHARE_LOCATION: 17,
            APPMSGTYPE_TRANSFERS: 2e3,
            APPMSGTYPE_RED_ENVELOPES: 2001,
            APPMSGTYPE_READER_TYPE: 100001,
            UPLOAD_MEDIA_TYPE_IMAGE: 1,
            UPLOAD_MEDIA_TYPE_VIDEO: 2,
            UPLOAD_MEDIA_TYPE_AUDIO: 3,
            UPLOAD_MEDIA_TYPE_ATTACHMENT: 4,
            PROFILE_BITFLAG_NOCHANGE: 0,
            PROFILE_BITFLAG_CHANGE: 190,
            CHATROOM_NOTIFY_OPEN: 1,
            CHATROOM_NOTIFY_CLOSE: 0,
            StatusNotifyCode_READED: 1,
            StatusNotifyCode_ENTER_SESSION: 2,
            StatusNotifyCode_INITED: 3,
            StatusNotifyCode_SYNC_CONV: 4,
            StatusNotifyCode_QUIT_SESSION: 5,
            VERIFYUSER_OPCODE_ADDCONTACT: 1,
            VERIFYUSER_OPCODE_SENDREQUEST: 2,
            VERIFYUSER_OPCODE_VERIFYOK: 3,
            VERIFYUSER_OPCODE_VERIFYREJECT: 4,
            VERIFYUSER_OPCODE_SENDERREPLY: 5,
            VERIFYUSER_OPCODE_RECVERREPLY: 6,
            ADDSCENE_PF_QQ: 4,
            ADDSCENE_PF_EMAIL: 5,
            ADDSCENE_PF_CONTACT: 6,
            ADDSCENE_PF_WEIXIN: 7,
            ADDSCENE_PF_GROUP: 8,
            ADDSCENE_PF_UNKNOWN: 9,
            ADDSCENE_PF_MOBILE: 10,
            ADDSCENE_PF_WEB: 33,
            TIMEOUT_SYNC_CHECK: 0,
            EMOJI_FLAG_GIF: 2,
            KEYCODE_BACKSPACE: 8,
            KEYCODE_ENTER: 13,
            KEYCODE_SHIFT: 16,
            KEYCODE_ESC: 27,
            KEYCODE_DELETE: 34,
            KEYCODE_ARROW_LEFT: 37,
            KEYCODE_ARROW_UP: 38,
            KEYCODE_ARROW_RIGHT: 39,
            KEYCODE_ARROW_DOWN: 40,
            KEYCODE_NUM2: 50,
            KEYCODE_AT: 64,
            KEYCODE_NUM_ADD: 107,
            KEYCODE_NUM_MINUS: 109,
            KEYCODE_ADD: 187,
            KEYCODE_MINUS: 189,
            MM_NOTIFY_CLOSE: 0,
            MM_NOTIFY_OPEN: 1,
            MM_SOUND_CLOSE: 0,
            MM_SOUND_OPEN: 1,
            MM_SEND_FILE_STATUS_QUEUED: 0,
            MM_SEND_FILE_STATUS_SENDING: 1,
            MM_SEND_FILE_STATUS_SUCCESS: 2,
            MM_SEND_FILE_STATUS_FAIL: 3,
            MM_SEND_FILE_STATUS_CANCEL: 4,
            MM_EMOTICON_WEB: "_web"
        };
        return angular.extend(a, {
            RES_IMG_DEFAULT: a.RES_PATH + "images/img.gif",
            RES_IMG_PLACEHOLDER: a.RES_PATH + "images/spacer.gif",
            RES_SOUND_RECEIVE_MSG: a.RES_PATH + "sound/msg.mp3",
            RES_SOUND_SEND_MSG: a.RES_PATH + "sound/text.mp3"
        }),
        /mmdebug=local/.test(document.location.search) && angular.extend(a, {
            TIMEOUT_SYNC_CHECK: 3e3,
            API_jsLogin: "/zh_CN/htmledition/v2/api/jsLogin.js",
            API_login: "/zh_CN/htmledition/v2/api/login.js",
            API_webwxinit: "/zh_CN/htmledition/v2/api/webwxinit.json",
            API_webwxgetcontact: "/zh_CN/htmledition/v2/api/webwxgetcontact.json",
            API_webwxsync: "/zh_CN/htmledition/v2/api/webwxsync.json",
            API_synccheck: "/zh_CN/htmledition/v2/api/synccheck.js",
            API_webwxbatchgetcontact: "/zh_CN/htmledition/v2/api/webwxbatchgetcontact.json",
            API_webwxgeticon: "/zh_CN/htmledition/v2/images/webwxgeticon.jpg",
            API_webwxgetheadimg: "/zh_CN/htmledition/v2/images/webwxgeticon.jpg",
            API_webwxgetmsgimg: "/zh_CN/htmledition/v2/images/webwxgeticon.jpg",
            API_webwxgetmedia: "/zh_CN/htmledition/v2/images/webwxgeticon.jpg",
            API_webwxgetvideo: "/zh_CN/htmledition/v2/images/webwxgetvideo.mp4"
        }),
        a
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("contactFactory", ["$rootScope", "$http", "$q", "$timeout", "confFactory", "accountFactory", "emojiFactory", "utilFactory", "resourceService", "reportService", "mmHttp", function(
      e   // $rootScope
      , t // $http
      , o // $q
      , n // $timeout
      , r // confFactory
      , a // accountFactory
      , i // emojiFactory
      , c // utilFactory
      , s // resourceService
      , l // reportService
      , u // mmHttp
    ) {
        function f(e) {
            return e = angular.extend({
                RemarkPYQuanPin: "",
                RemarkPYInitial: "",
                PYInitial: "",
                PYQuanPin: ""
            }, e, P),
            e.HeadImgUrl || (e.HeadImgUrl = r.API_webwxgeticon + "?seq=0&username=" + e.UserName + "&skey=" + a.getSkey()),
            e
        }
        var d, g = window._contacts = {}, m = window._strangerContacts = {}, p = [], h = [], M = [], y = [], C = window._chatRoomMemberDisplayNames = {}, v = [], w = [], S = [], b = {}, T = {}, E = 0, N = ["fmessage"], P = {
            isSelf: function() {
                return a.getUserName() == this.UserName
            },
            isContact: function() {
                return !!(this.ContactFlag & r.CONTACTFLAG_CONTACT) || this.UserName == a.getUserName()
            },
            isBlackContact: function() {
                return !!(this.ContactFlag & r.CONTACTFLAG_BLACKLISTCONTACT)
            },
            isConversationContact: function() {
                return !!(this.ContactFlag & r.CONTACTFLAG_CHATCONTACT)
            },
            isRoomContact: function() {
                return c.isRoomContact(this.UserName)
            },
            isRoomContactDel: function() {
                return this.isRoomContact() && !(this.ContactFlag & r.CONTACTFLAG_CHATROOMCONTACT)
            },
            isRoomOwner: function() {
                return this.isRoomContact() && this.OwnerUin == a.getUin()
            },
            isBrandContact: function() {
                return this.VerifyFlag & r.MM_USERATTRVERIFYFALG_BIZ_BRAND
            },
            isSpContact: function() {
                return c.isSpUser(this.UserName)
            },
            isShieldUser: function() {
                var e = c.isShieldUser(this.UserName) || this.isRoomContact() && !this.isInChatroom();
                return e && console.log("已屏蔽：", this.UserName, this.NickName),
                e
            },
            isFileHelper: function() {
                return this.UserName == r.SP_CONTACT_FILE_HELPER
            },
            isRecommendHelper: function() {
                return this.UserName == r.SP_CONTACT_RECOMMEND_HELPER
            },
            isNewsApp: function() {
                return this.UserName == r.SP_CONTACT_NEWSAPP
            },
            isMuted: function() {
                return this.isRoomContact() ? this.Statues === r.CHATROOM_NOTIFY_CLOSE : this.ContactFlag & r.CONTACTFLAG_NOTIFYCLOSECONTACT
            },
            isTop: function() {
                return this.ContactFlag & r.CONTACTFLAG_TOPCONTACT
            },
            hasPhotoAlbum: function() {
                return 1 & this.SnsFlag
            },
            isInChatroom: function() {
                var e = this;
                return 0 == this.MemberList.length && 0 != this.ContactFlag ? !0 : e.MMInChatroom === !1 || e.MMInChatroom === !0 ? e.MMInChatroom : (angular.forEach(this.MemberList, function(t) {
                    return t.UserName == a.getUserInfo().UserName ? void (e.MMInChatroom = !0) : void 0
                }),
                e.MMInChatroom = e.MMInChatroom || !1,
                e.MMInChatroom)
            },
            isReadOnlyContact: function() {
                return N.indexOf(this.UserName) > -1
            },
            getDisplayName: function(e) {
                var t = this
                  , o = "";
                if (c.isRoomContact(t.UserName))
                    if (o = t.RemarkName || t.NickName,
                    !o && t.MemberList)
                        for (var n = 0, r = t.MemberList.length; r > n && 10 > n; ++n) {
                            o.length > 0 && (o += ", ");
                            var a = t.MemberList[n]
                              , i = A.getContact(a.UserName);
                            o += i && i.RemarkName || i && i.NickName || a.NickName
                        }
                    else
                        o || (o = t.UserName);
                else
                    o = t.RemarkName || e && e != t.UserName && t.getMemberDisplayName(e) || t.NickName;
                return o
            },
            getMemberDisplayName: function(e) {
                return A.getChatroomIdByUserName(e),
                e && C[e] ? C[e][this.UserName] : ""
            },
            chatroomCanSearch: function(e) {
                if (this.isRoomContact()) {
                    if (this.canSearch(e))
                        return !0;
                    for (var t = 0, o = this.MemberList.length; o > t; t++) {
                        var n = this.MemberList[t].UserName
                          , r = A.getContact(n);
                        if (r && r.canSearch(e))
                            return !0
                    }
                }
            },
            canSearch: function(e) {
                if (!e)
                    return !0;
                e = e.toUpperCase();
                var t = this.RemarkName || ""
                  , o = this.RemarkPYQuanPin || ""
                  , n = this.NickName || ""
                  , r = this.PYQuanPin || ""
                  , a = this.Alias || ""
                  , i = this.KeyWord || ""
                  , c = 0
                  , s = 0;
                return c = t.toUpperCase().indexOf(e),
                s = o.toUpperCase().indexOf(e),
                c >= 0 || s >= 0 ? !0 : (c = n.toUpperCase().indexOf(e),
                s = r.toUpperCase().indexOf(e),
                c >= 0 || s >= 0 ? !0 : a.toUpperCase().indexOf(e) >= 0 ? !0 : i.toUpperCase().indexOf(e) >= 0 ? !0 : !1)
            },
            update: function(e) {
                e && angular.extend(this, e)
            }
        }, A = {
            contactChangeFlag: "",
            setCurrentContact: function(e) {
                d = e
            },
            getCurrentContact: function() {
                return d
            },
            isSelf: function(e) {
                return a.getUserName() == e
            },
            initContact: function(e) {
                var n = o.defer();
                return t({
                    method: "GET",
                    url: r.API_webwxgetcontact,
                    params: {
                        skey: a.getSkey(),
                        pass_ticket: a.getPassticket(),
                        seq: e,
                        r: c.now()
                    }
                }).success(function(e) {
                    n.resolve(e)
                }).error(function(e) {
                    n.reject("error:" + e),
                    l.report(l.ReportType.netError, {
                        text: "init contact",
                        url: r.API_webwxgetcontact,
                        params: {
                            skey: a.getSkey(),
                            pass_ticket: a.getPassticket()
                        }
                    })
                }),
                n.promise
            },
            specialContactHandler: function(e) {
                var t = {
                    weixin: MM.context("6c2fc35"),
                    filehelper: MM.context("eb7ec65"),
                    newsapp: MM.context("0469c27"),
                    fmessage: MM.context("a82c4c4")
                };
                return t[e.UserName] && (e.NickName = t[e.UserName]),
                "fmessage" == e.UserName && (e.ContactFlag = 0),
                e
            },
            addContact: function(e) {
                e && (e.isContact || (e = f(e),
                e.MMOrderSymbol = this.getContactOrderSymbol(e)),
                e.EncryChatRoomId && e.UserName && (e.MMFromBatchget = !0),
                e.RemarkName = e.RemarkName && i.transformSpanToImg(e.RemarkName),
                e.NickName = e.NickName && i.transformSpanToImg(e.NickName),
                e.isShieldUser() || !e.isContact() && !e.isRoomContact() ? this.addStrangerContact(e) : this.addFriendContact(e))
            },
            addFriendContact: function(e) {
                var t, o = this;
                if (e) {
                    if (e = o.specialContactHandler(e),
                    t = g[e.UserName]) {
                        for (var n in e)
                            e[n] || delete e[n];
                        angular.extend(t, e)
                    } else
                        g[e.UserName] = e;
                    o.contactChangeFlag = +new Date,
                    s.load({
                        url: e.HeadImgUrl,
                        type: "image"
                    })
                }
            },
            addContacts: function(e, t) {
                var o = this;
                angular.forEach(e, function(e) {
                    t && (e.MMFromBatchGet = !0),
                    o.addContact(e)
                })
            },
            deleteContact: function(e) {
                var t = this.getContact(e.UserName);
                t && (delete g[e.UserName],
                angular.extend(t, e),
                m[e.UserName] = t)
            },
            getContact: function(e, t, o) {
                var n, r = this;
                return n = g[e],
                n || (n = r.getStrangerContacts(e)),
                o ? n : ((!n || c.isRoomContact(e) && 0 == n.MemberList.length) && r.addBatchgetContact({
                    UserName: e,
                    EncryChatRoomId: t || ""
                }),
                n)
            },
            getStrangerContacts: function(e) {
                return m[e]
            },
            addStrangerContact: function(e) {
                var t;
                if (t = m[e.UserName]) {
                    for (var o in e)
                        e[o] || delete e[o];
                    angular.extend(t, e)
                } else
                    m[e.UserName] = e;
                s.load({
                    url: e.HeadImgUrl,
                    type: "image"
                })
            },
            addChatroomMemberDisplayName: function(e, t) {
                e.DisplayName && t && (C[t] || (C[t] = {}),
                C[t][e.UserName] = e.DisplayName)
            },
            getChatroomIdByUserName: function(e) {
                var t = g[e] || {};
                return t.EncryChatRoomId
            },
            inContactsWithErrorToGetList: function(e) {
                for (var t = 0, o = S.length; o > t; t++)
                    if (S[t].UserName == e.UserName)
                        return t;
                return -1
            },
            inContactsToGetList: function(e) {
                for (var t = 0, o = v.length; o > t; t++)
                    if (v[t].UserName == e.UserName)
                        return t;
                return -1
            },
            inContactsGettingList: function(e) {
                for (var t = 0, o = w.length; o > t; t++)
                    if (w[t].UserName == e.UserName)
                        return t;
                return -1
            },
            inContactsGetErrMap: function(e) {
                return b[e.UserName]
            },
            addBatchgetContact: function(e, t, r) {
                function i(e) {
                    f.resolve(e.ContactList),
                    E = 0,
                    console.time("addContactsHandler"),
                    angular.forEach(e.ContactList, function(e) {
                        var t = d.inContactsToGetList({
                            UserName: e.UserName
                        });
                        t > -1 && v.splice(t, 1),
                        c.isRoomContact(e.UserName) && e.MemberList && e.MemberList.length ? angular.forEach(e.MemberList, function(t) {
                            var o = d.getContact(t.UserName, "", !0);
                            o && o.isContact() || (t.HeadImgUrl = c.getContactHeadImgUrl({
                                EncryChatRoomId: e.EncryChatRoomId,
                                UserName: t.UserName,
                                Skey: a.getSkey()
                            }),
                            d.addContact(t)),
                            d.addChatroomMemberDisplayName(t, e.UserName);
                            var n = d.inContactsToGetList({
                                UserName: t.UserName
                            });
                            n > -1 && v.splice(n, 1)
                        }) : d.addChatroomMemberDisplayName(e, e.UserName)
                    }),
                    console.timeEnd("addContactsHandler"),
                    d.addContacts(e.ContactList, !0),
                    w = [],
                    !w.length && v.length > 0 && d.batchGetContact().then(i, s)
                }
                function s(e) {
                    var t = w;
                    w = [],
                    E++,
                    f.reject(e),
                    1 == t.length ? (console.log("batchGetContactError", t[0]),
                    b[t[0].UserName] = 1) : angular.forEach(t, function(e) {
                        d.addBatchgetContact(e, !1, !0)
                    }),
                    w.length || !v.length && !S.length || d.batchGetContact().then(i, s)
                }
                var l, u, f = o.defer(), d = this;
                if (e && e.UserName) {
                    if (r) {
                        if (d.inContactsWithErrorToGetList(e) > -1)
                            return;
                        S.push(e),
                        l = d.inContactsToGetList(e),
                        l > -1 && v.splice(l, 1)
                    } else {
                        if (d.inContactsToGetList(e) > -1 || d.inContactsGettingList(e) > -1 || d.inContactsGetErrMap(e))
                            return;
                        c.isRoomContact(e.UserName) || t ? v.unshift(e) : v.push(e)
                    }
                    return u && n.cancel(u),
                    u = n(function() {
                        w.length || !v.length && !S.length || d.batchGetContact().then(i, s)
                    }, 200),
                    f.promise
                }
            },
            addBatchgetChatroomContact: function(e) {
                if (c.isRoomContact(e)) {
                    var t = this.getContact(e);
                    t && t.MMFromBatchGet || this.addBatchgetContact({
                        UserName: e,
                        ChatRoomId: ""
                    })
                }
            },
            addBatchgetChatroomMembersContact: function(e) {
                var t = this
                  , o = t.getContact(e);
                o && o.isRoomContact() && !o.MMBatchgetMember && o.MemberList.length > 0 && (o.MMBatchgetMember = !0,
                angular.forEach(o.MemberList, function(e) {
                    var n = t.getContact(e.UserName);
                    !n || n.isContact() || n.MMFromBatchget || t.addBatchgetContact({
                        UserName: n.UserName,
                        EncryChatRoomId: o.UserName
                    })
                }))
            },
            batchGetContact: function(e) {
                var n = o.defer()
                  , i = 1;
                return S.length ? (i = S.length < 6 || E > 2 ? 1 : S.length < 40 ? 5 : 10,
                w = S.splice(0, i),
                console.log("_contactsWithErrorToGetList lenght:", S.length)) : w = v.splice(0, 50),
                t({
                    method: "POST",
                    url: r.API_webwxbatchgetcontact + "?type=ex&r=" + c.now(),
                    data: angular.extend(a.getBaseRequest(), {
                        Count: w.length,
                        List: w
                    })
                }).success(function(t) {
                    t && t.BaseResponse && 0 == t.BaseResponse.Ret ? n.resolve(t) : (console.log("batchGetContact data.BaseResponse.Ret =", t.BaseResponse.Ret),
                    n.reject(e))
                }).error(function() {
                    l.report(l.ReportType.netError, {
                        text: "batchGetContact",
                        url: r.API_webwxbatchgetcontact
                    }),
                    n.reject(e)
                }),
                n.promise
            },
            getChatRoomMembersContact: function(e, t) {
                var o = this
                  , n = g[e]
                  , r = [];
                return n ? (angular.forEach(n.MemberList, function(e) {
                    var n = o.getContact(e.UserName);
                    n || (n = e),
                    t && n.UserName == a.getUserName() || r.push(n)
                }),
                r) : []
            },
            getAllContacts: function() {
                return g
            },
            getAllStarContact: function(e) {
                e = e || {};
                var t;
                t = e.isNewArray ? [] : h,
                t.length = 0;
                var o = e.filterContacts || {};
                for (var n in g) {
                    var r = g[n];
                    r.isSelf() || 1 != r.StarFriend || o[n] || !r.canSearch(e.keyword) || t.push(r)
                }
                return t = t.sort(function(e, t) {
                    return e.MMOrderSymbol > t.MMOrderSymbol ? 1 : -1
                })
            },
            getAllChatroomContact: function(e) {
                e = e || {};
                var t;
                t = e.isNewArray ? [] : M,
                t.length = 0;
                var o = e.filterContacts || {};
                for (var n in g) {
                    var r = g[n];
                    if (r.isRoomContact() && (!e.keyword || r.chatroomCanSearch(e.keyword)) && !o[n]) {
                        if (e.isSaved && !r.isContact())
                            continue;t.push(r)
                    }
                }
                return t.sort(function(e, t) {
                    return e.MMOrderSymbol > t.MMOrderSymbol ? 1 : -1
                }),
                t
            },
            getAllBrandContact: function(e) {
                e = e || {};
                var t;
                t = e.isNewArray ? [] : y,
                t.length = 0;
                for (var o in g) {
                    var n = g[o];
                    n.isBrandContact() && n.canSearch(e.keyword) && t.push(n)
                }
                return t.sort(function(e, t) {
                    return e.MMOrderSymbol > t.MMOrderSymbol ? 1 : -1
                }),
                t
            },
            getAllFriendContact: function(e) {
                e = e || {};
                var t;
                t = e.isNewArray ? [] : p,
                t.length = 0,
                e.filterContacts = e.filterContacts || {};
                for (var o in g)
                    if (!e.filterContacts[o]) {
                        var n = g[o];
                        n.isSelf() && !a.isHigherVer() || !n.isContact() || e.isWithoutStar && 1 == n.StarFriend || n.isRoomContact() || e.isWithoutBrand && n.isBrandContact() || n.isShieldUser() || n.canSearch(e.keyword) && t.push(n)
                    }
                return t.sort(function(e, t) {
                    return e.MMOrderSymbol > t.MMOrderSymbol ? 1 : -1
                }),
                t
            },
            remoteSearch: function(e) {
                function n(e) {
                    for (var t, o, n = [], r = 0; r < e.length; r++)
                        t = e[r].EncryUserName,
                        o = g[t],
                        o && o.isContact() && !o.isBrandContact() && n.push(o);
                    return n
                }
                var i = o.defer();
                return this.prevSearchCanceler && this.prevSearchCanceler.resolve(),
                this.prevSearchCanceler = o.defer(),
                T[e] ? i.resolve(n(T[e])) : t({
                    method: "POST",
                    url: r.API_webwxsearch,
                    timeout: this.prevSearchCanceler.promise,
                    data: angular.extend(a.getBaseRequest(), {
                        KeyWord: e
                    })
                }).success(function(t) {
                    if (t.BaseResponse && 0 == t.BaseResponse.Ret) {
                        var o = t.List;
                        o.length > 0 && (T[e] = o),
                        i.resolve(n(o))
                    }
                }).error(function() {}),
                i.promise
            },
            pickContacts: function(e, t, o) {
                for (var n, r, a, i = [], c = this, s = t.all || {}, l = 0; l < e.length; l++)
                    switch (n = e[l],
                    a = t[n] || {},
                    a = $.extend({}, a, s),
                    n) {
                    case "star":
                        r = c.getAllStarContact(a),
                        r.length > 0 && (a.noHeader || i.push({
                            text: MM.context("f13fb20"),
                            type: "header"
                        }),
                        [].push.apply(i, r));
                        break;
                    case "friend":
                        if (r = c.getAllFriendContact(a),
                        r.length > 0) {
                            a.showFriendHeader && i.push({
                                text: MM.context("59d29a3"),
                                type: "header"
                            });
                            var u = "";
                            a.showFriendHeader || a.noHeader || angular.forEach(r, function(e, t) {
                                if (e.MMOrderSymbol) {
                                    var o = e.MMOrderSymbol.charAt(0);
                                    u != o && (u = o,
                                    r.splice(t, 0, {
                                        text: o,
                                        type: "header"
                                    }))
                                }
                            }),
                            [].push.apply(i, r)
                        }
                        break;
                    case "chatroom":
                        r = c.getAllChatroomContact(a),
                        r.length > 0 && (a.noHeader || i.push({
                            text: MM.context("4b0ab7b"),
                            type: "header"
                        }),
                        [].push.apply(i, r));
                        break;
                    case "brand":
                        r = c.getAllBrandContact(a),
                        r.length > 0 && (t[n].noHeader || i.push({
                            text: MM.context("215feec"),
                            type: "header"
                        }),
                        [].push.apply(i, r))
                    }
                return o && (i = angular.copy(i)),
                {
                    result: i
                }
            },
            getContactOrderSymbol: function(e) {
                if (!e)
                    return "";
                var t = "";
                return t = c.clearHtmlStr(e.RemarkPYQuanPin || e.PYQuanPin || e.NickName || "").toLocaleUpperCase().replace(/\W/gi, ""),
                t.charAt(0) < "A" && (t = "~"),
                t
            },
            verifyUser: function(e) {
                var n = o.defer()
                  , i = {
                    Opcode: e.Opcode || r.VERIFYUSER_OPCODE_VERIFYOK,
                    VerifyUserListSize: 1,
                    VerifyUserList: [{
                        Value: e.UserName,
                        VerifyUserTicket: e.Ticket || ""
                    }],
                    VerifyContent: e.VerifyContent || "",
                    SceneListCount: 1,
                    SceneList: [e.Scene],
                    skey: a.getSkey()
                };
                return t({
                    method: "POST",
                    url: r.API_webwxverifyuser + "?r=" + c.now(),
                    data: angular.extend(a.getBaseRequest(), i)
                }).success(function(e) {
                    e.BaseResponse && 0 == e.BaseResponse.Ret ? n.resolve(e) : (n.reject(e),
                    l.report(l.ReportType.netError, {
                        text: "添加验证好友，服务器返回错误",
                        url: r.API_webwxverifyuser,
                        params: i,
                        res: e
                    }))
                }).error(function(e) {
                    n.reject(e),
                    l.report(l.ReportType.netError, {
                        text: "添加验证好友，请求失败",
                        url: r.API_webwxverifyuser,
                        params: i,
                        res: e
                    })
                }),
                n.promise
            },
            setTopContact: function(t, o) {
                var n = this.getContact(t);
                n.ContactFlag = o ? n.ContactFlag | r.CONTACTFLAG_TOPCONTACT : n.ContactFlag & ~r.CONTACTFLAG_TOPCONTACT,
                e.$broadcast("contact:settop", n),
                u({
                    method: "POST",
                    url: r.API_webwxoplog,
                    data: angular.extend({
                        UserName: t,
                        CmdId: r.oplogCmdId.TOPCONTACT,
                        OP: o ? 1 : 0
                    }, a.getBaseRequest()),
                    MMRetry: {
                        count: 3,
                        timeout: 1e4,
                        serial: !0
                    }
                }).success(function() {}).error(function() {})
            }
        };
        return A
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("loginFactory", ["$http", "$q", "$timeout", "accountFactory", "confFactory", "utilFactory", "mmHttp", "reportService", function(
      e   // $http
      , t // $q
      , o // $timeout
      , n // accountFactory
      , r // confFactory
      , a // utilFactory
      , i // mmHttp
      , c // reportService
    ) {
        var s = {
            getUUID: function() {
                var e = t.defer();
                return window.QRLogin = {},
                $.ajax({
                    url: r.API_jsLogin,
                    dataType: "script"
                }).done(function() {
                    200 == window.QRLogin.code ? e.resolve(window.QRLogin.uuid) : e.reject(window.QRLogin.code)
                }),
                e.promise
            },
            getQrcode: function() {},
            checkLogin: function(e, o) {
                var n = t.defer()
                  , o = o || 0;
                return window.code = 0,
                $.ajax({
                    url: r.API_login + "?loginicon=true&uuid=" + e + "&tip=" + o + "&r=" + ~new Date,
                    dataType: "script",
                    timeout: 35e3
                }).done(function() {
                    if (new RegExp("/" + location.host + "/"),
                    window.redirect_uri && window.redirect_uri.indexOf("/" + location.host + "/") < 0)
                        return void (location.href = window.redirect_uri);
                    var e = {
                        code: window.code,
                        redirect_uri: window.redirect_uri,
                        userAvatar: window.userAvatar
                    };
                    n.resolve(e)
                }),
                n.promise
            },
            newLoginPage: function(e) {
                var o = t.defer();
                return i({
                    method: "GET",
                    url: e + "&fun=new&version=v2",
                    MMRetry: {
                        count: 3,
                        timeout: 1e4,
                        serial: !0
                    }
                }).success(function(e) {
                    c.report(c.ReportType.timing, {
                        timing: {
                            loginEnd: Date.now()
                        }
                    }),
                    o.resolve(e)
                }).error(function(e) {
                    o.reject("error:" + e)
                }),
                o.promise
            },
            loginout: function(e) {
                window.onbeforeunload = null ;
                var t = r.API_webwxlogout + "?redirect=1&type=" + (e || 0) + "&skey=" + encodeURIComponent(n.getSkey());
                a.form(t, {
                    sid: n.getSid(),
                    uin: n.getUin()
                })
            },
            timeoutDetect: function(e) {
                return e = +e,
                1100 == e ? (window.onbeforeunload = null ,
                this.loginout(0),
                !0) : 1101 == e || 1102 == e ? (window.onbeforeunload = null ,
                this.loginout(0),
                !0) : void (1205 == e && this.loginout(1))
            }
        };
        return s
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("utilFactory", ["$q", "$rootScope", "confFactory", function(
        e   // $q
        , t // $rootScope
        , o // $confFactory
        ) {
        function n(e, t, o, n) {
            var r;
            (r = l[e]) ? (r.intervalSum += o,
            n && n <= r.intervalSum && (setTimeout(t, 0),
            l[e].intervalSum = 0),
            clearTimeout(r.timer),
            r.timer = setTimeout(function() {
                delete l[e],
                setTimeout(t, 0)
            }, o)) : (setTimeout(t, 0),
            l[e] = {
                intervalSum: 0,
                timer: setTimeout(function() {
                    delete l[e]
                }, o)
            })
        }
        window.isFocus = !0;
        var r, a = {}, i = "(\\s|\\n|<br>|^)(http(s)?://.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?(&|&amp;)//=]*)", c = ["weibo", "qqmail", "fmessage", "tmessage", "qmessage", "qqsync", "floatbottle", "lbsapp", "shakeapp", "medianote", "qqfriend", "readerapp", "blogapp", "facebookapp", "masssendapp", "meishiapp", "feedsapp", "voip", "blogappweixin", "weixin", "brandsessionholder", "weixinreminder", "wxid_novlwrv3lqwv11", "gh_22b87fa7cb3c", "officialaccounts", "notification_messages"], s = ["newsapp", "wxid_novlwrv3lqwv11", "gh_22b87fa7cb3c", "notification_messages"], l = {};
        window.onfocus = function() {
            window.isFocus = !0
        }
        ,
        window.onblur = function() {
            window.isFocus = !1
        }
        ;
        var u = {
            isLog: !1,
            log: function() {
                this.isLog && console.log(arguments)
            },
            now: function() {
                return +new Date
            },
            getCookie: function(e) {
                for (var t = e + "=", o = document.cookie.split(";"), n = 0; n < o.length; n++) {
                    for (var r = o[n]; " " == r.charAt(0); )
                        r = r.substring(1);
                    if (-1 != r.indexOf(t))
                        return r.substring(t.length, r.length)
                }
                return ""
            },
            setCookie: function(e, t, o) {
                var n = new Date;
                n.setTime(n.getTime() + 24 * o * 60 * 60 * 1e3);
                var r = "expires=" + n.toUTCString();
                document.cookie = e + "=" + t + "; " + r
            },
            clearCookie: function() {
                for (var e = document.cookie.split(";"), t = 0; t < e.length; t++) {
                    var o = e[t]
                      , n = o.indexOf("=")
                      , r = n > -1 ? o.substr(0, n) : o;
                    document.cookie = r + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT"
                }
            },
            getLocalStorage: function() {
                return window.localStorage || {
                    getItem: function() {
                        return void 0
                    },
                    setItem: function() {},
                    removeItem: function() {},
                    key: function() {
                        return ""
                    }
                }
            },
            htmlEncode: function(e) {
                return angular.isString(e) ? e.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""
            },
            htmlDecode: function(e) {
                return e && 0 != e.length ? e.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&") : ""
            },
            hrefEncode: function(e) {
                var t = this
                  , o = e.match(/&lt;a href=(?:'|").*?(?:'|").*?&gt;.*?&lt;\/a&gt;/g);
                if (o) {
                    for (var n, r, a = 0, c = o.length; c > a; ++a)
                        n = /&lt;a href=(?:'|")(.*?)(?:'|").*?&gt;.*?&lt;\/a&gt;/.exec(o[a]),
                        n && n[1] && (r = n[1],
                        t.isUrl(r) && (e = e.replace(n[0], this.htmlDecode(n[0])).replace(n[1], u.genCheckURL(n[1]))));
                    return e
                }
                return e.replace(new RegExp(i,"ig"), function() {
                    return '<a target="_blank" href="' + u.genCheckURL(arguments[0].replace(/^(\s|\n)/, "")) + '">' + arguments[0] + "</a>"
                })
            },
            clearHtmlStr: function(e) {
                return e ? e.replace(/<[^>]*>/g, "") : e
            },
            clearLinkTag: function(e) {
                return e
            },
            setCheckUrl: function(e) {
                r = "&skey=" + encodeURIComponent(e.getSkey()) + "&deviceid=" + encodeURIComponent(e.getDeviceID()) + "&pass_ticket=" + encodeURIComponent(e.getPassticket()) + "&opcode=2&scene=1&username=" + e.getUserName()
            },
            genCheckURL: function(e) {
                if (!r)
                    throw "_checkURLsuffix is not ready!";
                return o.API_webwxcheckurl + "?requrl=" + encodeURIComponent((0 == e.indexOf("http") ? "" : "http://") + u.clearHtmlStr(u.htmlDecode(e))) + r
            },
            isUrl: function(e) {
                return new RegExp(i,"i").test(e)
            },
            formatNum: function(e, t) {
                var o = (isNaN(e) ? 0 : e).toString()
                  , n = t - o.length;
                return n > 0 ? [new Array(n + 1).join("0"), o].join("") : o
            },
            getServerTime: function() {
                return (new Date).getTime()
            },
            globalEval: function(e) {
                e && /\S/.test(e) && (window.execScript || function(e) {
                    window.eval.call(window, e)
                }
                )(e)
            },
            evalVal: function(e) {
                var t, o = "a" + this.now();
                return this.globalEval(["(function(){try{window.", o, "=", e, ";}catch(_oError){}})();"].join("")),
                t = window[o],
                window[o] = null ,
                t
            },
            browser: function() {
                var e, t = navigator.userAgent.toLowerCase();
                if (null  != t.match(/trident/))
                    e = {
                        browser: "msie",
                        version: null  != t.match(/msie ([\d.]+)/) ? t.match(/msie ([\d.]+)/)[1] : t.match(/rv:([\d.]+)/)[1]
                    };
                else {
                    var o = /(msie) ([\w.]+)/.exec(t) || /(chrome)[ \/]([\w.]+)/.exec(t) || /(webkit)[ \/]([\w.]+)/.exec(t) || /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(t) || t.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(t) || [];
                    e = {
                        browser: o[1] || "",
                        version: o[2] || "0"
                    }
                }
                var n = {};
                return e.browser && (n[e.browser] = !0,
                n.version = e.version),
                n.chrome ? n.webkit = !0 : n.webkit && (n.safari = !0),
                n
            }(),
            isSpUser: function(e) {
                for (var t = 0, o = c.length; o > t; t++)
                    if (c[t] === e || /@qqim$/.test(e))
                        return !0;
                return !1
            },
            isShieldUser: function(e) {
                if (/@lbsroom$/.test(e) || /@talkroom$/.test(e))
                    return !0;
                for (var t = 0, o = s.length; o > t; ++t)
                    if (s[t] == e)
                        return !0;
                return !1
            },
            isRoomContact: function(e) {
                return e ? /^@@|@chatroom$/.test(e) : !1
            },
            initMsgNoticePlayer: function(e) {
                var t = jQuery("#msgNoticePlayer");
                require.async(["jplayer"], function() {
                    t.jPlayer({
                        ready: function() {},
                        swfPath: window.MMSource.jplayerSwfPath,
                        solution: "html, flash",
                        supplied: "mp3",
                        wmode: "window"
                    }),
                    t.jPlayer("stop"),
                    t.jPlayer("setMedia", {
                        mp3: e
                    }),
                    t.jPlayer("play")
                })
            },
            getContactHeadImgUrl: function(e) {
                return (this.isRoomContact(e.UserName) ? o.API_webwxgetheadimg : o.API_webwxgeticon) + "?seq=0&username=" + e.UserName + "&skey=" + e.Skey + (e.MsgId ? "&msgid=" + e.MsgId : "") + (e.EncryChatRoomId ? "&chatroomid=" + e.EncryChatRoomId : "")
            },
            form: function(e, t) {
                t = t || {};
                var o, n = [];
                n.push('<form method="POST" action="' + this.htmlEncode(e) + '">');
                for (var r in t)
                    n.push('<input type="hidden" name="' + r + '" value="' + t[r] + '">');
                n.push("</form>"),
                o = angular.element(n.join(""))[0],
                document.body.appendChild(o),
                o.submit()
            },
            queryParser: function() {
                for (var e = {}, t = location.search.substring(1), o = t.split("&"), n = 0, r = o.length; r > n; n++) {
                    var a = o[n].split("=")
                      , i = decodeURIComponent(a[0]);
                    e[i] = decodeURIComponent(a[1] || "")
                }
                return e
            },
            getSize: function(e) {
                if (e = +e) {
                    var t = 10
                      , o = 10
                      , n = 20
                      , r = 1 << o
                      , a = 1 << n;
                    if (e >> n > 0) {
                        var i = Math.round(e * t / a) / t;
                        return "" + i + "MB"
                    }
                    if (e >> o - 1 > 0) {
                        var c = Math.round(e * t / r) / t;
                        return "" + c + "KB"
                    }
                    return "" + e + "B"
                }
            },
            xml2json: function(e) {
                if (!e)
                    return {};
                try {
                    var t = e.indexOf("<");
                    return t && (e = e.substr(t)),
                    $.xml2json(e)
                } catch (o) {
                    return console.error(o),
                    {}
                }
            },
            encodeEmoji: function(e) {
                return e = e || "",
                e = e.replace(/<span class="(emoji emoji[a-zA-Z0-9]+)"><\/span>/g, "###__EMOJI__$1__###")
            },
            decodeEmoji: function(e) {
                return e = e || "",
                e = e.replace(/###__EMOJI__(emoji emoji[a-zA-Z0-9]+)__###/g, '<span class="$1"></span>')
            },
            removeHtmlStrTag: function(e) {
                return e = e || "",
                e = this.encodeEmoji(e),
                e = this.htmlDecode(e),
                e = this.clearHtmlStr(e),
                e = this.decodeEmoji(e)
            },
            safeDigest: function(e) {
                e = e || t,
                e.$$phase || e.$digest()
            },
            wait: function(e, t, o) {
                var o = o || 10;
                setTimeout(function n() {
                    e() ? t() : setTimeout(n, o)
                }, o)
            },
            fitRun: n,
            findIndex: function(e, t) {
                for (var o = 0; o < e.length; o++)
                    if (e[o] == t)
                        return o;
                return -1
            },
            genEmoticonHTML: function(e, t) {
                return '<img class="' + e + '" text="' + t + (t.indexOf(o.MM_EMOTICON_WEB) > -1 ? "" : o.MM_EMOTICON_WEB) + '" src="' + o.RES_IMG_PLACEHOLDER + '" />'
            },
            getShareObject: function(e) {
                return a[e] = a[e] || {},
                a[e]
            },
            isUserName: function() {},
            isWindows: /windows/gi.test(navigator.userAgent),
            isMacOS: /macintosh/gi.test(navigator.userAgent),
            isIPad: /ipad/gi.test(navigator.userAgent)
        };
        return u
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("emojiFactory", ["$http", "$q", "confFactory", "utilFactory", function(e, t, o, n) {
        var r = {
            formatHTMLToSend: function(e) {
                var t = this;
                return n.htmlDecode(n.clearHtmlStr(e.replace(/<(?:img|IMG).*?text="(.*?)".*?>/g, function(e, t) {
                    return t.replace(o.MM_EMOTICON_WEB, "")
                }).replace(/<(?:br|BR)\/?>/g, "\n"))).replace(/<(.*?)>/g, function(e) {
                    return t.EmojiCodeMap[t.QQFaceMap[e]] || e
                })
            },
            transformSpanToImg: function(e) {
                var t = this;
                return e && e.replace(/<span.*?class="emoji emoji(.*?)"><\/span>/g, function() {
                    var e = t.EmojiCodeMap[arguments[1]];
                    return n.genEmoticonHTML("emoji emoji" + arguments[1], e || "")
                })
            },
            emoticonFormat: function(e) {
                var t = this;
                return 0 == e.length ? "" : (e = e.replace(new RegExp("(\\[.+?\\])(?!" + o.MM_EMOTICON_WEB + ")","g"), function(e, o) {
                    return t.getEmoticonByText(o) || e
                }).replace(new RegExp("&lt;(.+?)&gt;(?!" + o.MM_EMOTICON_WEB + ")","g"), function(e, o) {
                    return t.getEmoticonByText("<" + o + ">") || e
                }),
                e = t.transformSpanToImg(e))
            },
            getEmoticonById: function(e) {
                var t = this.EmojiCodeMap[e];
                return t ? n.genEmoticonHTML("emoji emoji" + e, t) : ""
            },
            getEmoticonByText: function(e) {
                var t;
                if (e.indexOf("<") > -1) {
                    if (t = this.QQFaceMap[e])
                        return n.genEmoticonHTML("emoji emoji" + t, this.EmojiCodeMap[t])
                } else if (t = this.QQFaceMap[e.replace(/\[|\]/g, "")])
                    return n.genEmoticonHTML("qqemoji qqemoji" + t, e);
                return null
            },
            getTuzkiByMd5: function(e) {
                return this.md52Tuzki[e]
            },
            getMd5ByTuzki: function(e) {
                return this.Tuzki2Md5[e]
            },
            QQFaceList: ["微笑", "撇嘴", "色", "发呆", "得意", "流泪", "害羞", "闭嘴", "睡", "大哭", "尴尬", "发怒", "调皮", "呲牙", "惊讶", "难过", "酷", "冷汗", "抓狂", "吐", "偷笑", "愉快", "白眼", "傲慢", "饥饿", "困", "惊恐", "流汗", "憨笑", "悠闲", "奋斗", "咒骂", "疑问", "嘘", "晕", "疯了", "衰", "骷髅", "敲打", "再见", "擦汗", "抠鼻", "鼓掌", "糗大了", "坏笑", "左哼哼", "右哼哼", "哈欠", "鄙视", "委屈", "快哭了", "阴险", "亲亲", "吓", "可怜", "菜刀", "西瓜", "啤酒", "篮球", "乒乓", "咖啡", "饭", "猪头", "玫瑰", "凋谢", "嘴唇", "爱心", "心碎", "蛋糕", "闪电", "炸弹", "刀", "足球", "瓢虫", "便便", "月亮", "太阳", "礼物", "拥抱", "强", "弱", "握手", "胜利", "抱拳", "勾引", "拳头", "差劲", "爱你", "NO", "OK", "爱情", "飞吻", "跳跳", "发抖", "怄火", "转圈", "磕头", "回头", "跳绳", "投降", "激动", "乱舞", "献吻", "左太极", "右太极"],
            EmojiList: ["笑脸", "开心", "大笑", "热情", "眨眼", "色", "接吻", "亲吻", "脸红", "露齿笑", "满意", "戏弄", "吐舌", "无语", "得意", "汗", "失望", "低落", "呸", "焦虑", "担心", "震惊", "悔恨", "眼泪", "哭", "破涕为笑", "晕", "恐惧", "心烦", "生气", "睡觉", "生病", "恶魔", "外星人", "心", "心碎", "丘比特", "闪烁", "星星", "叹号", "问号", "睡着", "水滴", "音乐", "火", "便便", "强", "弱", "拳头", "胜利", "上", "下", "右", "左", "第一", "强壮", "吻", "热恋", "男孩", "女孩", "女士", "男士", "天使", "骷髅", "红唇", "太阳", "下雨", "多云", "雪人", "月亮", "闪电", "海浪", "猫", "小狗", "老鼠", "仓鼠", "兔子", "狗", "青蛙", "老虎", "考拉", "熊", "猪", "牛", "野猪", "猴子", "马", "蛇", "鸽子", "鸡", "企鹅", "毛虫", "章鱼", "鱼", "鲸鱼", "海豚", "玫瑰", "花", "棕榈树", "仙人掌", "礼盒", "南瓜灯", "鬼魂", "圣诞老人", "圣诞树", "礼物", "铃", "庆祝", "气球", "CD", "相机", "录像机", "电脑", "电视", "电话", "解锁", "锁", "钥匙", "成交", "灯泡", "邮箱", "浴缸", "钱", "炸弹", "手枪", "药丸", "橄榄球", "篮球", "足球", "棒球", "高尔夫", "奖杯", "入侵者", "唱歌", "吉他", "比基尼", "皇冠", "雨伞", "手提包", "口红", "戒指", "钻石", "咖啡", "啤酒", "干杯", "鸡尾酒", "汉堡", "薯条", "意面", "寿司", "面条", "煎蛋", "冰激凌", "蛋糕", "苹果", "飞机", "火箭", "自行车", "高铁", "警告", "旗", "男人", "女人", "O", "X", "版权", "注册商标", "商标"],
            QQFaceMap: {
                "微笑": "0",
                "撇嘴": "1",
                "色": "2",
                "发呆": "3",
                "得意": "4",
                "流泪": "5",
                "害羞": "6",
                "闭嘴": "7",
                "睡": "8",
                "大哭": "9",
                "尴尬": "10",
                "发怒": "11",
                "调皮": "12",
                "呲牙": "13",
                "惊讶": "14",
                "难过": "15",
                "酷": "16",
                "冷汗": "17",
                "抓狂": "18",
                "吐": "19",
                "偷笑": "20",
                "可爱": "21",
                "愉快": "21",
                "白眼": "22",
                "傲慢": "23",
                "饥饿": "24",
                "困": "25",
                "惊恐": "26",
                "流汗": "27",
                "憨笑": "28",
                "悠闲": "29",
                "大兵": "29",
                "奋斗": "30",
                "咒骂": "31",
                "疑问": "32",
                "嘘": "33",
                "晕": "34",
                "疯了": "35",
                "折磨": "35",
                "衰": "36",
                "骷髅": "37",
                "敲打": "38",
                "再见": "39",
                "擦汗": "40",
                "抠鼻": "41",
                "鼓掌": "42",
                "糗大了": "43",
                "坏笑": "44",
                "左哼哼": "45",
                "右哼哼": "46",
                "哈欠": "47",
                "鄙视": "48",
                "委屈": "49",
                "快哭了": "50",
                "阴险": "51",
                "亲亲": "52",
                "吓": "53",
                "可怜": "54",
                "菜刀": "55",
                "西瓜": "56",
                "啤酒": "57",
                "篮球": "58",
                "乒乓": "59",
                "咖啡": "60",
                "饭": "61",
                "猪头": "62",
                "玫瑰": "63",
                "凋谢": "64",
                "嘴唇": "65",
                "示爱": "65",
                "爱心": "66",
                "心碎": "67",
                "蛋糕": "68",
                "闪电": "69",
                "炸弹": "70",
                "刀": "71",
                "足球": "72",
                "瓢虫": "73",
                "便便": "74",
                "月亮": "75",
                "太阳": "76",
                "礼物": "77",
                "拥抱": "78",
                "强": "79",
                "弱": "80",
                "握手": "81",
                "胜利": "82",
                "抱拳": "83",
                "勾引": "84",
                "拳头": "85",
                "差劲": "86",
                "爱你": "87",
                NO: "88",
                OK: "89",
                "爱情": "90",
                "飞吻": "91",
                "跳跳": "92",
                "发抖": "93",
                "怄火": "94",
                "转圈": "95",
                "磕头": "96",
                "回头": "97",
                "跳绳": "98",
                "投降": "99",
                "激动": "100",
                "乱舞": "101",
                "献吻": "102",
                "左太极": "103",
                "右太极": "104",
                Smile: "0",
                Grimace: "1",
                Drool: "2",
                Scowl: "3",
                Chill: "4",
                CoolGuy: "4",
                Sob: "5",
                Shy: "6",
                Shutup: "7",
                Silent: "7",
                Sleep: "8",
                Cry: "9",
                Awkward: "10",
                Pout: "11",
                Angry: "11",
                Wink: "12",
                Tongue: "12",
                Grin: "13",
                Surprised: "14",
                Surprise: "14",
                Frown: "15",
                Cool: "16",
                Ruthless: "16",
                Tension: "17",
                Blush: "17",
                Scream: "18",
                Crazy: "18",
                Puke: "19",
                Chuckle: "20",
                Joyful: "21",
                Slight: "22",
                Smug: "23",
                Hungry: "24",
                Drowsy: "25",
                Panic: "26",
                Sweat: "27",
                Laugh: "28",
                Loafer: "29",
                Commando: "29",
                Strive: "30",
                Determined: "30",
                Scold: "31",
                Doubt: "32",
                Shocked: "32",
                Shhh: "33",
                Dizzy: "34",
                Tormented: "35",
                BadLuck: "36",
                Toasted: "36",
                Skull: "37",
                Hammer: "38",
                Wave: "39",
                Relief: "40",
                Speechless: "40",
                DigNose: "41",
                NosePick: "41",
                Clap: "42",
                Shame: "43",
                Trick: "44",
                "Bah！L": "45",
                "Bah！R": "46",
                Yawn: "47",
                Lookdown: "48",
                "Pooh-pooh": "48",
                Wronged: "49",
                Shrunken: "49",
                Puling: "50",
                TearingUp: "50",
                Sly: "51",
                Kiss: "52",
                "Uh-oh": "53",
                Wrath: "53",
                Whimper: "54",
                Cleaver: "55",
                Melon: "56",
                Watermelon: "56",
                Beer: "57",
                Basketball: "58",
                PingPong: "59",
                Coffee: "60",
                Rice: "61",
                Pig: "62",
                Rose: "63",
                Wilt: "64",
                Lip: "65",
                Lips: "65",
                Heart: "66",
                BrokenHeart: "67",
                Cake: "68",
                Lightning: "69",
                Bomb: "70",
                Dagger: "71",
                Soccer: "72",
                Ladybug: "73",
                Poop: "74",
                Moon: "75",
                Sun: "76",
                Gift: "77",
                Hug: "78",
                Strong: "79",
                ThumbsUp: "79",
                Weak: "80",
                ThumbsDown: "80",
                Shake: "81",
                Victory: "82",
                Peace: "82",
                Admire: "83",
                Fight: "83",
                Beckon: "84",
                Fist: "85",
                Pinky: "86",
                Love: "2",
                RockOn: "87",
                No: "88",
                "Nuh-uh": "88",
                InLove: "90",
                Blowkiss: "91",
                Waddle: "92",
                Tremble: "93",
                "Aaagh!": "94",
                Twirl: "95",
                Kotow: "96",
                Lookback: "97",
                Dramatic: "97",
                Jump: "98",
                JumpRope: "98",
                "Give-in": "99",
                Surrender: "99",
                Hooray: "100",
                HeyHey: "101",
                Meditate: "101",
                Smooch: "102",
                "TaiJi L": "103",
                "TaiChi L": "103",
                "TaiJi R": "104",
                "TaiChi R": "104",
                "發呆": "3",
                "流淚": "5",
                "閉嘴": "7",
                "尷尬": "10",
                "發怒": "11",
                "調皮": "12",
                "驚訝": "14",
                "難過": "15",
                "饑餓": "24",
                "累": "25",
                "驚恐": "26",
                "悠閑": "29",
                "奮鬥": "30",
                "咒罵": "31",
                "疑問": "32",
                "噓": "33",
                "暈": "34",
                "瘋了": "35",
                "骷髏頭": "37",
                "再見": "39",
                "摳鼻": "41",
                "羞辱": "43",
                "壞笑": "44",
                "鄙視": "48",
                "陰險": "51",
                "親親": "52",
                "嚇": "53",
                "可憐": "54",
                "籃球": "58",
                "飯": "61",
                "豬頭": "62",
                "枯萎": "64",
                "愛心": "66",
                "閃電": "69",
                "炸彈": "70",
                "甲蟲": "73",
                "太陽": "76",
                "禮物": "77",
                "擁抱": "78",
                "強": "79",
                "勝利": "82",
                "拳頭": "85",
                "差勁": "86",
                "愛你": "88",
                "愛情": "90",
                "飛吻": "91",
                "發抖": "93",
                "噴火": "94",
                "轉圈": "95",
                "磕頭": "96",
                "回頭": "97",
                "跳繩": "98",
                "激動": "100",
                "亂舞": "101",
                "獻吻": "102",
                "左太極": "103",
                "右太極": "104",
                "<笑脸>": "1f604",
                "<笑臉>": "1f604",
                "<Laugh>": "1f604",
                "<开心>": "1f60a",
                "<開心>": "1f60a",
                "<Happy>": "1f60a",
                "<大笑>": "1f603",
                "<Big Smile>": "1f603",
                "<热情>": "263a",
                "<熱情>": "263a",
                "<Glowing>": "263a",
                "<眨眼>": "1f609",
                "<Wink>": "1f609",
                "<色>": "1f60d",
                "<Love>": "1f60d",
                "<Drool>": "1f60d",
                "<接吻>": "1f618",
                "<Smooch>": "1f618",
                "<亲吻>": "1f61a",
                "<親吻>": "1f61a",
                "<Kiss>": "1f61a",
                "<脸红>": "1f633",
                "<臉紅>": "1f633",
                "<Blush>": "1f633",
                "<露齿笑>": "1f63c",
                "<露齒笑>": "1f63c",
                "<Grin>": "1f63c",
                "<满意>": "1f60c",
                "<滿意>": "1f60c",
                "<Satisfied>": "1f60c",
                "<戏弄>": "1f61c",
                "<戲弄>": "1f61c",
                "<Tease>": "1f61c",
                "<吐舌>": "1f445",
                "<Tongue>": "1f445",
                "<无语>": "1f612",
                "<無語>": "1f612",
                "<Speechless>": "1f612",
                "<得意>": "1f60f",
                "<Smirk>": "1f60f",
                "<CoolGuy>": "1f60f",
                "<汗>": "1f613",
                "<Sweat>": "1f613",
                "<失望>": "1f640",
                "<Let Down>": "1f640",
                "<低落>": "1f61e",
                "<Low>": "1f61e",
                "<呸>": "1f616",
                "<Ugh>": "1f616",
                "<焦虑>": "1f625",
                "<焦慮>": "1f625",
                "<Anxious>": "1f625",
                "<担心>": "1f630",
                "<擔心>": "1f630",
                "<Worried>": "1f630",
                "<震惊>": "1f628",
                "<震驚>": "1f628",
                "<Shocked>": "1f628",
                "<悔恨>": "1f62b",
                "<D’oh!>": "1f62b",
                "<眼泪>": "1f622",
                "<眼淚>": "1f622",
                "<Tear>": "1f622",
                "<哭>": "1f62d",
                "<Cry>": "1f62d",
                "<破涕为笑>": "1f602",
                "<破涕為笑>": "1f602",
                "<Lol>": "1f602",
                "<晕>": "1f632",
                "<Dead>": "1f632",
                "<Dizzy>": "1f632",
                "<恐惧>": "1f631",
                "<恐懼>": "1f631",
                "<Terror>": "1f631",
                "<心烦>": "1f620",
                "<心煩>": "1f620",
                "<Upset>": "1f620",
                "<生气>": "1f63e",
                "<生氣>": "1f63e",
                "<Angry>": "1f63e",
                "<睡觉>": "1f62a",
                "<睡覺>": "1f62a",
                "<Zzz>": "1f62a",
                "<生病>": "1f637",
                "<Sick>": "1f637",
                "<恶魔>": "1f47f",
                "<惡魔>": "1f47f",
                "<Demon>": "1f47f",
                "<外星人>": "1f47d",
                "<Alien>": "1f47d",
                "<心>": "2764",
                "<Heart>": "2764",
                "<心碎>": "1f494",
                "<Heartbroken>": "1f494",
                "<BrokenHeart>": "1f494",
                "<丘比特>": "1f498",
                "<Cupid>": "1f498",
                "<闪烁>": "2728",
                "<閃爍>": "2728",
                "<Twinkle>": "2728",
                "<星星>": "1f31f",
                "<Star>": "1f31f",
                "<叹号>": "2755",
                "<嘆號>": "2755",
                "<!>": "2755",
                "<问号>": "2754",
                "<問號>": "2754",
                "<?>": "2754",
                "<睡着>": "1f4a4",
                "<睡著>": "1f4a4",
                "<Asleep>": "1f4a4",
                "<水滴>": "1f4a6",
                "<Drops>": "1f4a6",
                "<音乐>": "1f3b5",
                "<音樂>": "1f3b5",
                "<Music>": "1f3b5",
                "<火>": "1f525",
                "<Fire>": "1f525",
                "<便便>": "1f4a9",
                "<Poop>": "1f4a9",
                "<强>": "1f44d",
                "<強>": "1f44d",
                "<ThumbsUp>": "1f44d",
                "<弱>": "1f44e",
                "<ThumbsDown>": "1f44e",
                "<拳头>": "1f44a",
                "<拳頭>": "1f44a",
                "<Punch>": "1f44a",
                "<Fist>": "1f44a",
                "<胜利>": "270c",
                "<勝利>": "270c",
                "<Peace>": "270c",
                "<上>": "1f446",
                "<Up>": "1f446",
                "<下>": "1f447",
                "<Down>": "1f447",
                "<右>": "1f449",
                "<Right>": "1f449",
                "<左>": "1f448",
                "<Left>": "1f448",
                "<第一>": "261d",
                "<#1>": "261d",
                "<强壮>": "1f4aa",
                "<強壯>": "1f4aa",
                "<Strong>": "1f4aa",
                "<吻>": "1f48f",
                "<Kissing>": "1f48f",
                "<热恋>": "1f491",
                "<熱戀>": "1f491",
                "<Couple>": "1f491",
                "<男孩>": "1f466",
                "<Boy>": "1f466",
                "<女孩>": "1f467",
                "<Girl>": "1f467",
                "<女士>": "1f469",
                "<Lady>": "1f469",
                "<男士>": "1f468",
                "<Man>": "1f468",
                "<天使>": "1f47c",
                "<Angel>": "1f47c",
                "<骷髅>": "1f480",
                "<骷髏>": "1f480",
                "<Skull>": "1f480",
                "<红唇>": "1f48b",
                "<紅唇>": "1f48b",
                "<Lips>": "1f48b",
                "<太阳>": "2600",
                "<太陽>": "2600",
                "<Sun>": "2600",
                "<下雨>": "2614",
                "<Rain>": "2614",
                "<多云>": "2601",
                "<多雲>": "2601",
                "<Cloud>": "2601",
                "<雪人>": "26c4",
                "<Snowman>": "26c4",
                "<月亮>": "1f319",
                "<Moon>": "1f319",
                "<闪电>": "26a1",
                "<閃電>": "26a1",
                "<Lightning>": "26a1",
                "<海浪>": "1f30a",
                "<Waves>": "1f30a",
                "<猫>": "1f431",
                "<貓>": "1f431",
                "<Cat>": "1f431",
                "<小狗>": "1f429",
                "<Doggy>": "1f429",
                "<老鼠>": "1f42d",
                "<Mouse>": "1f42d",
                "<仓鼠>": "1f439",
                "<倉鼠>": "1f439",
                "<Hamster>": "1f439",
                "<兔子>": "1f430",
                "<Rabbit>": "1f430",
                "<狗>": "1f43a",
                "<Dog>": "1f43a",
                "<青蛙>": "1f438",
                "<Frog>": "1f438",
                "<老虎>": "1f42f",
                "<Tiger>": "1f42f",
                "<考拉>": "1f428",
                "<Koala>": "1f428",
                "<熊>": "1f43b",
                "<Bear>": "1f43b",
                "<猪>": "1f437",
                "<豬>": "1f437",
                "<Pig>": "1f437",
                "<牛>": "1f42e",
                "<Cow>": "1f42e",
                "<野猪>": "1f417",
                "<野豬>": "1f417",
                "<Boar>": "1f417",
                "<猴子>": "1f435",
                "<Monkey>": "1f435",
                "<马>": "1f434",
                "<馬>": "1f434",
                "<Horse>": "1f434",
                "<蛇>": "1f40d",
                "<Snake>": "1f40d",
                "<鸽子>": "1f426",
                "<鴿子>": "1f426",
                "<Pigeon>": "1f426",
                "<鸡>": "1f414",
                "<雞>": "1f414",
                "<Chicken>": "1f414",
                "<企鹅>": "1f427",
                "<企鵝>": "1f427",
                "<Penguin>": "1f427",
                "<毛虫>": "1f41b",
                "<毛蟲>": "1f41b",
                "<Caterpillar>": "1f41b",
                "<章鱼>": "1f419",
                "<八爪魚>": "1f419",
                "<Octopus>": "1f419",
                "<鱼>": "1f420",
                "<魚>": "1f420",
                "<Fish>": "1f420",
                "<鲸鱼>": "1f433",
                "<鯨魚>": "1f433",
                "<Whale>": "1f433",
                "<海豚>": "1f42c",
                "<Dolphin>": "1f42c",
                "<玫瑰>": "1f339",
                "<Rose>": "1f339",
                "<花>": "1f33a",
                "<Flower>": "1f33a",
                "<棕榈树>": "1f334",
                "<棕櫚樹>": "1f334",
                "<Palm>": "1f334",
                "<仙人掌>": "1f335",
                "<Cactus>": "1f335",
                "<礼盒>": "1f49d",
                "<禮盒>": "1f49d",
                "<Candy Box>": "1f49d",
                "<南瓜灯>": "1f383",
                "<南瓜燈>": "1f383",
                "<Jack-o-lantern>": "1f383",
                "<鬼魂>": "1f47b",
                "<Ghost>": "1f47b",
                "<圣诞老人>": "1f385",
                "<聖誕老人>": "1f385",
                "<Santa>": "1f385",
                "<圣诞树>": "1f384",
                "<聖誕樹>": "1f384",
                "<Xmas Tree>": "1f384",
                "<礼物>": "1f381",
                "<禮物>": "1f381",
                "<Gift>": "1f381",
                "<铃>": "1f514",
                "<鈴鐺>": "1f514",
                "<Bell>": "1f514",
                "<庆祝>": "1f389",
                "<慶祝>": "1f389",
                "<Party>": "1f389",
                "<气球>": "1f388",
                "<氣球>": "1f388",
                "<Balloon>": "1f388",
                "<CD>": "1f4bf",
                "<相机>": "1f4f7",
                "<相機>": "1f4f7",
                "<Camera>": "1f4f7",
                "<录像机>": "1f3a5",
                "<錄影機>": "1f3a5",
                "<Film Camera>": "1f3a5",
                "<电脑>": "1f4bb",
                "<電腦>": "1f4bb",
                "<Computer>": "1f4bb",
                "<电视>": "1f4fa",
                "<電視>": "1f4fa",
                "<TV>": "1f4fa",
                "<电话>": "1f4de",
                "<電話>": "1f4de",
                "<Phone>": "1f4de",
                "<解锁>": "1f513",
                "<解鎖>": "1f513",
                "<Unlocked>": "1f513",
                "<锁>": "1f512",
                "<鎖>": "1f512",
                "<Locked>": "1f512",
                "<钥匙>": "1f511",
                "<鑰匙>": "1f511",
                "<Key>": "1f511",
                "<成交>": "1f528",
                "<Judgement>": "1f528",
                "<灯泡>": "1f4a1",
                "<燈泡>": "1f4a1",
                "<Light bulb>": "1f4a1",
                "<邮箱>": "1f4eb",
                "<郵箱>": "1f4eb",
                "<Mail>": "1f4eb",
                "<浴缸>": "1f6c0",
                "<Wash>": "1f6c0",
                "<钱>": "1f4b2",
                "<錢>": "1f4b2",
                "<Money>": "1f4b2",
                "<炸弹>": "1f4a3",
                "<炸彈>": "1f4a3",
                "<Bomb>": "1f4a3",
                "<手枪>": "1f52b",
                "<手槍>": "1f52b",
                "<Pistol>": "1f52b",
                "<药丸>": "1f48a",
                "<藥丸>": "1f48a",
                "<Pill>": "1f48a",
                "<橄榄球>": "1f3c8",
                "<橄欖球>": "1f3c8",
                "<Football>": "1f3c8",
                "<篮球>": "1f3c0",
                "<籃球>": "1f3c0",
                "<Basketball>": "1f3c0",
                "<足球>": "26bd",
                "<Soccer Ball>": "26bd",
                "<Soccer>": "26bd",
                "<棒球>": "26be",
                "<Baseball>": "26be",
                "<高尔夫>": "26f3",
                "<高爾夫>": "26f3",
                "<Golf>": "26f3",
                "<奖杯>": "1f3c6",
                "<獎盃>": "1f3c6",
                "<Trophy>": "1f3c6",
                "<入侵者>": "1f47e",
                "<Invader>": "1f47e",
                "<唱歌>": "1f3a4",
                "<Singing>": "1f3a4",
                "<吉他>": "1f3b8",
                "<Guitar>": "1f3b8",
                "<比基尼>": "1f459",
                "<Bikini>": "1f459",
                "<皇冠>": "1f451",
                "<Crown>": "1f451",
                "<雨伞>": "1f302",
                "<雨傘>": "1f302",
                "<Umbrella>": "1f302",
                "<手提包>": "1f45c",
                "<Purse>": "1f45c",
                "<口红>": "1f484",
                "<Lipstick>": "1f484",
                "<戒指>": "1f48d",
                "<Ring>": "1f48d",
                "<钻石>": "1f48e",
                "<鑽石>": "1f48e",
                "<Gem>": "1f48e",
                "<咖啡>": "2615",
                "<Coffee>": "2615",
                "<啤酒>": "1f37a",
                "<Beer>": "1f37a",
                "<干杯>": "1f37b",
                "<乾杯>": "1f37b",
                "<Toast>": "1f37b",
                "<鸡尾酒>": "1f377",
                "<雞尾酒>": "1f377",
                "<Martini>": "1f377",
                "<汉堡>": "1f354",
                "<漢堡>": "1f354",
                "<Burger>": "1f354",
                "<薯条>": "1f35f",
                "<薯條>": "1f35f",
                "<Fries>": "1f35f",
                "<意面>": "1f35d",
                "<意粉>": "1f35d",
                "<Sphaghetti>": "1f35d",
                "<寿司>": "1f363",
                "<壽司>": "1f363",
                "<Sushi>": "1f363",
                "<面条>": "1f35c",
                "<麵條>": "1f35c",
                "<Noodles>": "1f35c",
                "<煎蛋>": "1f373",
                "<Eggs>": "1f373",
                "<冰激凌>": "1f366",
                "<雪糕>": "1f366",
                "<Ice Cream>": "1f366",
                "<蛋糕>": "1f382",
                "<Cake>": "1f382",
                "<苹果>": "1f34f",
                "<蘋果>": "1f34f",
                "<Apple>": "1f34f",
                "<飞机>": "2708",
                "<飛機>": "2708",
                "<Plane>": "2708",
                "<火箭>": "1f680",
                "<Rocket ship>": "1f680",
                "<自行车>": "1f6b2",
                "<單車>": "1f6b2",
                "<Bike>": "1f6b2",
                "<高铁>": "1f684",
                "<高鐵>": "1f684",
                "<Bullet Train>": "1f684",
                "<警告>": "26a0",
                "<Warning>": "26a0",
                "<旗>": "1f3c1",
                "<Flag>": "1f3c1",
                "<男人>": "1f6b9",
                "<男>": "1f6b9",
                "<Men>": "1f6b9",
                "<女人>": "1f6ba",
                "<女>": "1f6ba",
                "<Women>": "1f6ba",
                "<O>": "2b55",
                "<X>": "274e",
                "<版权>": "a9",
                "<版權>": "a9",
                "<Copyright>": "a9",
                "<注册商标>": "ae",
                "<注冊商標>": "ae",
                "<Registered TM>": "ae",
                "<商标>": "2122",
                "<商標>": "2122",
                "<Trademark>": "2122"
            },
            EmojiCodeMap: {
                "1f604": "",
                "1f60a": "",
                "1f603": "",
                "263a": "",
                "1f609": "",
                "1f60d": "",
                "1f618": "",
                "1f61a": "",
                "1f633": "",
                "1f63c": "",
                "1f60c": "",
                "1f61c": "",
                "1f445": "",
                "1f612": "",
                "1f60f": "",
                "1f613": "",
                "1f640": "",
                "1f61e": "",
                "1f616": "",
                "1f625": "",
                "1f630": "",
                "1f628": "",
                "1f62b": "",
                "1f622": "",
                "1f62d": "",
                "1f602": "",
                "1f632": "",
                "1f631": "",
                "1f620": "",
                "1f63e": "",
                "1f62a": "",
                "1f637": "",
                "1f47f": "",
                "1f47d": "",
                2764: "",
                "1f494": "",
                "1f498": "",
                2728: "",
                "1f31f": "",
                2755: "",
                2754: "",
                "1f4a4": "",
                "1f4a6": "",
                "1f3b5": "",
                "1f525": "",
                "1f4a9": "",
                "1f44d": "",
                "1f44e": "",
                "1f44a": "",
                "270c": "",
                "1f446": "",
                "1f447": "",
                "1f449": "",
                "1f448": "",
                "261d": "",
                "1f4aa": "",
                "1f48f": "",
                "1f491": "",
                "1f466": "",
                "1f467": "",
                "1f469": "",
                "1f468": "",
                "1f47c": "",
                "1f480": "",
                "1f48b": "",
                2600: "",
                2614: "",
                2601: "",
                "26c4": "",
                "1f319": "",
                "26a1": "",
                "1f30a": "",
                "1f431": "",
                "1f429": "",
                "1f42d": "",
                "1f439": "",
                "1f430": "",
                "1f43a": "",
                "1f438": "",
                "1f42f": "",
                "1f428": "",
                "1f43b": "",
                "1f437": "",
                "1f42e": "",
                "1f417": "",
                "1f435": "",
                "1f434": "",
                "1f40d": "",
                "1f426": "",
                "1f414": "",
                "1f427": "",
                "1f41b": "",
                "1f419": "",
                "1f420": "",
                "1f433": "",
                "1f42c": "",
                "1f339": "",
                "1f33a": "",
                "1f334": "",
                "1f335": "",
                "1f49d": "",
                "1f383": "",
                "1f47b": "",
                "1f385": "",
                "1f384": "",
                "1f381": "",
                "1f514": "",
                "1f389": "",
                "1f388": "",
                "1f4bf": "",
                "1f4f7": "",
                "1f3a5": "",
                "1f4bb": "",
                "1f4fa": "",
                "1f4de": "",
                "1f513": "",
                "1f512": "",
                "1f511": "",
                "1f528": "",
                "1f4a1": "",
                "1f4eb": "",
                "1f6c0": "",
                "1f4b2": "",
                "1f4a3": "",
                "1f52b": "",
                "1f48a": "",
                "1f3c8": "",
                "1f3c0": "",
                "26bd": "",
                "26be": "",
                "26f3": "",
                "1f3c6": "",
                "1f47e": "",
                "1f3a4": "",
                "1f3b8": "",
                "1f459": "",
                "1f451": "",
                "1f302": "",
                "1f45c": "",
                "1f484": "",
                "1f48d": "",
                "1f48e": "",
                2615: "",
                "1f37a": "",
                "1f37b": "",
                "1f377": "",
                "1f354": "",
                "1f35f": "",
                "1f35d": "",
                "1f363": "",
                "1f35c": "",
                "1f373": "",
                "1f366": "",
                "1f382": "",
                "1f34f": "",
                2708: "",
                "1f680": "",
                "1f6b2": "",
                "1f684": "",
                "26a0": "",
                "1f3c1": "",
                "1f6b9": "",
                "1f6ba": "",
                "2b55": "",
                "274e": "",
                a9: "",
                ae: "",
                2122: ""
            },
            EmojiCodeConv: {
                "[Silent]": "[Shutup]",
                "[Angry]": "[Pout]",
                "[Tongue]": "[Wink]",
                "[Surprise]": "[Surprised]",
                "[Ruthless]": "[Cool]",
                "[Blush]": "[Tension]",
                "[Crazy]": "[Scream]",
                "[Commando]": "[Loafer]",
                "[Determined]": "[Strive]",
                "[Shocked]": "[Doubt]",
                "[Tormented]": "[Crazy]",
                "[Toasted]": "[BadLuck]",
                "[Speechless]": "[Relief]",
                "[NosePick]": "[DigNose]",
                "[Pooh-pooh]": "[Lookdown]",
                "[Shrunken]": "[Wronged]",
                "[TearingUp]": "[Puling]",
                "[Wrath]": "[Uh-oh]",
                "[Watermelon]": "[Melon]",
                "[ThumbsUp]": "[Strong]",
                "[ThumbsDown]": "[Weak]",
                "[Peace]": "[Victory]",
                "[Fight]": "[Admire]",
                "[RockOn]": "[Love]",
                "[Nuh-uh]": "[No]",
                "[Dramatic]": "[Lookback]",
                "[JumpRope]": "[Jump]",
                "[Surrender]": "[Give-in]",
                "[Meditate]": "[HeyHey]",
                "[TaiChi L]": "[TaiJi L]",
                "[TaiChi R]": "[TaiJi R]"
            },
            Tuzki2Md5: {
                "icon_001.gif": "44682e637b75a3f5d6747d61dbd23a15",
                "icon_002.gif": "846f30447c5c4c9beefeb5a61bec0ba3",
                "icon_006.gif": "86cb157e9c44b2c9934e4e430790776d",
                "icon_007.gif": "5883b606506766a8733afde516166dad",
                "icon_009.gif": "ea675fef6e28b0244c4577c6d5a2e5c9",
                "icon_010.gif": "b25b5a719caeaca7525dd9d0ef0be4bb",
                "icon_012.gif": "8690f2ec5676b9d2d70f7cba012e772e",
                "icon_013.gif": "5ce1249c690762727b97efa75b685e2b",
                "icon_018.gif": "b51826394461eb67e2ecbdd8900a25d9",
                "icon_019.gif": "a13aac17bb8c649dc7797dd5ad0bf97f",
                "icon_020.gif": "9cf03d450b27e8011bba02a652bc357a",
                "icon_021.gif": "5462d752e528d1635816e38469ce4151",
                "icon_022.gif": "ed18d9a312413ea32838bb4d7bb8317c",
                "icon_024.gif": "3cdca9051658348b5a11ba14dc6a3aca",
                "icon_027.gif": "0e1dcfa77dbbdfe984edd644cfb5da79",
                "icon_028.gif": "3a4dc10bc33c74726f46ba1eacd97391",
                "icon_029.gif": "7590a6e186522063b994eaf8f45673bf",
                "icon_030.gif": "1280edfca8cb1dcf78e44789358e35d6",
                "icon_033.gif": "2c4597ce27b24af08652be6bea644c32",
                "icon_035.gif": "c6345f716d706b8b9df53b0b6fff82cd",
                "icon_040.gif": "ca17f472025f0943917b443faeaee999"
            },
            md52Tuzki: {
                "44682e637b75a3f5d6747d61dbd23a15": "icon_001.gif",
                "846f30447c5c4c9beefeb5a61bec0ba3": "icon_002.gif",
                "86cb157e9c44b2c9934e4e430790776d": "icon_006.gif",
                "5883b606506766a8733afde516166dad": "icon_007.gif",
                ea675fef6e28b0244c4577c6d5a2e5c9: "icon_009.gif",
                b25b5a719caeaca7525dd9d0ef0be4bb: "icon_010.gif",
                "8690f2ec5676b9d2d70f7cba012e772e": "icon_012.gif",
                "5ce1249c690762727b97efa75b685e2b": "icon_013.gif",
                b51826394461eb67e2ecbdd8900a25d9: "icon_018.gif",
                a13aac17bb8c649dc7797dd5ad0bf97f: "icon_019.gif",
                "9cf03d450b27e8011bba02a652bc357a": "icon_020.gif",
                "5462d752e528d1635816e38469ce4151": "icon_021.gif",
                ed18d9a312413ea32838bb4d7bb8317c: "icon_022.gif",
                "3cdca9051658348b5a11ba14dc6a3aca": "icon_024.gif",
                "0e1dcfa77dbbdfe984edd644cfb5da79": "icon_027.gif",
                "3a4dc10bc33c74726f46ba1eacd97391": "icon_028.gif",
                "7590a6e186522063b994eaf8f45673bf": "icon_029.gif",
                "1280edfca8cb1dcf78e44789358e35d6": "icon_030.gif",
                "2c4597ce27b24af08652be6bea644c32": "icon_033.gif",
                c6345f716d706b8b9df53b0b6fff82cd: "icon_035.gif",
                ca17f472025f0943917b443faeaee999: "icon_040.gif"
            }
        };
        return r.TuzkiList = function() {
            var e = []
              , t = r.Tuzki2Md5;
            for (var o in t)
                e.push(o);
            return e
        }(),
        r
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("contextMenuFactory", ["$timeout", "confFactory", function() {
        var e, t = "", o = {
            getContextMenuEventTimeStamp: function() {
                return t
            },
            setContextMenuEvent: function(o) {
                e = o,
                t = o.timeStamp
            },
            getContextMenuEvent: function() {
                return e
            }
        };
        return o
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("screenShotFactory", ["confFactory", "reportService", function(e, t) {
        function o() {
            return l || (l = QMActivex.create(c))
        }
        function n() {
            return u || (u = QMActivex.create(s))
        }
        function r() {
            return o() && o().IsClipBoardImage
        }
        function a() {
            return o() && r() ? o().SaveClipBoardBmpToFile(1) : !1
        }
        function i(o, r) {
            var i = n();
            i.StopUpload(),
            i.ClearHeaders(),
            i.ClearFormItems(),
            i && (i.URL = (MMDEV ? "http://wx.qq.com" : "http://" + location.hostname) + e.API_webwxpreview + "?fun=upload",
            i.AddHeader("Cookie", document.cookie),
            i.AddFormItem("msgimgrequest", 0, 0, o),
            i.AddFormItem("filename", 1, 4, a()),
            i.OnEvent = function(e, o) {
                switch (o) {
                case 2:
                    break;
                case 3:
                    i && (r(JSON.parse(i.Response)),
                    i = null );
                    break;
                case 1:
                    console.error("screensnap upload error"),
                    t.report(t.ReportType.uploaderError, {
                        text: "screensnap upload error",
                        url: i.URL
                    }),
                    r({}),
                    i = null
                }
            }
            ,
            i.StartUpload())
        }
        var c = "screencapture"
          , s = "uploader"
          , l = null
          , u = null ;
        return {
            isSupport: function() {
                return window.QMActivex && QMActivex.isSupport(c) > 0
            },
            install: function() {
                window.open(QMActivex.installUrl.replace(/^https/, "http"))
            },
            capture: function(e) {
                var t = o();
                t && (t.OnCaptureFinished = e.ok),
                t.OnCaptureCanceled = function() {}
                ,
                t.DoCapture()
            },
            isClipBoardImage: function() {
                return r()
            },
            upload: function(e, t) {
                return r() ? (i(e, t),
                !0) : void 0
            }
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("notificationFactory", ["utilFactory", function(e) {
        function t(e, t) {
            var o;
            return window.Notification ? o = new window.Notification(e,{
                icon: angular.isString(t.icon) ? t.icon : t.icon.x32,
                body: t.body || g,
                tag: t.tag || g
            }) : window.webkitNotifications ? (o = window.webkitNotifications.createNotification(t.icon, e, t.body),
            o.show()) : navigator.mozNotification ? (o = navigator.mozNotification.createNotification(e, t.body, t.icon),
            o.show()) : window.external && window.external.msIsSiteMode() && (window.external.msSiteModeClearIconOverlay(),
            window.external.msSiteModeSetIconOverlay(angular.isString(t.icon) ? t.icon : t.icon.x16, e),
            window.external.msSiteModeActivate(),
            o = {
                ieVerification: p + 1
            }),
            o
        }
        function o(e) {
            return {
                close: function() {
                    e && (e.close ? e.close() : e.cancel ? e.cancel() : window.external && window.external.msIsSiteMode() && e.ieVerification === p && window.external.msSiteModeClearIconOverlay())
                }
            }
        }
        function n(e) {
            if (m) {
                var t = angular.isFunction(e) ? e : angular.noop;
                window.webkitNotifications && window.webkitNotifications.checkPermission ? window.webkitNotifications.requestPermission(t) : window.Notification && window.Notification.requestPermission && window.Notification.requestPermission(t)
            }
        }
        function r() {
            var e;
            return m ? (window.Notification && window.Notification.permissionLevel ? e = window.Notification.permissionLevel() : window.webkitNotifications && window.webkitNotifications.checkPermission ? e = f[window.webkitNotifications.checkPermission()] : window.Notification && window.Notification.permission ? e = window.Notification.permission : navigator.mozNotification ? e = l : window.external && void 0 !== window.external.msIsSiteMode() && (e = window.external.msIsSiteMode() ? l : s),
            e) : void 0
        }
        function a(e) {
            return e && angular.isObject(e) && angular.extend(M, e),
            M
        }
        function i() {
            return M.pageVisibility ? document.hidden || document.msHidden || document.mozHidden || document.webkitHidden : !0
        }
        function c(e, n) {
            h.length >= M.total && h.shift().close();
            var a, c;
            return m && i() && angular.isString(e) && n && (angular.isString(n.icon) || angular.isObject(n.icon)) && r() === l && (a = t(e, n)),
            c = o(a),
            h.push(c),
            M.autoClose && a && !a.ieVerification && a.addEventListener && a.addEventListener("show", function() {
                var e = c;
                setTimeout(function() {
                    e.close()
                }, M.autoClose)
            }),
            a
        }
        var s = "default"
          , l = "granted"
          , u = "denied"
          , f = [l, s, u]
          , d = {
            pageVisibility: !1,
            autoClose: 5e3,
            total: 3
        }
          , g = ""
          , m = function() {
            var t = !1;
            try {
                t = !!(window.Notification || window.webkitNotifications || navigator.mozNotification || window.external && void 0 !== window.external.msIsSiteMode())
            } catch (o) {
                e.log("Services.notificationFactory.isSupport error: ", o)
            }
            return t
        }()
          , p = Math.floor(10 * Math.random() + 1)
          , h = []
          , M = d
          , y = {
            PERMISSION_DEFAULT: s,
            PERMISSION_GRANTED: l,
            PERMISSION_DENIED: u,
            isSupported: m,
            config: a,
            createNotification: c,
            permissionLevel: r,
            requestPermission: n
        };
        return angular.isFunction(Object.seal) && Object.seal(y),
        y
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("resourceService", ["$timeout", "$http", "$q", "$window", function(e, t, o, n) {
        function r(t, o, n) {
            if (t instanceof Array || (t = [t]),
            !(t.length > 0))
                return void e(n, 0);
            o = o || {};
            for (var r, i = o.priority ? c : s, u = l.push({
                callback: n || function() {}
                ,
                taskNum: t.length,
                combo: o.combo,
                result: {}
            }) - 1, f = 0; f < t.length; f++)
                r = t[f],
                r._cbKey = u,
                r._resultKey = r.key || r.url,
                i.push(r);
            a()
        }
        function a() {}
        var i = !1;
        $(n).on("load", function() {
            i = !0,
            a()
        });
        var c = []
          , s = []
          , l = []
          , u = {
            load: r
        };
        return u
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("stateManageService", ["$http", "$q", function() {
        function e(e) {
            if ("object" == typeof e)
                for (var n in e)
                    o[n] !== e[n] && t(n, e[n]),
                    o[n] = e[n]
        }
        function t(e, t) {
            var o = n[e];
            if (o)
                for (var r = 0; r < o.length; r++)
                    o[r](t)
        }
        var o = {
            "sender:hasText": !1,
            "sender:active": !1,
            "navChat:active": !1,
            "navContact:active": !1,
            "contactPicker:active": !1,
            "dialog:open": !1
        }
          , n = {}
          , r = {
            "navChat:active": {
                "navContact:active": !1,
                "navRead:active": !1
            },
            "navRead:active": {
                "navChat:active": !1,
                "navContact:active": !1
            },
            "navContact:active": {
                "navChat:active": !1,
                "navRead:active": !1
            }
        }
          , a = {
            navKeydown: function() {
                return !o["sender:hasText"] && !o["contactPicker:active"]
            },
            pasteFile: function() {
                return !o["dialog:open"]
            }
        }
          , i = {}
          , c = {
            change: function(n, a) {
                var i, c = r[n], s = a.toString();
                c && (i = c["false"] || c["true"] ? c[s] : "true" == s ? c : void 0),
                o[n] !== a && t(n, a),
                o[n] = a,
                e(i)
            },
            canDo: function(e) {
                return a[e]()
            },
            on: function(e, r) {
                n[e] || (n[e] = []);
                var a = o[e];
                "undefined" != typeof a && t(e, a),
                n[e].push(r)
            },
            off: function(e, t) {
                var o, r = n[e];
                if (r)
                    for (var a = 0; a < r.length; a++)
                        if (o = r[a],
                        o == t)
                            return void r.splice(a, 1)
            },
            data: function(e, t) {
                return 2 === arguments.length && (i[e] = t),
                i[e]
            }
        };
        return c
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("oplogFactory", ["$http", "accountFactory", "confFactory", function(e, t, o) {
        return {
            feedback: function(n) {
                e({
                    method: "POST",
                    url: o.API_webwxfeedback,
                    data: angular.extend(t.getBaseRequest(), {
                        MachineType: "webwx",
                        Content: n,
                        ReportType: 0
                    })
                })
            }
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("reportService", ["$http", "$rootScope", "confFactory", "accountFactory", function(e, t, o, n) {
        function r() {
            var e, t = {};
            return t.appTiming = N,
            window.performance && (e = window.performance.timing) && (t.pageTiming = e),
            t
        }
        function a(e) {
            e.needSend ? (p({
                Type: 1,
                Text: JSON.stringify({
                    type: T.timing,
                    data: r()
                })
            }, !0),
            P = !0,
            f()) : e.fullTiming ? p({
                Type: 1,
                Text: JSON.stringify({
                    type: T.timing,
                    data: e.fullTiming
                })
            }, !0) : $.extend(N, e.timing)
        }
        function i(e) {
            return {
                message: e.message,
                stack: e.stack && e.stack.replace(/\n/g, "\\n"),
                other: e.other
            }
        }
        function c(e) {
            return e
        }
        function s(e, t) {
            var o = E[e]
              , n = t;
            "function" == typeof o ? n = o(t) : "string" == typeof o && (n = c(o, t));
            var r = JSON.stringify({
                type: e,
                data: n
            });
            return r
        }
        function l() {
            var e = JSON.parse(b.getItem(S));
            if (e && e.length > 0) {
                for (var t = 0; t < e.length; t++)
                    u(e[t].type, e[t].data);
                b.setItem(S, null )
            }
        }
        function u(e, t, o) {
            if (void 0 == typeof e)
                return void console.error("【report】", "report type 不存在：", e, t);
            if (e == T.timing)
                return void a(t);
            var n, r = o || !1;
            e.indexOf("-error") > 0 ? (r = !0,
            n = {
                Type: 2,
                Text: s(e, t)
            }) : n = {
                Type: 1,
                Text: s(e, t)
            },
            p(n, r)
        }
        function f() {
            for (var e = [0, 15e3, 6e5], o = 0; o < e.length; o++)
                setTimeout(function(e) {
                    return function() {
                        w[e] = m(t)
                    }
                }(e[o]), e[o])
        }
        function d() {
            $(window).unload(function() {
                w.unload = m(t),
                v.push({
                    type: T.runtime,
                    data: w
                }),
                !P && v.push({
                    type: T.timing,
                    data: {
                        fullTiming: r()
                    }
                }),
                localStorage.setItem(S, JSON.stringify(v))
            })
        }
        function g() {
            var e, t = window.localStorage;
            return e = t ? {
                setItem: function() {
                    try {
                        t.setItem.apply(t, arguments)
                    } catch (e) {
                        console.log("localStory 不能使用")
                    }
                },
                getItem: function() {
                    try {
                        return t.getItem.apply(t, arguments)
                    } catch (e) {
                        console.log("localStory 不能使用")
                    }
                }
            } : {
                setItem: function() {},
                getItem: function() {}
            }
        }
        function m(e, t) {
            t || (t = {
                listenerCount: 0,
                watchersCount: 0,
                scopesCount: 0
            });
            for (var o = e.$$childHead; o; )
                m(o, t),
                o = o.$$nextSibling;
            var n = e.$$listenerCount;
            for (var r in n)
                t.listenerCount += n[r];
            return t.watchersCount += e.$$watchers && e.$$watchers.length,
            t.scopesCount += 1,
            t
        }
        function p(e, t) {
            _.push(e),
            t ? h() : (y && clearTimeout(y),
            y = setTimeout(function() {
                h()
            }, C))
        }
        function h() {
            var e = _.splice(0);
            M(e)
        }
        function M(t) {
            e({
                method: "POST",
                url: o.API_webwxreport + "?fun=new",
                data: {
                    BaseRequest: {
                        Uin: n.getUin(),
                        Sid: n.getSid()
                    },
                    Count: t.length,
                    List: t
                }
            }).success(function(e) {
                console.log(e)
            }).error(function(e) {
                console.log(e)
            })
        }
        var y, C = 3e3, _ = [], v = [], w = {}, S = "reportService", b = g(), T = {
            jsError: "[js-error]",
            initError: "[init-error]",
            logicError: "[logic-error]",
            uploaderError: "[uploader-error]",
            netError: "[net-error]",
            imageLoadError: "[image-load-error]",
            picError: "[pic-error]",
            cookieError: "[cookie-error]",
            timing: "[app-timing]",
            runtime: "[app-runtime]",
            contactReady: "[contact-ready-time]",
            initReady: "[init-ready-time]",
            actionRecord: "[action-record]",
            WinAdPV: "[win-ad-pv]",
            click2CloseAd: "[click-to-close-ad]",
            clickAndCloseAd: "[click-and-close-ad]"
        }, E = {};
        E[T.jsError] = i,
        l(),
        d();
        var N = {}
          , P = !1;
        window._errorHandler = function(e) {
            u(T.jsError, e)
        }
        ;
        var A = {
            report: u,
            ReportType: T
        };
        return A
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("mmHttp", ["$http", "$q", "$timeout", function(e, t, o) {
        function n(n) {
            function r(t, n) {
                e[t].apply(e, n).success(i).error(c),
                o(function() {
                    l.complete || s()
                }, g)
            }
            function a(e, t, o) {
                for (var n = 0; n < e.length; n++)
                    e[n].apply(t, o)
            }
            function i() {
                C++,
                l.complete || (l.complete = !0,
                y.resolve(),
                a(p, this, arguments))
            }
            function c() {
                C++,
                s() || l.complete || C != d + 1 || a(h, this, arguments)
            }
            function s() {
                return M >= d || l.complete ? !1 : (m && (y.resolve(),
                y = t.defer(),
                u.timeout = y.promise),
                M++,
                r(n.method, n.args),
                !0)
            }
            var l = n.data
              , u = n.config
              , f = u.MMRetry
              , d = "undefined" == typeof f.count ? 3 : f.count
              , g = f.timeout || 15e3
              , m = f.serial
              , p = []
              , h = []
              , M = 0
              , y = t.defer()
              , C = 0;
            return u.timeout = y.promise,
            r(n.method, n.args),
            {
                success: function(e) {
                    return p.push(e),
                    this
                },
                error: function(e) {
                    return h.push(e),
                    this
                }
            }
        }
        for (var r, a = function(e) {
            var t = e.method ? e.method.toLowerCase() : "get"
              , o = e.url
              , n = e.data
              , r = [o];
            return n && r.push(n),
            r.push(e),
            a[t].apply(a, r)
        }
        , i = ["post", "get", "jsonp"], c = 0; c < i.length; c++)
            r = i[c],
            a[r] = function(t) {
                return function(o) {
                    var r, a, i = [o];
                    "post" == t ? (r = arguments[1],
                    a = arguments[2]) : a = arguments[1];
                    var c;
                    r && i.push(r),
                    a && (c = "undefined" != typeof a.MMRetry,
                    i.push(a));
                    var s;
                    return s = c ? n({
                        args: i,
                        method: t,
                        config: a,
                        data: {
                            complete: !1
                        }
                    }) : e[t].apply(e, i)
                }
            }(r);
        return a
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("surviveCheckService", ["$http", "$q", "$timeout", function() {
        var e, t, o = {
            start: function(o) {
                e && clearInterval(e),
                e = setInterval(function() {
                    t && t()
                }, o)
            },
            stop: function() {
                e && clearInterval(e)
            },
            callback: function(e) {
                t = e
            }
        };
        return o
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("titleRemind", ["$window", function(e) {
        function t(e, t) {
            function o() {
                n[r] ? e() : t()
            }
            var r, a;
            "undefined" != typeof n.hidden ? (r = "hidden",
            a = "visibilitychange") : "undefined" != typeof n.mozHidden ? (r = "mozHidden",
            a = "mozvisibilitychange") : "undefined" != typeof n.msHidden ? (r = "msHidden",
            a = "msvisibilitychange") : "undefined" != typeof n.webkitHidden && (r = "webkitHidden",
            a = "webkitvisibilitychange"),
            "undefined" == typeof n.addEventListener || "undefined" == typeof r ? ($(window).focus(function() {
                t()
            }),
            $(window).blur(function() {
                e()
            })) : n.addEventListener(a, o, !1)
        }
        var o = !0
          , n = e.document
          , r = {
            defaultTitle: MM.context("2f521c5"),
            unreadMsgNum: 0,
            start: function() {
                var e = this;
                this.unreadMsgNum = 0,
                this.timer && clearTimeout(this.timer),
                this.timer = setTimeout(function t() {
                    e._toggle(),
                    e.timer = setTimeout(t, 2e3)
                }, 2e3)
            },
            _toggle: function() {
                n.title = n.title == this.defaultTitle && this.unreadMsgNum > 0 ? MM.context("cfbf6f4") + "(" + this.unreadMsgNum + ")" : this.defaultTitle
            },
            stop: function() {
                var e = this;
                this.timer && clearTimeout(this.timer),
                setTimeout(function() {
                    n.title = e.defaultTitle
                }, 100)
            },
            increaseUnreadMsgNum: function() {
                o || this.unreadMsgNum++
            }
        };
        t(function() {
            o = !1,
            r.start()
        }, function() {
            o = !0,
            r.stop()
        });
        var a = {
            increaseUnreadMsgNum: function() {
                r.increaseUnreadMsgNum()
            }
        };
        return a
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Services").factory("subscribeMsgService", ["$rootScope", "contactFactory", "accountFactory", "confFactory", "utilFactory", function(e, t, o, n, r) {
        var a = []
          , i = {
            current: null ,
            changeFlag: 0,
            init: function(e) {
                this.changeFlag = Date.now(),
                this.add(e)
            },
            getSubscribeMsgs: function() {
                return a
            },
            add: function(e) {
                e.length > 0 && (this.changeFlag = Date.now());
                for (var t = 0, n = e.length; n > t; t++) {
                    var i = e[t];
                    i.HeadImgUrl = i.HeadImgUrl = r.getContactHeadImgUrl({
                        UserName: i.UserName,
                        Skey: o.getSkey()
                    });
                    for (var c = i.MPArticleList, s = 0; s < c.length; s++) {
                        var l = c[s];
                        l.AppName = i.NickName,
                        /dev\.web\.weixin/.test(location.href) || (l.Url = l.Url.replace(/^http:\/\//, "https://"))
                    }
                    a.push(i)
                }
            }
        };
        return i
    }
    ])
}(),
angular.module("Directives", []),
!function() {
    "use strict";
    angular.module("Directives").directive("messageDirective", ["$timeout", "confFactory", function() {
        return {
            restrict: "A",
            templateUrl: "message.html",
            link: function() {}
        }
    }
    ])
}(),
angular.module("Directives").directive("ngInput", ["$parse", function(e) {
    return function(t, o, n) {
        var r = e(n.ngInput);
        o.bind("input propertychange", function(e) {
            t.$$phase ? r(t, {
                $event: e
            }) : t.$apply(function() {
                r(t, {
                    $event: e
                })
            })
        })
    }
}
]),
angular.module("Directives").directive("ngRightClick", ["$parse", function(e) {
    return function(t, o, n) {
        var r = e(n.ngRightClick);
        o.bind("contextmenu", function(e) {
            t.$apply(function() {
                r(t, {
                    $event: e
                })
            })
        })
    }
}
]),
angular.module("Directives").directive("mmpopDirective", ["$timeout", "$document", "mmpop", "$animate", function() {
    return {
        restrict: "EA",
        scope: {},
        link: function() {}
    }
}
]).provider("mmpop", function() {
    var e = angular.element
      , t = (angular.isDefined,
    (document.body || document.documentElement).style,
    this.defaults = {
        className: "",
        plain: !1,
        showClose: !0,
        closeByEscape: !0,
        cache: !0,
        autoFoucs: !0,
        stopPropagation: !0
    });
    this.setDefaults = function(e) {
        angular.extend(t, e)
    }
    ;
    var o = 0
      , n = 0
      , r = {};
    this.$get = ["$document", "$templateCache", "$compile", "$q", "$http", "$rootScope", "$timeout", "$window", "$controller", "$animate", function(a, i, c, s, l, u, f, d, g, m) {
        var p = a.find("body")
          , h = {
            onDocumentKeydown: function(e) {
                27 === e.keyCode && M.close("$escape")
            },
            performClosePop: function(e, t) {
                var o = e.attr("id")
                  , i = e.scope();
                i && !i.closing && (i.closing = !0,
                e.unbind("click"),
                1 === n && p.unbind("keydown"),
                u.$broadcast("root:mmpop:closing", o),
                m.leave(e, function() {
                    i && (u.$broadcast("root:mmpop:closed", o),
                    a.unbind("click", i.closeThisMmPop),
                    i.$destroy())
                }),
                r[o] && (r[o].resolve({
                    id: o,
                    value: t,
                    $pop: e,
                    remainingPops: n
                }),
                delete r[o]))
            },
            closePop: function(e, t) {
                h.performClosePop(e, t)
            }
        }
          , M = {
            open: function(l) {
                var d = this
                  , y = angular.copy(t);
                l = l || {},
                angular.extend(y, l),
                o += 1,
                d.latestID = "ngpop" + o,
                y.singletonId && document.getElementById(y.singletonId) && M.close(y.singletonId);
                var C = y.singletonId || "mmpop" + o;
                u.$broadcast("root:mmpop:open", C);
                var _;
                r[d.latestID] = _ = s.defer();
                var v;
                y.scope ? y.scope.$new ? v = y.scope.$new() : (v = u.$new(),
                angular.extend(v, y.scope)) : v = u.$new();
                var w, S;
                if (y.template ? template = y.template : y.templateUrl && (template = i.get(y.templateUrl)),
                d.$result = w = e('<div id="' + C + '" class="mmpop" tabindex="-1"></div>'),
                w.html(template),
                y.data && angular.isString(y.data)) {
                    var b = y.data.replace(/^\s*/, "")[0];
                    v.mmpopData = "{" === b || "[" === b ? angular.fromJson(y.data) : y.data
                } else
                    y.data && angular.isObject(y.data) && (v.mmpopData = y.data);
                return S = y.container ? y.container : p,
                c(w)(v),
                m.enter(w, S),
                y.autoFoucs && w.focus(),
                y.controller && (angular.isString(y.controller) || angular.isArray(y.controller) || angular.isFunction(y.controller)) && g(y.controller, {
                    $scope: v,
                    $element: w
                }),
                y.className && w.addClass(y.className),
                y.top && w.css("top", y.top),
                y.left && w.css("left", y.left),
                v.closeThisMmPop = function(e) {
                    setTimeout(function() {
                        e && e.target && (e.target.id == C || w[0] && jQuery.contains(w[0], e.target)) || (h.closePop(w, e),
                        v.$digest())
                    }, 0)
                }
                ,
                w.bind("click", function(e) {
                    y.stopPropagation && (e.preventDefault(),
                    e.stopPropagation())
                }),
                f(function() {
                    a.bind("click", v.closeThisMmPop)
                }, 0),
                y.closeByEscape && p.bind("keydown", h.onDocumentKeydown),
                n += 1,
                {
                    close: v.closeThisMmPop,
                    isOpen: function() {
                        return e(document.getElementById(C)).length
                    }
                }
            },
            toggleOpen: function(e) {
                if (!e.singletonId)
                    return void console.error("toggleOpen function require singletonId.");
                var t = document.getElementById(e.singletonId);
                t || this.open(e)
            },
            close: function(t, o) {
                var n = e(document.getElementById(t));
                return n.length ? h.closePop(n, o) : M.closeAll(o),
                M
            },
            closeAll: function(t) {
                var o = document.querySelectorAll(".mmpop");
                angular.forEach(o, function(o) {
                    h.closePop(e(o), t)
                })
            }
        };
        return M
    }
    ]
}),
angular.module("Directives").directive("contenteditableDirective", ["$timeout", "utilFactory", "confFactory", function(e, t, o) {
    return {
        restrict: "A",
        require: "?ngModel",
        link: function(e, n, r, a) {
            function i(e) {
                return e.replace(new RegExp("^(<(table|tbody|p|tr|h[1-6])[^<>]*>)+","g"), "").replace(new RegExp("<td[^<>]*>(<(table|tbody|p|tr|h[1-6])[^<>]*>)*|(</(table|tbody|p|h[1-6])>)*</td>","g"), "  ").replace(new RegExp("(</(table|tbody|p|tr|h[1-6])>+)<(table|tbody|p|tr|h[1-6])[^<>]*>+","g"), "<br/>").replace(new RegExp("(<(table|tbody|p|tr|h[1-6])[^<>]*>)+|(</(table|tbody|p|tr|h[1-6])>)+","g"), "<br/>")
            }
            function c() {
                e.$apply(function() {
                    var e;
                    e = n.html(),
                    a.$setViewValue(e)
                })
            }
            if (a) {
                var s;
                n.bind("paste", function() {
                    var e = this
                      , r = e.innerHTML;
                    s && clearTimeout(s),
                    s = setTimeout(function() {
                        for (var c = e.innerHTML, l = -1, u = -1, f = 0, d = c.length; d > f && (-1 == l && r.substr(f, 1) != c.substr(f, 1) && (l = f),
                        -1 == u && r.substr(r.length - f - 1, 1) != c.substr(c.length - f - 1, 1) && (u = f),
                        !(-1 != l && -1 != u || l >= d - 1 - u)); ++f)
                            ;
                        if (-1 != l && -1 != u) {
                            if (u = d - 1 - u,
                            l >= u) {
                                f = l;
                                for (var g = r.substr(f + 1, 10); ++f < d; )
                                    if (g == c.substr(f, g.length)) {
                                        u = f;
                                        break
                                    }
                                f == d && (u = d - 1)
                            }
                            "<" == c.substr(l - 1, 1) && --l,
                            ">" == c.substr(u + 1, 1) && ++u;
                            var m = c.substring(l, u + 1)
                              , p = c.substr(0, l)
                              , h = c.substr(l + m.length)
                              , M = p.lastIndexOf("<")
                              , y = p.lastIndexOf(">");
                            if (M > y && (m = p.slice(M) + m,
                            p = p.slice(0, M)),
                            M = m.lastIndexOf("<"),
                            y = m.lastIndexOf(">"),
                            M > y) {
                                var C = h.indexOf(">") + 1;
                                m += h.slice(0, C),
                                h = h.slice(C)
                            }
                            var _ = i(m).replace(/&nbsp;/g, " ").replace(new RegExp("<(?!br|" + o.EMOTICON_REG + ").*?>","g"), "").replace(new RegExp("&lt;(br|" + o.EMOTICON_REG + "/?)&gt;","g"), "<$1>").replace(/<img.*?class="(.*?)" text="(.*?)" .*?>/g, function() {
                                return t.genEmoticonHTML(arguments[1], arguments[2])
                            }).replace(/<img [^<>]*src="([^<>"]+)"[^<>]*>/g, function(e) {
                                return e.replace(location.origin || location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : ""), "")
                            });
                            e.innerHTML = p + _ + "<span class='pasteCaretPosHelper'></span>" + h;
                            var v, w, S = n.find(".pasteCaretPosHelper")[0];
                            S && (document.createRange ? (v = document.createRange(),
                            v.setStartAfter(S),
                            v.collapse(!1),
                            w = window.getSelection(),
                            w.removeAllRanges(),
                            w.addRange(v)) : document.selection && (v = document.body.createTextRange(),
                            v.moveToElementText(S),
                            v.collapse(!1),
                            v.select()),
                            S.parentNode.removeChild(S)),
                            a.$setViewValue(p + _ + h),
                            s = null
                        }
                    }, 50)
                }),
                t.browser.msie ? n.bind("keyup paste", c) : n.bind("input", c);
                var l = a.$render;
                a.$render = function() {
                    l && l(),
                    n.html() != a.$viewValue && n.html(a.$viewValue || "")
                }
            }
        }
    }
}
]),
!function() {
    "use strict";
    angular.module("Directives").directive("miniUserProfileDirective", ["$timeout", "confFactory", function() {
        return {
            restrict: "A",
            templateUrl: "miniUserProfile.html",
            scope: {
                user: "=",
                showOrderc: "=",
                hasCheckbox: "=",
                selectedUsers: "=",
                clickUserCallback: "="
            },
            link: function() {}
        }
    }
    ]).directive("userProfileDirective", ["$timeout", "confFactory", function() {
        return {
            restrict: "A",
            scope: {
                user: "="
            },
            templateUrl: "userProfile.html",
            link: function() {}
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Directives").directive("contactListDirective", ["$timeout", "confFactory", function() {
        return {
            restrict: "A",
            templateUrl: "contactList.html",
            replace: !0,
            scope: {
                currentContact: "=",
                starContacts: "=",
                chatroomContacts: "=",
                friendContacts: "=",
                clickUserCallback: "=",
                allContacts: "=",
                dblclickCallback: "=",
                heightCalc: "=?"
            },
            link: function(e) {
                console.log("allContact", e.allContacts),
                e.heightCalc = e.heightCalc || function(e) {
                    return "header" === e.type ? 24 : 50
                }
            }
        }
    }
    ]).directive("contactListChooserDirective", ["$timeout", "confFactory", function() {
        return {
            restrict: "A",
            templateUrl: "contactListChooser.html",
            replace: !0,
            scope: {
                starContacts: "=",
                chatroomContacts: "=",
                friendContacts: "=",
                selectedUsers: "=",
                isCheck: "=",
                allContacts: "=",
                clickUserCallback: "="
            },
            link: function(e) {
                e.heightCalc = function(e) {
                    return "header" === e.type ? 32 : 62
                }
                ,
                e.mmRepeatKeyboard.start(),
                e.$watch(function() {
                    return e.allContacts
                }, function(t) {
                    !e.current && t.length > 0 && (e.current = e.allContacts[0],
                    e.mmRepeatKeyboard.setSelectItem(e.current))
                }),
                e.mmRepeatKeyboard.setJudgeFun(function(e) {
                    return e.UserName
                }),
                e.$on("mmrepeat:select", function(t, o) {
                    e.current = o,
                    e.$digest()
                })
            }
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Directives").directive("contactItemDirective", ["$timeout", "confFactory", function() {
        return {
            restrict: "A",
            templateUrl: "contactItem.html",
            replace: !0,
            scope: {
                className: "@",
                user: "=",
                showOrderSymbol: "=",
                orderSymbol: "=",
                clickUserCallback: "="
            },
            link: function() {}
        }
    }
    ]).directive("contactItemChooserDirective", ["$timeout", "confFactory", function() {
        return {
            restrict: "A",
            templateUrl: "contactItemChooser.html",
            scope: {
                user: "=",
                showOrderSymbol: "=",
                orderSymbol: "=",
                isCheck: "=",
                clickUserCallback: "="
            },
            link: function() {}
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Directives").directive("contextMenuDirective", ["$timeout", "$document", "confFactory", function() {
        return {
            restrict: "A",
            templateUrl: "contextMenu.html",
            replace: !0,
            scope: {},
            controller: "contextMenuController",
            link: function() {}
        }
    }
    ])
}(),
!function(e, t) {
    "use strict";
    e.module("Directives").directive("scrollGlue", ["$parse", "$timeout", function(e, o) {
        function n(e) {
            var t = e;
            return {
                getValue: function() {
                    return t
                },
                setValue: function(e) {
                    t = e
                }
            }
        }
        function r(e, t) {
            return {
                getValue: function() {
                    return e(t)
                },
                setValue: function() {}
            }
        }
        function a(e, t, o) {
            return {
                getValue: function() {
                    return e(o)
                },
                setValue: function(n) {
                    n !== e(o) && o.$apply(function() {
                        t(o, n)
                    })
                }
            }
        }
        function i(o, i) {
            if ("" !== o) {
                var c = e(o);
                return c.assign !== t ? a(c, c.assign, i) : r(c, i)
            }
            return n(!0)
        }
        return {
            priority: 1,
            restrict: "A",
            link: function(e, t, n) {
                function r() {
                    l.scrollTop = l.scrollHeight
                }
                function a() {
                    console.log("scrollTobottom", u.getValue()),
                    u.getValue() && r()
                }
                function c() {
                    return console.log(l.scrollTop, l.clientHeight, l.scrollHeight),
                    l.scrollTop + l.clientHeight + 1 >= l.scrollHeight
                }
                function s() {
                    o(function() {
                        u.setValue(c())
                    }, 3)
                }
                var l = t[0]
                  , u = i(n.scrollGlue, e);
                e.$watch(a),
                t.bind("scroll", s)
            }
        }
    }
    ])
}(angular),
!function(e) {
    "use strict";
    angular.module("Directives").directive("jplayerDirective", ["$timeout", "utilFactory", function(t, o) {
        return {
            restrict: "A",
            link: function(n, r, a) {
                function i() {
                    require.async(["jplayer"], function() {
                        jQuery(r).jPlayer({
                            ready: function() {
                                jQuery(this).jPlayer("setMedia", {
                                    m4v: a.src + (f ? "&type=flv" : ""),
                                    poster: a.poster
                                }),
                                a.muted !== e && jQuery(this).jPlayer("mute"),
                                a.loop !== e && f && (jQuery(this).jPlayer("play"),
                                c())
                            },
                            click: function() {
                                o.browser.msie && jQuery(this).click()
                            },
                            loadstart: function() {
                                console.log("loadstart ")
                            },
                            progress: function() {
                                console.log("progress ")
                            },
                            play: function() {
                                f && (n.loaded = !0,
                                n.$digest()),
                                console.log("play ")
                            },
                            loadedmetadata: function() {
                                jQuery(this).jPlayer("play"),
                                console.log("loadedmetadata ")
                            },
                            playing: function() {
                                n.loaded = !0,
                                n.$digest(),
                                console.log("playing ")
                            },
                            seeked: function() {
                                console.log("seeked  ")
                            },
                            seeking: function() {
                                console.log("seeking ")
                            },
                            swfPath: window.MMSource.jplayerSwfPath,
                            solution: f ? "flash" : "html,flash",
                            supplied: "webmv, ogv, m4v",
                            backgroundColor: "#000000",
                            loop: a.loop !== e,
                            size: {
                                width: n.width || "200px",
                                height: n.height || "150px",
                                cssClass: "jp-video-360p"
                            }
                        }),
                        n.$on("$destroy", function() {
                            s(),
                            jQuery(r).jPlayer("destroy")
                        })
                    })
                }
                function c() {
                    s(),
                    l = t(function() {
                        jQuery(r).jPlayer("stop"),
                        jQuery(r).jPlayer("play"),
                        c()
                    }, u)
                }
                function s() {
                    l && t.cancel(l)
                }
                n.loaded = !1;
                var l, u = a.lenght || 6100, f = o.browser.msie || o.browser.safari;
                a.timeout ? setTimeout(function() {
                    i()
                }, +a.timeout) : i()
            }
        }
    }
    ])
}(),
angular.module("Directives").directive("previewDirective", ["$document", "confFactory", "utilFactory", function(e, t, o) {
    return {
        restrict: "EA",
        templateUrl: "preview.html",
        scope: {
            imageList: "=",
            current: "="
        },
        link: function(n, r) {
            function a(e) {
                switch (e.keyCode) {
                case t.KEYCODE_ARROW_UP:
                case t.KEYCODE_ARROW_LEFT:
                    n.actions.prev();
                    break;
                case t.KEYCODE_ARROW_DOWN:
                case t.KEYCODE_ARROW_RIGHT:
                    n.actions.next();
                    break;
                case t.KEYCODE_ESC:
                    n.actions.close()
                }
                n.$digest(),
                e.preventDefault(),
                e.stopPropagation()
            }
            function i(e) {
                switch (e.keyCode) {
                case t.KEYCODE_NUM_ADD:
                case t.KEYCODE_ADD:
                    c({
                        delta: 1
                    });
                    break;
                case t.KEYCODE_NUM_MINUS:
                case t.KEYCODE_MINUS:
                    c({
                        delta: -1
                    })
                }
                e.preventDefault(),
                e.stopPropagation()
            }
            function c(e) {
                var t, o;
                if (e.scale)
                    t = e.scale,
                    o = {
                        x: .5,
                        y: .5
                    };
                else {
                    var n = e.delta;
                    o = e.posRatio || {
                        x: .5,
                        y: .5
                    },
                    t = y.scale,
                    t = n > 0 ? t + S : t - S
                }
                t = t > w ? w : 1 / w > t ? 1 / w : t;
                var r = {
                    width: Math.round(M.width * t),
                    height: Math.round(M.height * t),
                    scale: t
                };
                r.top = Math.round(y.top - o.y * (r.height - y.height)),
                r.left = Math.round(y.left - o.x * (r.width - y.width)),
                y = r,
                d.css(r)
            }
            function s(e) {
                angular.extend(y, e),
                d.css(e)
            }
            function l(e) {
                s({
                    top: e.clientY - C.y + v.top,
                    left: e.clientX - C.x + v.left
                }),
                e.preventDefault()
            }
            function u() {
                d.on("mousedown", function(e) {
                    return N ? void n.actions.close() : (C = {
                        x: e.clientX,
                        y: e.clientY
                    },
                    v = {
                        top: y.top,
                        left: y.left
                    },
                    g.css("display", "none"),
                    d.on("mousemove", l),
                    void e.stopPropagation())
                }).on("mouseup", function() {
                    d.off("mousemove", l),
                    g.css("display", "block")
                }).on(P, function(e) {
                    var t, o = e.originalEvent;
                    ("mousewheel" == o.type || "DOMMouseScroll" == o.type) && (t = o.wheelDelta ? o.wheelDelta / 120 : -(o.detail || 0) / 3),
                    void 0 !== t && (c(N ? {
                        delta: t
                    } : {
                        delta: t,
                        posRatio: {
                            x: o.offsetX / y.width,
                            y: o.offsetY / y.height
                        }
                    }),
                    e.preventDefault(),
                    e.stopPropagation())
                }),
                e.keydown(i)
            }
            function f() {
                var e = n.imageList[n.current].preview;
                n.isLoaded = !1,
                n.rotateDeg = 0,
                e && (n.containerStyle = {
                    background: "url(" + e + ") no-repeat center center",
                    "background-size": "auto"
                });
                var t = new Image;
                t.onload = function() {
                    t.onload = null ,
                    M = {
                        width: t.width,
                        height: t.height
                    },
                    y = {
                        width: M.width,
                        height: M.height,
                        top: (h - M.height) / 2,
                        left: (p - M.width) / 2,
                        scale: 1
                    };
                    var e = T / t.height
                      , o = b / t.width;
                    1 > e && 1 > o ? c({
                        scale: o > e ? e : o
                    }) : 1 > e ? c({
                        scale: e
                    }) : 1 > o ? c({
                        scale: o
                    }) : d.css(y),
                    angular.extend(E, y),
                    m[0].src = t.src,
                    n.isLoaded = !0,
                    n.containerStyle = null ,
                    n.$digest()
                }
                ,
                t.onerror = function() {
                    t.onerror = null ,
                    alert(MM.context("845ec73"))
                }
                ,
                t.src = n.imageList[n.current].url
            }
            var d = r.find("#img_dom")
              , g = r.find("#img_opr_container")
              , m = d.find("#img_preview")
              , p = document.documentElement.clientWidth
              , h = document.documentElement.clientHeight - parseInt(g.css("bottom")) - parseInt(g.height());
            n.isLoaded = !1,
            n.rotateDeg = 0,
            n.isIE = !!(o.browser.msie && o.version < 10),
            n.actions = {
                next: function() {
                    n.current < n.imageList.length - 1 && (n.current++,
                    f())
                },
                prev: function() {
                    n.current > 0 && (n.current--,
                    f())
                },
                rotate: function() {
                    n.rotateDeg = (n.rotateDeg + 90) % 360,
                    c({
                        scale: E.scale
                    }),
                    s({
                        top: (h - y.height) / 2,
                        left: (p - y.width) / 2
                    }),
                    n.reflowFlag = !n.reflowFlag
                },
                close: function() {
                    r.remove(),
                    n.$destroy()
                }
            },
            n.$on("$destroy", function() {
                e.unbind("keyup", a),
                e.unbind("keydown", i)
            }),
            e.keyup(a);
            var M, y, C, v, w = 5, S = .1, b = .8 * p, T = .8 * h, E = {}, N = void 0 !== document.mozHidden, P = N ? "DOMMouseScroll" : "mousewheel";
            d.on("click", function(e) {
                e.stopPropagation()
            }),
            g.on("click", function(e) {
                e.stopPropagation()
            }),
            $("#preview_container").on("click", function() {
                n.actions.close()
            }),
            u(),
            f()
        }
    }
}
]).provider("preview", function() {
    return {
        $get: ["$rootScope", "$document", "$compile", function(e, t, o) {
            var n = {
                open: function(r) {
                    if (!r.imageList || r.imageList.length <= 0)
                        return !1;
                    n.instance && (n.instance.close(),
                    n.instance = null );
                    var a = {};
                    n.isOpen = !0,
                    r = r || {},
                    angular.extend(a, r);
                    var i;
                    i = e.$new(),
                    angular.extend(i, {
                        imageList: r.imageList,
                        current: r.current
                    });
                    var c = angular.element('<div preview-directive class="J_Preview" current="current" image-list="imageList"></div>')
                      , s = o(c)(i)
                      , l = t.find("body").eq(0);
                    l.append(s);
                    var u = {
                        close: function() {
                            var e = s.scope();
                            e && e.$destroy(),
                            s.remove()
                        }
                    };
                    return n.instance = u,
                    u
                }
            };
            return n
        }
        ]
    }
}),
angular.module("Directives").directive("mmlazyDirective", function() {
    return {
        restrict: "A",
        link: function(e, t) {
            var o = "scrollLazyload"
              , n = function() {
                $("img.lazy").lazyload({
                    container: t,
                    event: o
                })
            }
            ;
            n()
        }
    }
}).directive("mmlazyWithScrollbarDirective", function(e) {
    return {
        restrict: "A",
        link: function(t, o) {
            var n, r = "scrollLazyload", a = function() {
                $("img.lazy").lazyload({
                    container: o,
                    event: r
                })
            }
            , i = 0, c = 0, s = function() {
                i > 1 || c > 20 || (console.log("call lazyloadTimer"),
                e(function() {
                    a(),
                    s(),
                    c++
                }, 500 + 200 * c))
            }
            ;
            t.$on("onScroll", function() {
                n && e.cancel(n),
                n = e(function() {
                    o.trigger(r)
                }, 200)
            }),
            t.$on("onUpdate", function() {
                i++,
                a()
            }),
            s()
        }
    }
}),
angular.module("jQueryScrollbar", []).directive("jqueryScrollbar", function() {
    return {
        link: function(e, t) {
            setTimeout(function() {
                t.scrollbar({
                    test: "test",
                    type: "simpble",
                    onScroll: function(t, o) {
                        e.$broadcast("onScroll", {
                            y: t,
                            x: o
                        })
                    },
                    onUpdate: function() {
                        e.$broadcast("onUpdate", [].slice.call(arguments))
                    },
                    onInit: function() {
                        e.$broadcast("onInit", [].slice.call(arguments))
                    }
                }).on("$destroy", function() {
                    t.scrollbar("destroy")
                })
            }, 0)
        },
        restring: "AC"
    }
}),
!function(e, t) {
    "undefined" != typeof module && module.exports ? module.exports = t(require("angular")) : "function" == typeof define && define.amd ? define(["angular"], t) : t(e.angular)
}(this, function(e) {
    "use strict";
    var t = e.module("ngDialog", [])
      , o = e.element
      , n = e.isDefined
      , r = (document.body || document.documentElement).style
      , a = n(r.animation) || n(r.WebkitAnimation) || n(r.MozAnimation) || n(r.MsAnimation) || n(r.OAnimation)
      , i = "animationend webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend"
      , c = !1;
    t.provider("ngDialog", function() {
        var t = this.defaults = {
            className: "ngdialog-theme-default",
            plain: !1,
            showClose: !0,
            closeByDocument: !0,
            closeByEscape: !0,
            closeByNavigation: !1,
            appendTo: !1,
            preCloseCallback: !1,
            overlay: !0,
            cache: !0
        };
        this.setForceBodyReload = function(e) {
            c = e || !1
        }
        ,
        this.setDefaults = function(o) {
            e.extend(t, o)
        }
        ;
        var n, r = 0, s = 0, l = {};
        this.$get = ["$document", "$templateCache", "$compile", "$q", "$http", "$rootScope", "$timeout", "$window", "$controller", function(u, f, d, g, m, p, h, M, y) {
            var C = u.find("body");
            c && p.$on("$locationChangeSuccess", function() {
                C = u.find("body")
            });
            var _ = {
                onDocumentKeydown: function(e) {
                    27 === e.keyCode && v.close("$escape")
                },
                setBodyPadding: function(e) {
                    var t = parseInt(C.css("padding-right") || 0, 10);
                    C.css("padding-right", t + e + "px"),
                    C.data("ng-dialog-original-padding", t)
                },
                resetBodyPadding: function() {
                    var e = C.data("ng-dialog-original-padding");
                    e ? C.css("padding-right", e + "px") : C.css("padding-right", "")
                },
                performCloseDialog: function(t, o) {
                    var r = t.attr("id");
                    if ("undefined" != typeof M.Hammer) {
                        var c = e.element(t).scope().hammerTime;
                        c.off("tap", n),
                        c.destroy && c.destroy(),
                        delete t.scope().hammerTime
                    } else
                        t.unbind("click");
                    1 === s && C.unbind("keydown"),
                    t.hasClass("ngdialog-closing") || (s -= 1),
                    p.$broadcast("ngDialog.closing", t),
                    a ? t.unbind(i).bind(i, function() {
                        t.scope().$destroy(),
                        t.remove(),
                        0 === s && (C.removeClass("ngdialog-open"),
                        _.resetBodyPadding()),
                        p.$broadcast("ngDialog.closed", t)
                    }).addClass("ngdialog-closing") : (t.scope().$destroy(),
                    t.remove(),
                    0 === s && (C.removeClass("ngdialog-open"),
                    _.resetBodyPadding()),
                    p.$broadcast("ngDialog.closed", t)),
                    l[r] && (l[r].resolve({
                        id: r,
                        value: o,
                        $dialog: t,
                        remainingDialogs: s
                    }),
                    delete l[r])
                },
                closeDialog: function(t, o) {
                    var n = t.data("$ngDialogPreCloseCallback");
                    if (n && e.isFunction(n)) {
                        var r = n.call(t, o);
                        e.isObject(r) ? r.closePromise ? r.closePromise.then(function() {
                            _.performCloseDialog(t, o)
                        }) : r.then(function() {
                            _.performCloseDialog(t, o)
                        }, function() {}) : r !== !1 && _.performCloseDialog(t, o)
                    } else
                        _.performCloseDialog(t, o)
                }
            }
              , v = {
                open: function(a) {
                    function i(e, t) {
                        return m.get(e, t || {}).then(function(e) {
                            return e.data || ""
                        })
                    }
                    function c(t) {
                        return t ? e.isString(t) && w.plain ? t : "boolean" != typeof w.cache || w.cache ? f.get(t) || i(t, {
                            cache: !0
                        }) : i(t, {
                            cache: !1
                        }) : "Empty template"
                    }
                    var u = this
                      , w = e.copy(t);
                    a = a || {},
                    e.extend(w, a),
                    r += 1,
                    u.latestID = "ngdialog" + r;
                    var S;
                    l[u.latestID] = S = g.defer();
                    var b, T, E = e.isObject(w.scope) ? w.scope.$new() : p.$new();
                    return g.when(c(w.template || w.templateUrl)).then(function(t) {
                        if (f.put(w.template || w.templateUrl, t),
                        w.showClose && (t += '<div class="ngdialog-close"></div>'),
                        u.$result = b = o('<div id="ngdialog' + r + '" class="ngdialog"></div>'),
                        b.html(w.overlay ? '<div class="ngdialog-overlay"></div><div class="ngdialog-content">' + t + "</div>" : '<div class="ngdialog-content">' + t + "</div>"),
                        w.data && e.isString(w.data)) {
                            var a = w.data.replace(/^\s*/, "")[0];
                            E.ngDialogData = "{" === a || "[" === a ? e.fromJson(w.data) : w.data
                        } else
                            w.data && e.isObject(w.data) && (E.ngDialogData = w.data);
                        if (w.controller && (e.isString(w.controller) || e.isArray(w.controller) || e.isFunction(w.controller))) {
                            var i = y(w.controller, {
                                $scope: E,
                                $element: b
                            });
                            b.data("$ngDialogControllerController", i)
                        }
                        if (w.className && b.addClass(w.className),
                        T = w.appendTo && e.isString(w.appendTo) ? e.element(document.querySelector(w.appendTo)) : C,
                        w.preCloseCallback) {
                            var c;
                            e.isFunction(w.preCloseCallback) ? c = w.preCloseCallback : e.isString(w.preCloseCallback) && E && (e.isFunction(E[w.preCloseCallback]) ? c = E[w.preCloseCallback] : E.$parent && e.isFunction(E.$parent[w.preCloseCallback]) ? c = E.$parent[w.preCloseCallback] : p && e.isFunction(p[w.preCloseCallback]) && (c = p[w.preCloseCallback])),
                            c && b.data("$ngDialogPreCloseCallback", c)
                        }
                        if (E.closeThisDialog = function(e) {
                            _.closeDialog(b, e)
                        }
                        ,
                        h(function() {
                            d(b)(E);
                            var e = M.innerWidth - C.prop("clientWidth");
                            C.addClass("ngdialog-open");
                            var t = e - (M.innerWidth - C.prop("clientWidth"));
                            t > 0 && _.setBodyPadding(t),
                            T.append(b),
                            w.name ? p.$broadcast("ngDialog.opened", {
                                dialog: b,
                                name: w.name
                            }) : p.$broadcast("ngDialog.opened", b)
                        }),
                        w.closeByEscape && C.bind("keydown", _.onDocumentKeydown),
                        w.closeByNavigation && p.$on("$locationChangeSuccess", function() {
                            _.closeDialog(b)
                        }),
                        n = function(e) {
                            var t = w.closeByDocument ? o(e.target).hasClass("ngdialog-overlay") : !1
                              , n = o(e.target).hasClass("ngdialog-close");
                            (t || n) && v.close(b.attr("id"), n ? "$closeButton" : "$document")
                        }
                        ,
                        "undefined" != typeof M.Hammer) {
                            var l = E.hammerTime = M.Hammer(b[0]);
                            l.on("tap", n)
                        } else
                            b.bind("click", n);
                        return s += 1,
                        v
                    }),
                    {
                        id: "ngdialog" + r,
                        closePromise: S.promise,
                        close: function(e) {
                            _.closeDialog(b, e)
                        }
                    }
                },
                openConfirm: function(t) {
                    var n = g.defer()
                      , r = {
                        closeByEscape: !1,
                        closeByDocument: !1
                    };
                    e.extend(r, t),
                    r.scope = e.isObject(r.scope) ? r.scope.$new() : p.$new(),
                    r.scope.confirm = function(e) {
                        n.resolve(e);
                        var t = o(document.getElementById(a.id));
                        _.performCloseDialog(t, e)
                    }
                    ;
                    var a = v.open(r);
                    return a.closePromise.then(function(e) {
                        return e ? n.reject(e.value) : n.reject()
                    }),
                    n.promise
                },
                close: function(e, t) {
                    var n = o(document.getElementById(e));
                    return n.length ? _.closeDialog(n, t) : v.closeAll(t),
                    v
                },
                closeAll: function(t) {
                    var n = document.querySelectorAll(".ngdialog");
                    e.forEach(n, function(e) {
                        _.closeDialog(o(e), t)
                    })
                },
                getDefaults: function() {
                    return t
                }
            };
            return v
        }
        ]
    }),
    t.directive("ngDialog", ["ngDialog", function(t) {
        return {
            restrict: "A",
            scope: {
                ngDialogScope: "="
            },
            link: function(o, n, r) {
                n.on("click", function(n) {
                    n.preventDefault();
                    var a = e.isDefined(o.ngDialogScope) ? o.ngDialogScope : "noScope";
                    e.isDefined(r.ngDialogClosePrevious) && t.close(r.ngDialogClosePrevious);
                    var i = t.getDefaults();
                    t.open({
                        template: r.ngDialog,
                        className: r.ngDialogClass || i.className,
                        controller: r.ngDialogController,
                        scope: a,
                        data: r.ngDialogData,
                        showClose: "false" === r.ngDialogShowClose ? !1 : "true" === r.ngDialogShowClose ? !0 : i.showClose,
                        closeByDocument: "false" === r.ngDialogCloseByDocument ? !1 : "true" === r.ngDialogCloseByDocument ? !0 : i.closeByDocument,
                        closeByEscape: "false" === r.ngDialogCloseByEscape ? !1 : "true" === r.ngDialogCloseByEscape ? !0 : i.closeByEscape,
                        preCloseCallback: r.ngDialogPreCloseCallback || i.preCloseCallback
                    })
                })
            }
        }
    }
    ])
}),
angular.module("Directives").directive("mmRepeat", ["$document", "$compile", "$rootScope", function(e, t) {
    function o(e, t, o, n, r) {
        var a, i, c = 0;
        if (0 === e.length)
            return 0;
        if (o > n) {
            for (var s = t; s > -1; s--)
                if (a = e[s],
                i = c,
                c += a._h || (a._h = r(a)),
                n > o - c)
                    return {
                        index: s,
                        total: i
                    };
            return {
                index: 0,
                total: 0
            }
        }
        for (var s = t; s < e.length; s++)
            if (a = e[s],
            i = c,
            c += a._h || (a._h = r(a)),
            o + c > n)
                return {
                    index: s,
                    total: i
                };
        return {
            index: e.length - 1,
            total: c
        }
    }
    function n(e, t, o, n) {
        if (0 === e.length || t === o)
            return 0;
        for (var r, a = 0, i = t; o > i; i++)
            r = e[i],
            a += r._h || (r._h = n(r));
        return a
    }
    function r(e, t, r, a) {
        var i, c, s, l, u, f = t.scroll - r, d = t.scroll + t.visible + r;
        return f > 0 ? (u = o(e, 0, 0, f, a),
        i = u.index,
        f = u.total) : (i = 0,
        f = 0),
        c = o(e, i, f, d, a).index,
        c = c >= e.length ? e.length - 1 : c,
        s = n(e, 0, i, a),
        l = n(e, c + 1, e.length, a),
        {
            topHeight: s,
            bottomHeight: l,
            startIndex: i,
            endIndex: c
        }
    }
    function a(e, t, o, n) {
        var a, i = r(n, t, e.bufferHeight, e.heightCalc);
        e.bottomHeight = i.bottomHeight,
        e.topHeight = i.topHeight,
        o.length = 0,
        a = n.slice(i.startIndex, i.endIndex + 1),
        [].push.apply(o, a),
        console.timeEnd("render")
    }
    function i(e) {
        if (!(e.length <= 0))
            for (var t, o = 0, n = 0; n < e.length; n++)
                t = e[n],
                t._offsetTop = o,
                o += t._h
    }
    function c(e, t, o) {
        if (!(e.length <= 0))
            for (var n, r = 0; r < e.length; r++)
                n = e[r],
                (!n._h || o) && (n._h = t(n))
    }
    function s(e, t, o) {
        var n = function(e) {
            setTimeout(function() {
                o(e)
            }, 0)
        }
        ;
        if (0 == e.length)
            return void o(e);
        for (var r, a = e.length, i = 0, c = 0; a > c; c++)
            r = e[c],
            r._h ? (i++,
            i == a && n(e)) : (console.log("pre", "callcalc"),
            t(r, function(t) {
                return function(o) {
                    t._h = o,
                    t._calcing = !1,
                    i++,
                    console.log("pre", t, i),
                    i == a && n(e)
                }
            }(r)))
    }
    function l(e) {
        for (var t = !0, o = 0; o < e.length; o++)
            e[o]._h || (t = !1);
        return t
    }
    return {
        restrict: "EA",
        priority: 1e3,
        scope: !0,
        terminal: !0,
        link: function(e, o, n) {
            var r = []
              , u = {
                maxScroll: 0,
                scroll: 0,
                size: 0,
                visible: 687
            }
              , f = n.mmRepeat.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/)
              , d = f[2]
              , g = (f[1],
            '<div ng-style="{height:topHeight}" class="top-placeholder"></div><div ng-repeat="' + n.mmRepeat + '">' + o.html() + '</div><div ng-style="{height:bottomHeight}" class="bottom-placeholder"></div>')
              , m = t(g)(e);
            o.html(""),
            o.append(m),
            e.bufferHeight || (e.bufferHeight = 100),
            e.preCalc = n.preCalc && "false" !== n.preCalc ? !0 : !1,
            e[d] = [],
            e.$on("onScroll", function(t, o) {
                return u = o.y,
                e.heightCalc && 2 === e.heightCalc.length && !l(r) ? void s(r, e.heightCalc, function() {
                    l(r) && (i(r),
                    a(e, u, e[d], r),
                    e.$digest())
                }) : (a(e, u, e[d], r),
                void e.$digest())
            }),
            e.$parent.$watch(n.heightCalc, function(t) {
                "function" == typeof t && (e.heightCalc = t)
            }),
            n.height && (e.heightCalc = function() {
                return parseInt(n.height)
            }
            ),
            e.bufferHeight = parseInt(n.bufferHeight),
            e.$parent.$watchCollection(f[2], function(t) {
                if (t instanceof Array)
                    if (r = t,
                    t.length > 0) {
                        for (var o = 0; o < r.length; o++)
                            r[o]._index = o;
                        console.time("calc"),
                        e.preCalc ? s(r, e.heightCalc, function() {
                            console.timeEnd("calc"),
                            console.time("render"),
                            l(r) && (i(r),
                            a(e, u, e[d], r),
                            e.$digest(),
                            e.$emit("mmRepeat:change"))
                        }) : (c(r, e.heightCalc, n.noCache),
                        i(r),
                        a(e, u, e[d], r),
                        e.$emit("mmRepeat:change"))
                    } else
                        e[d].length = 0,
                        e.$emit("mmRepeat:change")
            })
        }
    }
}
]),
angular.module("Directives").directive("mmRepeatKeyboard", ["$timeout", "utilFactory", "confFactory", function(e, t, o) {
    return {
        restrict: "A",
        priority: 1001,
        scope: !1,
        link: function(e, n, r) {
            function a(t) {
                e.$emit("mmrepeat:select", t)
            }
            function i(e, t, o) {
                var n = t._h
                  , r = t._offsetTop
                  , a = e.scrollTop;
                if (a >= r)
                    return e.scrollTop = r,
                    void (o && (e.scrollTop = 0));
                var i = r + n - e.clientHeight;
                i > a && (e.scrollTop = i)
            }
            function c(e) {
                if (u) {
                    var n, r = !1;
                    if (n = e.ctrlKey ? m.ctrl || m["default"] : m["default"],
                    n || (n = function() {
                        return !0
                    }
                    ),
                    !g) {
                        if (g = u[0],
                        !g)
                            return;
                        if (n(g))
                            return void a(g)
                    }
                    if (g) {
                        var c = g;
                        if (c) {
                            switch (e.keyCode) {
                            case o.KEYCODE_ARROW_UP:
                                do
                                    c = c._index - 1 < 0 ? g : u[c._index - 1];
                                while (!n(c));c == g && (r = !0);
                                break;
                            case o.KEYCODE_ARROW_DOWN:
                                do
                                    c = c._index + 1 >= u.length ? g : u[c._index + 1];
                                while (!n(c));break;
                            default:
                                return
                            }
                            g = c,
                            t.wait(function() {
                                return "undefined" != typeof g._offsetTop
                            }, function() {
                                i(d, c, r),
                                a(c)
                            }, 10)
                        }
                        (e.keyCode == o.KEYCODE_ARROW_UP || e.keyCode == o.KEYCODE_ARROW_DOWN) && e.preventDefault()
                    }
                }
            }
            var s = r.mmRepeat.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/)
              , l = s[2];
            e.$parent.$watch(l, function(e) {
                e && (u = e)
            });
            var u = e.$parent[l]
              , f = r.mmRepeatKeyboardScrollSelector
              , d = $(f)[0];
            if (!d)
                return void console.error("scrollContainer 不存在");
            var g, m = {};
            e.$parent.mmRepeatKeyboard = {
                started: !1,
                start: function() {
                    this.started || ($(document).on("keydown", "body", c),
                    this.started = !0)
                },
                stop: function() {
                    this.started = !1,
                    $(document).off("keydown", "body", c)
                },
                setJudgeFun: function(e, t) {
                    t ? m[t] = e : m["default"] = e
                },
                setSelectItem: function(e) {
                    g = e
                }
            },
            e.$on("$destroy", function() {
                $(document).off("keydown", "body", c)
            })
        }
    }
}
]),
angular.module("Directives").directive("searchListDirective", [function() {
    return {
        restrict: "A",
        link: function(e, t) {
            function o(e) {
                var t = n[e];
                if (t) {
                    var o = t._h
                      , a = t._offsetTop
                      , i = r.scrollTop;
                    if (i > a || "undefined" == typeof t.NickName)
                        return void (r.scrollTop = 1 == t._index ? 0 : a);
                    var c = a + o - r.clientHeight;
                    c > i && (r.scrollTop = c)
                }
            }
            var n = e.allContacts
              , r = t[0]
              , a = n.length && n[0].type && "header" == n[0].type ? 1 : 0;
            n.length - 1,
            e.selectIndex = a,
            e.$on("root:searchList:keyArrowUp", function() {
                var t = e.selectIndex;
                do
                    --t;
                while (t > a && "header" == n[t].type);t = a > t ? a : t,
                e.selectIndex = t,
                o(t)
            }),
            e.$on("root:searchList:keyArrowDown", function() {
                var t = n.length - 1
                  , r = e.selectIndex;
                do
                    ++r;
                while (t > r && "header" == n[r].type);r = r > t ? t : r,
                e.selectIndex = r,
                o(r)
            }),
            e.$on("root:searchList:keyEnter", function() {
                e.clickUserCallback(n[e.selectIndex])
            })
        }
    }
}
]),
angular.module("Directives").directive("navChatDirective", ["$timeout", "$log", "$document", "$stateParams", "$rootScope", "chatFactory", "accountFactory", "contactFactory", "appFactory", "confFactory", "utilFactory", "stateManageService", function(
  e   // $timeout
  , t // $log
  , o // $document
  , n // $stateParams
  , r // $rootScope
  , a // chatFactory
  , i // accountFactory
  , c // contactFactory
  , s // appFactory
  , l // confFactory
  , u // utilFactory
  , f // stateManageService
) {
    return {
        restrict: "EA",
        scope: !0,
        templateUrl: "navChat.html",
        link: function(t) {
            function o(e) {
                var o, c, s = t.chatList;
                if (f.canDo("navKeydown")) {
                    if (t.currentUserName)
                        o = n(s, t.currentUserName),
                        c = o,
                        u.wait(function() {
                            return "undefined" != typeof o._offsetTop
                        }, function() {
                            switch (e.keyCode) {
                            case l.KEYCODE_ARROW_UP:
                                c = o._index - 1 < 0 ? o : s[o._index - 1];
                                break;
                            case l.KEYCODE_ARROW_DOWN:
                                c = o._index + 1 >= s.length ? o : s[o._index + 1];
                                break;
                            default:
                                return
                            }
                            u.fitRun("navKeydown", function() {
                                a.setCurrentUserName(c.UserName),
                                r.$digest()
                            }, 200, 800),
                            t.showChatContentByUserName(c.UserName),
                            r.$digest(),
                            i($(".chat_list.scroll-content")[0], c)
                        }, 10);
                    else {
                        var d;
                        if (e.keyCode != l.KEYCODE_ARROW_UP && e.keyCode != l.KEYCODE_ARROW_DOWN || !(d = s[0]))
                            return;
                        t.currentUserName = d.UserName,
                        a.setCurrentUserName(d.UserName),
                        t.showChatContentByUserName(d.UserName),
                        r.$digest(),
                        i($(".chat_list.scroll-content")[0], d)
                    }
                    (e.keyCode == l.KEYCODE_ARROW_UP || e.keyCode == l.KEYCODE_ARROW_DOWN) && e.preventDefault()
                }
            }
            function n(e, t) {
                for (var o, n = 0; n < e.length; n++)
                    if (o = e[n],
                    o.UserName === t)
                        return o
            }
            function i(e, t) {
                var o = t._h
                  , n = t._offsetTop
                  , r = e.scrollTop;
                if (r > n)
                    return void (e.scrollTop = n);
                var a = n + o - e.clientHeight;
                a > r && (e.scrollTop = a)
            }
            f.on("navChat:active", function(e) {
                e ? $(document).on("keydown", "body", o) : $(document).off("keydown", "body", o)
            }),
            e(function() {
                t.chatList = a.getChatList(),
                t.currentUserName = a.getCurrentUserName(),
                t.$watch(function() {
                    return c.contactChangeFlag
                }, function() {
                    a.getChatList()
                })
            }, 0),
            r.$on("contact:settop", function() {
                a.getChatList()
            }),
            t.$watch(function() {
                return a.getCurrentUserName()
            }, function(e) {
                e && (t.showChatContentByUserName(e),
                c.addBatchgetChatroomMembersContact(e))
            }),
            t.showChatContentByUserName = function(e) {
                console.log("setusername", e),
                t.currentUserName = e,
                a.getChatList()
            }
            ,
            t.itemClick = function(e) {
                a.setCurrentUserName(e),
                t.showChatContentByUserName(e)
            }
            ,
            t.$on("root:notification:click", function(e, o) {
                t.$apply(function() {
                    a.setCurrentUserName(o),
                    t.showChatContentByUserName(o)
                })
            }),
            t.$on("root:statechange", function() {
                setTimeout(function() {
                    $(".chat_list.scroll-content")[0].scrollTop = 0
                }, 0)
            }),
            t.$on("app:chat:dblclick", function() {}),
            t.$on("root:deleteChat", function(e, t) {
                a.deleteChatList(t),
                a.deleteChatMessage(t),
                a.getCurrentUserName() == t && a.setCurrentUserName("")
            }),
            t.$on("root:msgSend:success", function(e, o) {
                var n = o.ToUserName;
                angular.forEach(t.chatList, function(e) {
                    return e.UserName === n ? (e.MMStatus = o.MMStatus,
                    void (t.$$phase || t.$digest())) : void 0
                })
            }),
            t.$on("$destroy", function() {
                f.change("navChat:active", !1)
            })
        }
    }
}
]),
angular.module("Directives").directive("navContactDirective", ["$rootScope", "$timeout", "$state", "contactFactory", "stateManageService", "confFactory", "utilFactory", function(e, t, o, n, r, a, i) {
    return {
        restrict: "EA",
        scope: !0,
        templateUrl: "navContact.html",
        link: function(c) {
            function s(t) {
                if (r.canDo("navKeydown")) {
                    var o = c.allContacts
                      , n = c.currentContact || o[0]
                      , s = n;
                    i.wait(function() {
                        return "undefined" != typeof n._offsetTop
                    }, function() {
                        if (n)
                            if (t.ctrlKey) {
                                switch (t.keyCode) {
                                case a.KEYCODE_ARROW_UP:
                                    do
                                        s = s._index - 1 < 0 ? n : o[s._index - 1];
                                    while ("undefined" != typeof s.NickName);break;
                                case a.KEYCODE_ARROW_DOWN:
                                    do {
                                        if (s._index + 1 >= o.length) {
                                            for (var r = s._index - 1; r >= 0 && (s = o[r],
                                            "undefined" != typeof s.NickName); r--)
                                                ;
                                            break
                                        }
                                        s = o[s._index + 1]
                                    } while ("undefined" != typeof s.NickName);break;
                                default:
                                    return
                                }
                                c.currentContact = s
                            } else {
                                switch (t.keyCode) {
                                case a.KEYCODE_ARROW_UP:
                                    do {
                                        if (s._index - 1 < 0) {
                                            for (var r = s._index + 1; r < o.length && (s = o[r],
                                            "undefined" == typeof s.NickName); r++)
                                                ;
                                            break
                                        }
                                        s = o[s._index - 1]
                                    } while ("undefined" == typeof s.NickName);break;
                                case a.KEYCODE_ARROW_DOWN:
                                    do
                                        s = s._index + 1 >= o.length ? n : o[s._index + 1];
                                    while ("undefined" == typeof s.NickName);break;
                                default:
                                    return
                                }
                                i.fitRun("navKeydown", function() {
                                    c.showProfile(s),
                                    e.$digest()
                                }, 200, 800),
                                c.currentContact = s
                            }
                        e.$digest(),
                        l($(f)[0], s)
                    }, 10),
                    (t.keyCode == a.KEYCODE_ARROW_UP || t.keyCode == a.KEYCODE_ARROW_DOWN) && t.preventDefault()
                }
            }
            function l(e, t) {
                var o = t._h
                  , n = t._offsetTop
                  , r = e.scrollTop;
                if (r > n || "undefined" == typeof t.NickName)
                    return void (e.scrollTop = 1 == t._index ? 0 : n);
                var a = n + o - e.clientHeight;
                a > r && (e.scrollTop = a)
            }
            function u() {
                c.currentContact = n.getCurrentContact(),
                c.allContacts = n.pickContacts(["star", "chatroom", "friend"], {
                    friend: {
                        isWithoutStar: !0,
                        isWithoutBrand: !0
                    },
                    chatroom: {
                        isSaved: !0
                    }
                }).result
            }
            var f = "#navContact.J_ContactScrollBody";
            r.on("navContact:active", function(e) {
                e ? $(document).on("keydown", "body", s) : $(document).off("keydown", "body", s)
            }),
            c.dblclick = function(e) {
                o.go("chat", {
                    userName: e.UserName
                })
            }
            ,
            t(function() {
                c.$watch(function() {
                    return n.contactChangeFlag
                }, function() {
                    u()
                }),
                c.showProfile = function(e) {
                    n.setCurrentContact(e),
                    c.currentContact = n.getCurrentContact()
                }
            }, 0)
        }
    }
}
]),
angular.module("Directives").directive("navReadDirective", ["$timeout", "$log", "$document", "$stateParams", "$rootScope", "$state", "chatFactory", "accountFactory", "contactFactory", "appFactory", "confFactory", "utilFactory", "stateManageService", "subscribeMsgService", function(e, t, o, n, r, a, i, c, s, l, u, f, d, g) {
    function m(e) {
        for (var t, o = [], n = 0; n < e.length; n++)
            t = e[n],
            o.push(t),
            [].push.apply(o, t.MPArticleList);
        return o
    }
    return {
        restrict: "EA",
        scope: !0,
        templateUrl: "navRead.html",
        link: function(e) {
            e.subscribeMsgs = [],
            e.articleList = [],
            e.subscribeMsgs.defaultValue = !0,
            e.$watch(function() {
                return g.changeFlag
            }, function(t) {
                0 != t && (e.subscribeMsgs = g.getSubscribeMsgs(),
                e.articleList = m(e.subscribeMsgs),
                !e.currentItem && e.subscribeMsgs.length > 0 && (g.current = e.currentItem = e.subscribeMsgs[0].MPArticleList[0],
                e.mmRepeatKeyboard.setSelectItem(e.currentItem)))
            }),
            e.mmRepeatKeyboard.setJudgeFun(function(e) {
                return !e.UserName
            }),
            d.on("dialog:open", function(t) {
                t ? e.mmRepeatKeyboard.stop() : e.mmRepeatKeyboard.start()
            }),
            d.on("navRead:active", function(t) {
                t ? e.mmRepeatKeyboard.start() : e.mmRepeatKeyboard.stop()
            }),
            e.heightCalc = function(e) {
                return e.UserName ? 0 == e._index ? 45 : 55 : 60
            }
            ,
            e.$on("mmrepeat:select", function(t, o) {
                f.fitRun("navKeydown", function() {
                    a.go("read", {
                        readItem: o
                    })
                }, 200, 1400),
                g.current = e.currentItem = o,
                console.log("select", o)
            }),
            e.itemClick = function(t) {
                g.current = e.currentItem = t,
                e.mmRepeatKeyboard.setSelectItem(t),
                a.go("read", {
                    readItem: t
                })
            }
        }
    }
}
]),
angular.module("Directives").directive("mmSrc", ["$document", "$timeout", "$rootScope", function(e, t) {
    return {
        priority: 99,
        link: function(e, o, n) {
            function r() {
                for (var t; t = y.pop(); )
                    delete t.src,
                    t.onload = null ,
                    t.onerror = null ;
                _ && e[_] && e[_].call(o)
            }
            function a(t) {
                p.onerror = null ,
                p.onload = null ,
                c() || (console.log(t),
                n.$set(u, f),
                v && e[v] && e[v].call(o))
            }
            function i() {
                M = !1,
                p.onload = function() {
                    p.src && p.src.indexOf(s) > -1 && (M = !0,
                    p.onload = null ,
                    p.onerror = null ,
                    r())
                }
                ,
                p.onerror = a,
                p.src = s,
                C.push(t(function() {
                    M || p.src && p.src.indexOf(s) > -1 && !p.complete || c()
                }, d))
            }
            function c() {
                if (g > h) {
                    if (h++,
                    m) {
                        l = s,
                        console.log("retry count", h, g),
                        l.indexOf("?") < 0 && (l += "?"),
                        l += "&mmSrcParallelRetry=" + Date.now();
                        var e = new Image;
                        e.onload = function() {
                            n.$set(u, e.src),
                            console.log(e.src, e, p.complete),
                            r()
                        }
                        ,
                        e.onerror = a,
                        e.src = l,
                        C.push(t(function() {
                            M || c()
                        }, d)),
                        y.push(e)
                    } else
                        n.$set(u, f),
                        t(function() {
                            i()
                        }, 0);
                    return !0
                }
                return !1
            }
            var s, l, u = "src", f = n.src, d = n.mmSrcTimeout ? parseInt(n.mmSrcTimeout) : 5e3, g = n.mmSrcRetryCount ? parseInt(n.mmSrcRetryCount) : 4, m = "undefined" != typeof n.mmSrcParallel, p = o[0], h = 0, M = !1, y = [], C = [], _ = n.mmSrcLoad, v = n.mmSrcError;
            n.$observe("mmSrc", function(e) {
                e && (s = e,
                i())
            }),
            e.$on("$destroy", function() {
                for (var e; e = C.pop(); )
                    t.cancel(e)
            })
        }
    }
}
]),
angular.module("Directives").directive("mmPaste", ["$timeout", "utilFactory", "stateManageService", function(e, t, o) {
    return {
        restrict: "EA",
        scope: {
            pasteLimit: "=",
            pasteResetTime: "="
        },
        link: function(n, r) {
            var a, i = n.pasteLimit || 1, c = n.pasteResetTime || 200, s = 0;
            r.on("paste", function(n) {
                var r = n.originalEvent;
                return o.canDo("pasteFile") ? (t.browser.mozilla && r.clipboardData && 0 == r.clipboardData.types.length && (n.preventDefault(),
                n.stopImmediatePropagation()),
                void (s >= i ? (n.preventDefault(),
                n.stopImmediatePropagation()) : (a && e.cancel(a),
                a = e(function() {
                    s = 0
                }, c),
                s++))) : (n.preventDefault(),
                void n.stopImmediatePropagation())
            })
        }
    }
}
]),
angular.module("Directives").directive("contactPicker", ["$timeout", "$log", "$document", "$stateParams", "$rootScope", "chatFactory", "accountFactory", "contactFactory", "appFactory", "confFactory", "utilFactory", "stateManageService", "mmpop", function(e, t, o, n, r, a, i, c, s, l, u, f) {
    function d(e) {
        for (var t, o = {}, n = 0; n < e.length; n++)
            t = e[n],
            o[t.UserName] = t;
        return o
    }
    return {
        restrict: "EA",
        scope: {
            selectList: "=",
            pickConfig: "=",
            initList: "="
        },
        templateUrl: "contactPicker.html",
        link: function(t, o) {
            function n(e) {
                var o = -1;
                return angular.forEach(t.selectList, function(t, n) {
                    return t.UserName == e ? void (o = n) : void 0
                }),
                o
            }
            function r(e, t) {
                return e.unshift.apply(e, t),
                e
            }
            function a(e) {
                t.current = e,
                t.mmRepeatKeyboard.setSelectItem(e)
            }
            function i(e) {
                (!t.current || e) && t.contactList.length > 0 && t.keyword && a("header" == t.contactList[0].type ? t.contactList[1] : t.contactList[0])
            }
            var s;
            t.$watch(function() {
                return t.selectList.length
            }, function(e) {
                e > 15 && (s || (s = $(".selector", o)[0]),
                setTimeout(function() {
                    s.scrollTop = 1e4
                }, 20))
            }),
            f.change("contactPicker:active", !0),
            t.$on("$destroy", function() {
                f.change("contactPicker:active", !1)
            });
            var g, m, p = t.pickConfig;
            p.opt.all = p.opt.all || {};
            var h = t.initList || [];
            t.contactList = r(c.pickContacts(p.types, p.opt, !0).result, h),
            t.selectList = t.selectList || [],
            i(),
            t.search = function() {
                g && e.cancel(g),
                g = e(function() {
                    if (t.keyword) {
                        c.searchKey = t.keyword,
                        m && m.close();
                        var e = $.extend(d(t.selectList), p.opt.all.filterContacts)
                          , o = $.extend({}, p.opt, {
                            all: $.extend({}, p.opt.all, {
                                noHeader: !0,
                                keyword: t.keyword,
                                filterContacts: e
                            })
                        });
                        t.contactList = c.pickContacts(p.types, o, !0).result,
                        i(!0)
                    } else
                        t.contactList = r(c.pickContacts(p.types, p.opt, !0).result, h),
                        i(!0)
                }, 200)
            }
            ,
            t.toggleUser = function(e) {
                t.current = e;
                var o = n(e.UserName);
                t.keyword && (t.keyword = "",
                t.current = void 0,
                t.search()),
                -1 == o ? t.selectList.push(e) : t.selectList.splice(o, 1)
            }
            ,
            t.delUser = function(e) {
                var o = n(e);
                o > -1 && t.selectList.splice(o, 1)
            }
            ,
            t.isCheck = function(e) {
                return -1 == n(e) ? !1 : !0
            }
            ,
            t.searchKeydown = function(e) {
                switch (e.keyCode) {
                case l.KEYCODE_ENTER:
                    t.current && t.toggleUser(t.current),
                    e.preventDefault(),
                    e.stopPropagation(),
                    t.$digest();
                    break;
                case l.KEYCODE_BACKSPACE:
                    if (!t.keyword) {
                        var o = t.selectList.pop();
                        o && t.delUser(o.UserName),
                        e.stopPropagation(),
                        e.preventDefault(),
                        t.$digest()
                    }
                    u.browser.msie && 9 == u.browser.version && t.search()
                }
            }
            ,
            $(document).on("keydown", "body", t.searchKeydown),
            t.heightCalc = function(e) {
                return "header" === e.type ? 32 : 62
            }
            ,
            t.mmRepeatKeyboard.start(),
            t.mmRepeatKeyboard.setJudgeFun(function(e) {
                return e.UserName
            }),
            t.$on("mmrepeat:select", function(e, o) {
                t.current = o,
                t.$digest()
            }),
            t.$on("$destroy", function() {
                $(document).off("keydown", "body", t.searchKeydown)
            })
        }
    }
}
]),
angular.module("Directives").directive("mmActionTrack", ["actionTrack", "utilFactory", function(e, t) {
    var o = $(window)
      , n = o.height()
      , r = o.width();
    return o.on("resize", function() {
        t.fitRun("resize", function() {
            var t = o.height()
              , a = o.width()
              , i = []
              , c = "height-" + (n > t ? "smaller" : "bigger")
              , s = "width-" + (r > a ? "smaller" : "bigger");
            n != t && i.push(c),
            r != a && i.push(s),
            i.length > 0 && e.addRecord({
                action: i.join(" "),
                type: "resize"
            }),
            n = t,
            r = a
        }, 200, 500)
    }),
    {
        priority: 99,
        scope: {
            types: "=trackType",
            opt: "=trackOpt"
        },
        link: function(t, o) {
            var n = t.opt
              , r = t.types;
            for (var a in r) {
                var i = r[a];
                if ("keydown" == i) {
                    var c = n.keys
                      , s = {
                        enter: 13,
                        backspace: 8,
                        blankspace: 32
                    };
                    o.on("keydown", function(t) {
                        for (var o in c)
                            s[c[o]] == t.keyCode && e.addRecord({
                                type: "keydown",
                                action: n.target + "-" + c[o]
                            })
                    })
                }
                if ("click" == i) {
                    var l;
                    o.on("click", function(t) {
                        l && t.timeStamp - l <= 30 || (l = t.timeStamp,
                        e.addRecord({
                            type: "click",
                            action: n.target
                        }))
                    })
                }
                "focus" == i && o.on("focus", function() {
                    e.addRecord({
                        type: "focus",
                        action: n.target
                    })
                })
            }
        }
    }
}
]).factory("actionTrack", ["reportService", function(e) {
    var t = 100
      , o = []
      , n = {
        report: function() {
            o.length > 0 && e.report(e.ReportType.actionRecord, {
                actions: o
            }, !0),
            o = []
        },
        addRecord: function(e) {
            o.length > t || (console.log("record", e),
            e.time = Date.now(),
            o.push(e))
        }
    };
    return n
}
]),
!function(e, t) {
    "use strict";
    t.module("ngClipboard", []).provider("ngClip", function() {
        var e = this;
        return this.path = "//cdnjs.cloudflare.com/ajax/libs/zeroclipboard/2.1.6/ZeroClipboard.swf",
        {
            setPath: function(t) {
                e.path = t
            },
            setConfig: function(t) {
                e.config = t
            },
            $get: function() {
                return {
                    path: e.path,
                    config: e.config
                }
            }
        }
    }).run(["$rootScope", "ngClip", function(o, n) {
        function r() {
            require.async(["ZeroClipboard"], function(e) {
                e.config(t.extend(a, n.config || {}))
            })
        }
        var a = {
            swfPath: n.path,
            trustedDomains: ["*"],
            allowScriptAccess: "always",
            forceHandCursor: !0
        };
        e.ZeroClipboard ? r() : o.$on("root:pageInit:success", function() {
            r()
        })
    }
    ]).directive("clipCopy", ["ngClip", function() {
        return {
            scope: {
                clipCopy: "&",
                clipClick: "&",
                clipClickFallback: "&"
            },
            restrict: "A",
            link: function(e, o, n) {
                var r = require("ZeroClipboard");
                if (r.isFlashUnusable())
                    return void o.bind("click", function(t) {
                        e.$apply(e.clipClickFallback({
                            $event: t,
                            copy: e.$eval(e.clipCopy)
                        }))
                    });
                var a = new r(o);
                "" === n.clipCopy && (e.clipCopy = function() {
                    return o[0].previousElementSibling.innerText
                }
                ),
                a.on("ready", function() {
                    a.on("copy", function(t) {
                        var o = t.clipboardData;
                        o.setData(n.clipCopyMimeType || "text/plain", e.$eval(e.clipCopy))
                    }),
                    a.on("aftercopy", function() {
                        t.isDefined(n.clipClick) && e.$apply(e.clipClick)
                    }),
                    e.$on("$destroy", function() {
                        a.destroy()
                    })
                })
            }
        }
    }
    ])
}(window, window.angular),
angular.module("Filters", []),
!function() {
    "use strict";
    angular.module("Filters").filter("HTMLEnCode", function() {}).filter("HTMLDeCode", function() {
        return function(e) {
            return 0 == e.length ? "" : e = e.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
        }
    }).filter("VoiceLengthFilter", function() {
        return function(e) {
            return 0 == e.length ? 0 : Math.round(e / 1e3)
        }
    }).filter("emojiHideFilter", function() {
        return function(e) {
            return e && 0 != e.length ? e.replace(/<span class=.emoji.*?<\/span>/g, MM.context("809bb9d")) : ""
        }
    }).filter("checkurlFilter", ["utilFactory", function(e) {
        return function(t) {
            return t && 0 != t.length ? e.genCheckURL(t) : ""
        }
    }
    ]).filter("timeFormat", ["utilFactory", function() {
        var e = [MM.context("562d747"), MM.context("1603b06"), MM.context("b5a6a07"), MM.context("e60725e"), MM.context("170fc8e"), MM.context("eb79cea"), MM.context("2457513")];
        return function(t) {
            var t = 1e3 * t
              , o = new Date
              , n = o.getTime() / 1e3
              , r = o.getDay();
            o.setTime(t);
            var a, i = o.getHours(), c = o.getMinutes(), s = o.getDay(), l = o.getFullYear() % 100, u = o.getMonth() + 1, f = n - t > 604800, d = 86400 > n - t && s == r;
            return 10 > c && (c = "0" + c),
            a = d ? i + ":" + c : f ? l + "/" + u + "/" + o.getDate() : e[s]
        }
    }
    ])
}(),
!function() {
    "use strict";
    angular.module("Filters").filter("emojiFilter", ["emojiFactory", function(e) {
        return function(t) {
            return 0 == t.length ? "" : t = t.replace(/\[([^\]]+)\]/g, function(t, o) {
                return e.getEmoticonByText(o)
            })
        }
    }
    ])
}(),
function() {
    "use strict";
    function e(e, t) {
        var o = (65535 & e) + (65535 & t)
          , n = (e >> 16) + (t >> 16) + (o >> 16);
        return n << 16 | 65535 & o
    }
    function t(e, t) {
        return e << t | e >>> 32 - t
    }
    function o(o, n, r, a, i, c) {
        return e(t(e(e(n, o), e(a, c)), i), r)
    }
    function n(e, t, n, r, a, i, c) {
        return o(t & n | ~t & r, e, t, a, i, c)
    }
    function r(e, t, n, r, a, i, c) {
        return o(t & r | n & ~r, e, t, a, i, c)
    }
    function a(e, t, n, r, a, i, c) {
        return o(t ^ n ^ r, e, t, a, i, c)
    }
    function i(e, t, n, r, a, i, c) {
        return o(n ^ (t | ~r), e, t, a, i, c)
    }
    function c(t, o) {
        t[o >> 5] |= 128 << o % 32,
        t[(o + 64 >>> 9 << 4) + 14] = o;
        var c, s, l, u, f, d = 1732584193, g = -271733879, m = -1732584194, p = 271733878;
        for (c = 0; c < t.length; c += 16)
            s = d,
            l = g,
            u = m,
            f = p,
            d = n(d, g, m, p, t[c], 7, -680876936),
            p = n(p, d, g, m, t[c + 1], 12, -389564586),
            m = n(m, p, d, g, t[c + 2], 17, 606105819),
            g = n(g, m, p, d, t[c + 3], 22, -1044525330),
            d = n(d, g, m, p, t[c + 4], 7, -176418897),
            p = n(p, d, g, m, t[c + 5], 12, 1200080426),
            m = n(m, p, d, g, t[c + 6], 17, -1473231341),
            g = n(g, m, p, d, t[c + 7], 22, -45705983),
            d = n(d, g, m, p, t[c + 8], 7, 1770035416),
            p = n(p, d, g, m, t[c + 9], 12, -1958414417),
            m = n(m, p, d, g, t[c + 10], 17, -42063),
            g = n(g, m, p, d, t[c + 11], 22, -1990404162),
            d = n(d, g, m, p, t[c + 12], 7, 1804603682),
            p = n(p, d, g, m, t[c + 13], 12, -40341101),
            m = n(m, p, d, g, t[c + 14], 17, -1502002290),
            g = n(g, m, p, d, t[c + 15], 22, 1236535329),
            d = r(d, g, m, p, t[c + 1], 5, -165796510),
            p = r(p, d, g, m, t[c + 6], 9, -1069501632),
            m = r(m, p, d, g, t[c + 11], 14, 643717713),
            g = r(g, m, p, d, t[c], 20, -373897302),
            d = r(d, g, m, p, t[c + 5], 5, -701558691),
            p = r(p, d, g, m, t[c + 10], 9, 38016083),
            m = r(m, p, d, g, t[c + 15], 14, -660478335),
            g = r(g, m, p, d, t[c + 4], 20, -405537848),
            d = r(d, g, m, p, t[c + 9], 5, 568446438),
            p = r(p, d, g, m, t[c + 14], 9, -1019803690),
            m = r(m, p, d, g, t[c + 3], 14, -187363961),
            g = r(g, m, p, d, t[c + 8], 20, 1163531501),
            d = r(d, g, m, p, t[c + 13], 5, -1444681467),
            p = r(p, d, g, m, t[c + 2], 9, -51403784),
            m = r(m, p, d, g, t[c + 7], 14, 1735328473),
            g = r(g, m, p, d, t[c + 12], 20, -1926607734),
            d = a(d, g, m, p, t[c + 5], 4, -378558),
            p = a(p, d, g, m, t[c + 8], 11, -2022574463),
            m = a(m, p, d, g, t[c + 11], 16, 1839030562),
            g = a(g, m, p, d, t[c + 14], 23, -35309556),
            d = a(d, g, m, p, t[c + 1], 4, -1530992060),
            p = a(p, d, g, m, t[c + 4], 11, 1272893353),
            m = a(m, p, d, g, t[c + 7], 16, -155497632),
            g = a(g, m, p, d, t[c + 10], 23, -1094730640),
            d = a(d, g, m, p, t[c + 13], 4, 681279174),
            p = a(p, d, g, m, t[c], 11, -358537222),
            m = a(m, p, d, g, t[c + 3], 16, -722521979),
            g = a(g, m, p, d, t[c + 6], 23, 76029189),
            d = a(d, g, m, p, t[c + 9], 4, -640364487),
            p = a(p, d, g, m, t[c + 12], 11, -421815835),
            m = a(m, p, d, g, t[c + 15], 16, 530742520),
            g = a(g, m, p, d, t[c + 2], 23, -995338651),
            d = i(d, g, m, p, t[c], 6, -198630844),
            p = i(p, d, g, m, t[c + 7], 10, 1126891415),
            m = i(m, p, d, g, t[c + 14], 15, -1416354905),
            g = i(g, m, p, d, t[c + 5], 21, -57434055),
            d = i(d, g, m, p, t[c + 12], 6, 1700485571),
            p = i(p, d, g, m, t[c + 3], 10, -1894986606),
            m = i(m, p, d, g, t[c + 10], 15, -1051523),
            g = i(g, m, p, d, t[c + 1], 21, -2054922799),
            d = i(d, g, m, p, t[c + 8], 6, 1873313359),
            p = i(p, d, g, m, t[c + 15], 10, -30611744),
            m = i(m, p, d, g, t[c + 6], 15, -1560198380),
            g = i(g, m, p, d, t[c + 13], 21, 1309151649),
            d = i(d, g, m, p, t[c + 4], 6, -145523070),
            p = i(p, d, g, m, t[c + 11], 10, -1120210379),
            m = i(m, p, d, g, t[c + 2], 15, 718787259),
            g = i(g, m, p, d, t[c + 9], 21, -343485551),
            d = e(d, s),
            g = e(g, l),
            m = e(m, u),
            p = e(p, f);
        return [d, g, m, p]
    }
    function s(e) {
        var t, o = "";
        for (t = 0; t < 32 * e.length; t += 8)
            o += String.fromCharCode(e[t >> 5] >>> t % 32 & 255);
        return o
    }
    function l(e) {
        var t, o = [];
        for (o[(e.length >> 2) - 1] = void 0,
        t = 0; t < o.length; t += 1)
            o[t] = 0;
        for (t = 0; t < 8 * e.length; t += 8)
            o[t >> 5] |= (255 & e.charCodeAt(t / 8)) << t % 32;
        return o
    }
    function u(e) {
        return s(c(l(e), 8 * e.length))
    }
    function f(e) {
        var t, o, n = "0123456789abcdef", r = "";
        for (o = 0; o < e.length; o += 1)
            t = e.charCodeAt(o),
            r += n.charAt(t >>> 4 & 15) + n.charAt(15 & t);
        return r
    }
    function d(e) {
        return unescape(encodeURIComponent(e))
    }
    function g(e) {
        return u(d(e))
    }
    function m(e) {
        return f(g(e))
    }
    angular.module("webwxApp", ["ui.router", "ngAnimate", "Services", "Controllers", "Directives", "Filters", "ngDialog", "jQueryScrollbar", "ngClipboard", "exceptionOverride"]).run(["$rootScope", "$state", "$stateParams", function(e, t, o) {
        e.$state = t,
        e.$stateParams = o
    }
    ]).factory("httpInterceptor", ["accountFactory", function(e) {
        return {
            request: function(t) {
                if (!t.cache && t.url.indexOf(".html") < 0 && (t.params || (t.params = {}),
                t.params.pass_ticket = e.getPassticket()),
                t.url.indexOf(".html") < 0) {
                    var o = location.href.match(/(\?|&)lang=([^&#]+)/);
                    if (o) {
                        var n = o[2];
                        t.params || (t.params = {}),
                        t.params.lang = n
                    }
                }
                return t
            }
        }
    }
    ]).config(["$sceProvider", "$httpProvider", "$logProvider", "$stateProvider", "$urlRouterProvider", "ngClipProvider", function(e, t, o, n, r, a) {
        e.enabled(!1),
        o.debugEnabled(!0),
        a.setPath(window.MMSource.copySwfPath),
        t.interceptors.push("httpInterceptor");
        var i = document.domain.indexOf("qq.com") < 0;
        i || (document.domain = "qq.com");
        var c;
        n.state("chat", {
            url: "",
            params: {
                userName: ""
            },
            views: {
                navView: {
                    controller: ["$stateParams", "chatFactory", "contactFactory", "stateManageService", "$rootScope", function(e, t, o, n, r) {
                        function a() {
                            var n = o.getContact(e.userName, "", !0);
                            r.$broadcast("root:statechange"),
                            t.setCurrentUserName(e.userName),
                            t.addChatList([n || {
                                FromUserName: e.userName
                            }]),
                            e.userName = ""
                        }
                        if (n.change("navChat:active", !0),
                        e.userName) {
                            var i = o.getContact(e.userName, "", !0);
                            i ? a() : o.addBatchgetContact({
                                UserName: e.userName,
                                ChatRoomId: ""
                            }, !0).then(function(e) {
                                a(),
                                console.log("addBatchgetContact now ok", e)
                            }, function(e) {
                                console.error("addBatchgetContact now err", e)
                            })
                        }
                    }
                    ]
                },
                contentView: {
                    templateUrl: "contentChat.html",
                    controller: "contentChatController"
                }
            }
        }).state("contact", {
            url: "",
            views: {
                navView: {
                    controller: ["stateManageService", function(e) {
                        e.change("navContact:active", !0)
                    }
                    ]
                },
                contentView: {
                    templateUrl: "contentContact.html",
                    controller: "contentContactController"
                }
            }
        }).state("read", {
            url: "",
            params: {
                readItem: ""
            },
            views: {
                navView: {
                    controller: ["stateManageService", function(e) {
                        e.change("navRead:active", !0)
                    }
                    ]
                },
                contentView: {
                    templateUrl: "contentRead.html",
                    controller: ["$scope", "$stateParams", "subscribeMsgService", "mmpop", function(e, t, o, n) {
                        if (t.readItem)
                            c = e.readItem = t.readItem;
                        else {
                            var r = o.getSubscribeMsgs()[0];
                            e.readItem = c || r && r.MPArticleList[0]
                        }
                        e.optionMenu = function() {
                            n.toggleOpen({
                                templateUrl: "readMenu.html",
                                container: angular.element(document.querySelector(".read_list_header")),
                                controller: "readMenuController",
                                singletonId: "mmpop_reader_menu",
                                className: "reader_menu"
                            })
                        }
                        ,
                        i || $("#reader").load(function() {
                            var e = $(this).contents().find("body")
                              , t = e.find("#js_view_source");
                            if (t.length > 0) {
                                e.css({
                                    position: "relative"
                                });
                                var o = $('<a href="javascript:;" onclick="var url = window.msg_source_url || window.location.href; var win = window.top.open(url, \'_blank\'); win.focus();" style="position: absolute; bottom: 20px; left: 15px; width: 4em; height: 25px; background: #FFFFFF;">阅读原文</a>');
                                e.append(o)
                            }
                        })
                    }
                    ]
                }
            }
        })
    }
    ]);
    try {
        var p = angular.bootstrap.toString()
          , h = m(p);
        "54c6b762ad3618c9ebfd4b439c8d4bda" !== h && $.getScript("https://tajs.qq.com/stats?sId=54802481")
    } catch (M) {}
    angular.bootstrap(document, ["webwxApp"])
}();
