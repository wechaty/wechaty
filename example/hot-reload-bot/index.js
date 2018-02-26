/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * Wechaty hot load dots demo
 *
 * @deprecated
 * Use hot-import-bot instead
 * See: https://github.com/Chatie/wechaty/tree/master/example/hot-import-bot
 *
 * DEV: docker run -ti -e --rm --volume="$(pwd)":/bot zixia/wechaty index.js
 * PROD: docker run -ti -e NODE_ENV=production --rm --volume="$(pwd)":/bot zixia/wechaty index.js
 *
 * @author: Gcaufy
 */
const fs          = require('fs');
const path        = require('path');
const { Wechaty } = require('wechaty');

const isProd = process.env.NODE_ENV === 'production';
const bot = Wechaty.instance();

const EVENT_LIST = ['scan', 'logout', 'login', 'friend', 'room-join', 'room-leave', 'room-topic', 'message', 'heartbeat', 'error'];

// Load lisenter
const loadListener = (evt) => {
    let fn;
    try {
        fn = require(`./listener/${evt}`);
        console.log(`binded listener: ${evt}`);
    } catch (e) {
        fn = () => void 0;
        if (e.toString().indexOf('Cannot find module') > -1) {
            console.warn(`listener ${evt} is not defined.`);
        } else {
            console.error(e);
        }
    }
    return fn;
}

// purge require cache
const purgeCache = (moduleName) => {
    var mod = require.resolve(moduleName);
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function traverse(mod) {
            mod.children.forEach(function (child) {
                traverse(child);
            });
            delete require.cache[mod.id];
        }(mod));
    }

    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(moduleName)>0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

let eventHandler = {};


if (!isProd) { // start a watcher only if it's not production environment.
    fs.watch('./listener', (e, filename) => {
        let evt = filename.substring(0, filename.length - 3);
        console.log(`${e}: ${filename}`);

        if (EVENT_LIST.indexOf(evt) > -1) {
            if (e === 'change') {
                console.log(`${evt} listener reloaded.`);
                purgeCache(`./listener/${evt}`);
                // It may read an empty file, if not use setTimeout
                setTimeout(() => {
                    bot.removeListener(evt, eventHandler[evt]);
                    //console.log('filecontent: ' + fs.readFileSync(`./listener/${evt}.js`));
                    eventHandler[evt] = loadListener(evt);
                    bot.on(evt, eventHandler[evt]);
                }, 1000);
            } else if (e === 'rename') {
                console.log(`${evt} listener removed.`);
                bot.removeListener(evt, eventHandler[evt]);
                eventHandler[evt] = () => void 0;
                bot.on(evt, eventHandler[evt]);
            }
        }
    });
}

// Bind events
EVENT_LIST.forEach(evt => {
    eventHandler[evt] = loadListener(evt);
    bot.on(evt, eventHandler[evt]);
});

console.log(`

ATTENTION: This example is DEPRECATED.

Please see https://github.com/Chatie/wechaty/tree/master/example/hot-reload-bot instead.

`)

bot.init();
