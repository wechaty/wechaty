#
# Wechaty Docker
# https://github.com/wechaty/wechaty
#
# FROM alpine
#
# Docker image for Alpine Linux with latest ShellCheck, a static analysis tool for shell scripts.
# https://hub.docker.com/r/nlknguyen/alpine-shellcheck/
# FROM nlknguyen/alpine-shellcheck
FROM mhart/alpine-node:7
MAINTAINER Zhuophuan LI <zixia@zixia.net>

RUN  apk update && apk upgrade \
  && apk add \
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
  && echo -e 'nameserver 114.114.114.114\nnameserver 114.114.115.115' >> /etc/resolv.conf \
  && rm -rf /tmp/* /var/cache/apk/*

RUN mkdir /wechaty
WORKDIR /wechaty

# npm `chromedriver` not support alpine linux
# https://github.com/giggio/node-chromedriver/issues/70
COPY package.json .
RUN  sed -i '/chromedriver/d' package.json \
  && npm --progress=false install > /dev/null \
  && rm -fr /tmp/* ~/.npm

# Loading from node_modules Folders: https://nodejs.org/api/modules.html
# If it is not found there, then it moves to the parent directory, and so on, until the root of the file system is reached.
COPY . .
RUN  sed -i '/chromedriver/d' package.json \
  && npm run build \
  && npm --progress=false link \
  \
  && mkdir /bot \
  && mkdir /node_modules \
  && ln -s /wechaty /node_modules \
  && ln -s /wechaty/tsconfig.json / \
  \
  && echo 'Linked wechaty to global'

VOLUME [ "/bot" ]

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "start" ]

LABEL org.label-schema.license=ISC \
      org.label-schema.vcs-ref=master \
      org.label-schema.vcs-url=https://github.com/wechaty/wechaty

#RUN npm test
