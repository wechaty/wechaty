#
# Wechaty Docker
# https://github.com/wechaty/wechaty
#
FROM alpine
MAINTAINER Zhuophuan LI <zixia@zixia.net>

RUN  apk update && apk upgrade \
  && apk add nodejs \
      bash \
      ca-certificates \
      chromium-chromedriver \
      chromium \
      coreutils \
      figlet \
      udev \
      vim \
      xauth \
      xvfb \
  && rm -rf /tmp/* /var/cache/apk/*

RUN mkdir /wechaty
WORKDIR /wechaty

# npm `chromedriver` not support alpine linux
# https://github.com/giggio/node-chromedriver/issues/70
COPY package.json .
RUN  sed -i '/chromedriver/d' package.json \
  && npm --progress=false install > /dev/null \
  && rm -fr /tmp/* ~/.npm

COPY . .
RUN  sed -i '/chromedriver/d' package.json \
  && npm --progress=false link

# Loading from node_modules Folders: https://nodejs.org/api/modules.html
# If it is not found there, then it moves to the parent directory, and so on, until the root of the file system is reached.
RUN mkdir /bot \
  && ln -s /usr/local/lib/node_modules / \
  && ln -s /wechaty/tsconfig.json / \
  && ln -s /wechaty/bin/xvfb-run /usr/local/bin

VOLUME [ "/bot" ]

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "start" ]

#RUN npm test
