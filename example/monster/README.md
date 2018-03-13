# The monster demo

Unlike all existing demos that emphasizes on _one specific side_ of the customization, this demo tries to incorporate anything that I think useful for a normal bot user. Hence the name, the _"monster"_ demo. It all begins when I was a JavaScript newbie, I felt the most helpful thing is not a 6-line demo code, but a comprehensive one that include all useful features, because newbie like me can't put them together.

This demo is a _one-stop_ demo that includes _everything useful_ for people to get an easier start. Because it is much simpler to remove an module from it, rather than figuring out how to put all these jigsaw puzzles together.


The following are the list of useful features incorporated into this demo:

- _Pure ES6_ JavaScript code, no Typescript and no need the superficial transpiling step
- All _even handling_ in **separated** code, instead of everything in a big file
- Can read from a config file
- Can do rooms/messages matching using regexp that are defined in the config file
- Can do hot reload, when the `.js` scripts/files are updated
  * _Hot reload/import even handling_ code, without restarting the program
  * _Hot reload/import configuration_ files as well
- _Auto-save all media files_, i.e., incorporates `media-file-bot.ts` into this getting started demo
- _Emoji cleansing_ -- to simplify emoji from `<img class="qqemoji qqemoji13" text="[呲牙]_web" src="https://wx.qq.com/zh_CN/htmledition/v2/images/spacer.gif" />` to merely `[呲牙]`
- Add error handling in `on-message.js` to catch errors instead of failing the program
- _Graceful exit_ on `SIGINT/SIGTERM` etc, i.e., to write key info into file, on receiving killing signals (e.g., `SIGINT (2), SIGTERM(3)`), before termination, so as to do a _"graceful shutdown"_. 

All in all, it will be a _turn key solution_ for getting started with wechaty customization seriously, a true blue-print solution for people to get started using wechaty.

## Run

```shell
docker run -t -i --rm --name wechaty --mount type=bind,source="$(pwd)",target=/bot zixia/wechaty index.js
```

Or

```shell
./run-monster-bot.sh
```

## About hot-import

Hot import Wechaty listenser functions after change the source code without restart the program

This directory is an example of how to use `hot-import` 
feature introduced in [this commit](https://github.com/Chatie/wechaty/commit/c47715b4470e7ade9a2590fd3e66985dd7977622). 

The hot-import is based on an npm package [hot-import](https://www.npmjs.com/package/hot-import)

## About Pure ES6 instead of Typescript

When I code customization code for [wechaty](https://github.com/Chatie/wechaty/), I write everything in pure ES6 instead of Typescript, and there are strong reasons for that. For details, check out my blog entry,

[**Can Typescript really live up to its hype?**](https://blog.chatie.io/2018/03/09/can-typescript-really-live-up-to-its-hype.html)
