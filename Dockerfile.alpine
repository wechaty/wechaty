#
# Wechaty Docker
# https://github.com/chatie/wechaty
#
# FROM alpine
#
# Docker image for Alpine Linux with latest ShellCheck, a static analysis tool for shell scripts.
# https://hub.docker.com/r/nlknguyen/alpine-shellcheck/
# FROM nlknguyen/alpine-shellcheck
FROM mhart/alpine-node:7
LABEL maintainer="Huan LI <zixia@zixia.net>"

RUN  apk update && apk upgrade \
  && apk add \
      bash \
      ca-certificates \
      chromium-chromedriver \
      chromium \
      coreutils \
      curl \
      ffmpeg \
      figlet \
      jq \
      moreutils \
      ttf-freefont \
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
  && npm --silent --progress=false install > /dev/null \
  && rm -fr /tmp/* ~/.npm

# Loading from node_modules Folders: https://nodejs.org/api/modules.html
# If it is not found there, then it moves to the parent directory, and so on, until the root of the file system is reached.
COPY . .
RUN  sed -i '/chromedriver/d' package.json \
  && npm run dist \
  && npm --silent --progress=false link \
  \
  && mkdir /bot \
  \
  && (   mkdir /node_modules && cd /node_modules \
      && ln -s /wechaty . \
      && ln -s /wechaty/node_modules/* . \
    ) \
  && ln -s /wechaty/tsconfig.json / \
  && echo "export * from 'wechaty'" > /index.ts \
  \
  && echo 'Linked wechaty to global'

VOLUME [ "/bot" ]

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "" ]

#
# https://docs.docker.com/docker-cloud/builds/advanced/
# http://label-schema.org/rc1/
#
LABEL org.label-schema.license="ISC" \
      org.label-schema.build-date="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
      org.label-schema.version="$DOCKER_TAG" \
      org.label-schema.schema-version="$(wechaty-version)" \
      org.label-schema.name="Wechaty" \
      org.label-schema.description="Wechat for Bot" \
      org.label-schema.usage="https://github.com/wechaty/wechaty/wiki/Docker" \
      org.label-schema.url="https://www.chatie.io" \
      org.label-schema.vendor="AKA Mobi" \
      org.label-schema.vcs-ref="$SOURCE_COMMIT" \
      org.label-schema.vcs-url="https://github.com/wechaty/wechaty" \
      org.label-schema.docker.cmd="docker run -ti --rm zixia/wechaty <code.js>" \
      org.label-schema.docker.cmd.test="docker run -ti --rm zixia/wechaty test" \
      org.label-schema.docker.cmd.help="docker run -ti --rm zixia/wechaty help" \
      org.label-schema.docker.params="WECHATY_TOKEN=token token from https://www.chatie.io"

#RUN npm test
