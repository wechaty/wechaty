# HOT-IMPORT LISTENSER

**PR from @xinbenlv**

Hot import Wechaty listenser functions after change the source code without restart the program

This directory is an example of how to use `hot-import` 
feature introduced in [this commit](https://github.com/Chatie/wechaty/commit/c47715b4470e7ade9a2590fd3e66985dd7977622). 

The hot-import is based on an npm package [hot-import](https://www.npmjs.com/package/hot-import)

Not to be confused by the directory `../hot-reload-bot` which is a hand written
hot reload approach proposed by [Gcaufy](https://github.com/Gcaufy)


## Run

 ```shell
 docker run -t -i --rm --name wechaty --mount type=bind,source="$(pwd)",target=/bot zixia/wechaty index.js
 ```

Or

```shell
./run-hot-import-bot.sh
```

