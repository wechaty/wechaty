# The monster demo

Unlike all existing demos that emphasizes on _one specific side_ of the customization, this demo tries to incorporate anything that I think useful for a normal bot user. Hence the name, the _"monster"_ demo. It all begins when I was a JavaScript newbie, I felt the most helpful thing is not a 6-line demo code, but a comprehensive one that include all useful features, because newbie like me can't put them together.

This demo is a _one-stop_ demo that includes _everything useful_ for people to get an easier start. Because it is much simpler to remove an module from it, rather than figuring out how to put all these jigsaw puzzles together.


The following are the list of useful features incorporated into this demo:

- _Pure ES6_ code, no Typescript
- All _even handling_ in **separated** code, instead of everything in a big file
- _Hot reload/import even handling_ code, without restarting the program
- _Hot reload/import configuration_ files as well
- _Auto-save all media files_, i.e., incorporates `media-file-bot.ts` into this getting started demo
- _emoji cleansing_ -- to simplify emoji from `<img class="qqemoji qqemoji13" text="[呲牙]_web" src="https://wx.qq.com/zh_CN/htmledition/v2/images/spacer.gif" />` to merely `[呲牙]`
- _Graceful exit_ on `SIGINT/SIGTERM` etc, i.e., to write key info into file, on receiving killing signals (e.g., `SIGINT (2), SIGTERM(3)`), before termination, so as to do a _"graceful shutdown"_. 

All in all, it will be a _turn key solution_ for getting started with wechaty customization seriously, a true blue-print solution for people to get started using wechaty.

## About hot-import

Hot import Wechaty listenser functions after change the source code without restart the program

This directory is an example of how to use `hot-import` 
feature introduced in [this commit](https://github.com/Chatie/wechaty/commit/c47715b4470e7ade9a2590fd3e66985dd7977622). 

The hot-import is based on an npm package [hot-import](https://www.npmjs.com/package/hot-import)

## About Pure ES6 instead of Typescript

Caution! This section is long!

### Typescript is not necessary

- Looking at the [ES6 support in Node.js](http://node.green/), I can see really really few ES6 features are unsupported now. I.e., only very few _extreme_ end-cases are left. 
- Furthermore, I don't know how well the transpiling is, e.g., for the advanced ES6 features like `map`, `filter` and `reduce`, I don't know how efficient the transpiled code is.
- Starting with version 8.5.0, Node.js even supports ES modules natively, so we can do `import {add} from './lib.mjs';` directly in ES6 now.
- I.e., the ES6 is ready for prime time use, writing in TypeScript then have it transpiled into ES6 code seems like a redundant step now. (I'm not saying that TypeScript is not helpful, it is still good in big projects that you have some dummies really easily to shoot their own feet)
- Moreover, most of wechaty examples are in fact plain ES6, not TypeScript (because of missing type declaration for every variable, which is the # 1 feature that TypeScript boasts with), so making such extra transpiling step seems even more unnecessary to me.

### ES6 is the future, not Typescript

Here is some good reading that I want to share with you, 

**When are you better off without Typescript?** --   
[_When you can’t afford an extra transpilation tax_](https://medium.freecodecamp.org/when-should-i-use-typescript-311cb5fe801b)

> There are no plans to support TypeScript natively in the browsers. Chrome did some experiment, but later cancelled support. I suspect this has something to do with unnecessary runtime overhead.
If someone wants training wheels, they can install them. But bikes shouldn’t come with permanent training wheels. This means that you will always have to transpile your TypeScript code before running them.
> For standard ES6, it’s a whole different story. When ES6 is supported by most browsers, the current ES6 to ES5 transpilation will become unnecessary.
> ES6 is the biggest change to the JavaScript language, and I believe most programmers will just settle with it. But those brave few who want to try the next version of JavaScript’s experimental features, or the features not yet implemented on all browsers — they will need to transpile anyway.

### Typescript has an evil source and evil goal

Typescript is from Microsoft, which is the source of all evil.

From above article,

> The old Microsoft used to take standard tools — Java for example — and add proprietary non-standard features to them — in this case resulting in J++. **Then they would try to force developers to choose between the two**.
> TypeScript is exactly the same approach — this time for JavaScript. By the way, **this isn’t Microsoft’s first fork of JavaScript. In 1996, they forked JavaScript to create JScript**.

JavaScript has no types, this has it advantages and disadvantages. However, IMHO, its disadvantages has been over-proportionally emphasized and exaggerated, and its advantages has been down-played greatly. If using Typescript, then such advantages will be completely lost, and you'll get completely restrained, that's what MS does best. Here is a little example, out of the very limited hours I've been using JavaScript -- to write a wechaty simulation driving code, it'd be impossible to [write such simulation in such simple way](https://github.com/Chatie/wechaty/issues/1095#issuecomment-366595388), had I been writing my code in TypeScript.

So, thank but no thanks to MS' JScript, or TypeScript, without the type restriction, the rest of the TypeScript hypes are actually come from ES6, which is what I'll stick to instead. 

### Typescript will be abandoned

Typescript will be abandoned by Microsoft, some day. Mark my words for it. 

The philosophy that I resist anything that MS proposes has a long history of me, as a programmer, who was forced onto the MS band wagon for their shinny new toys, then get thrown under the bus when MS abandon them. Not many programmers start the love-hate affair with MS since DOS2.0, through DOS3.0 all they way to DOS5.0. Not many programmers have ever heard of OLE, DDE, DAO, ADO, ADO2, and the stories behind their rise and fall, yet I was the one who bite the bullet and gone through them all. Even today, I'm still living through the consequences of MS abandoning silverlight, for all these past several years. 

### In summary

I know TypeScript does has its place, and the first part of the above article did list many of them. But still I'll never buy it. Quoting a sentence I like from the above article,

> TypeScript haters are gonna hate, either because of fear of change or because they know somebody who knows somebody who is afraid of it. Life goes on and TypeScript introduces new features to its community anyway.

All in all, I'll stick to ES6 and never use TypeScript. It might be my personal choice, but I'm glad I'm not along -- check this out

[**Don't Transpile JavaScript for Node.js**](http://vancelucas.com/blog/dont-transpile-javascript-for-node-js/)

### Postlude

PS, if I do have to write something that has to be transpiled first before running, it is got to be the [Dart programming language](https://en.wikipedia.org/wiki/Dart_(programming_language)), because of the new Google's mobile UI framework, [Flutter](https://flutter.io/?utm_source=google&utm_medium=blog&utm_campaign=beta_announcement), introduce on February 27, 2018, at Mobile World Congress 2018.

Don't get me started on this, but check out the following yourself:

**Google announced the first beta of Flutter**  
https://flutter.io/?utm_source=google&utm_medium=blog&utm_campaign=beta_announcement

**Flutter Will Take Off in 2018**  
https://codeburst.io/why-flutter-will-take-off-in-2018-bbd75f8741b0


**What’s Revolutionary about Flutter**  
https://hackernoon.com/whats-revolutionary-about-flutter-946915b09514

**Why we chose Flutter and how it’s changed our company for the better**  
https://medium.com/@matthew.smith_66715/why-we-chose-flutter-and-how-its-changed-our-company-for-the-better-271ddd25da60

**Google跨平台UI框架 Flutter beta 重磅发布**  
https://juejin.im/post/5a964adf5188257a690f9a85

**Why I moved from JavaScript to Dart**  
https://hackernoon.com/why-i-moved-from-javascript-to-dart-9ff55a108ff4#.ezyej7cdr

**Why I moved from Java to Dart**  
https://hackernoon.com/why-i-moved-from-java-to-dart-8f3802b1d652

