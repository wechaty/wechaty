# HOT-IMPORT LISTENSER

Hot import Wechaty listenser functions after change the source code without restart the program

## Run

 ```shell
 docker run -t -i --rm --name wechaty --mount type=bind,source="$(pwd)",target=/bot zixia/wechaty index.js
 ```

Or

```shell
./run-hot-import-bot.sh
```

 ## See Also
 
 We are using the hot-import module: [Hot Module Replacement(HMR) for Node.js](https://www.npmjs.com/package/hot-import)
