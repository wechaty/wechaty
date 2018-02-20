FROM ubuntu:17.10
LABEL maintainer="Huan LI <zixia@zixia.net>"

ENV DEBIAN_FRONTEND     noninteractive
ENV WECHATY_DOCKER      1
ENV LC_ALL              C.UTF-8
ENV NODE_ENV            $NODE_ENV
ENV NPM_CONFIG_LOGLEVEL warn

# Installing the 'apt-utils' package gets rid of the 'debconf: delaying package configuration, since apt-utils is not installed'
# error message when installing any other package with the apt-get package manager.
# https://peteris.rocks/blog/quiet-and-unattended-installation-with-apt-get/
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-utils \
    bash \
    build-essential \
    ca-certificates \
    curl \
    coreutils \
    figlet \
    git \
    jq \
    libav-tools \
    libgconf-2-4 \
    moreutils \
    shellcheck \
    sudo \
    ttf-freefont \
    tzdata \
    vim \
    wget \
  && apt-get purge --auto-remove \
  && rm -rf /tmp/* /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_9.x | bash - \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && apt-get purge --auto-remove \
    && rm -rf /tmp/* /var/lib/apt/lists/*

# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md
# https://github.com/ebidel/try-puppeteer/blob/master/backend/Dockerfile
# Install latest chrome dev package.
# Note: this also installs the necessary libs so we don't need the previous RUN command.
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update && apt-get install -y --no-install-recommends \
      google-chrome-unstable \
    && apt-get purge --auto-remove \
    && rm -rf /tmp/* /var/lib/apt/lists/* \
    && rm -rf /usr/bin/google-chrome* /opt/google/chrome-unstable

RUN mkdir /wechaty \
    && mkdir /node_modules

WORKDIR /wechaty

COPY package.json .
RUN npm install \
  && sudo rm -fr /tmp/* ~/.npm

COPY . .
# RUN npm run test:debug
RUN ./script/safe-test.sh
RUN npm run dist

# Loading from node_modules Folders: https://nodejs.org/api/modules.html
# If it is not found there, then it moves to the parent directory, and so on, until the root of the file system is reached.
RUN sudo mkdir /bot \
    && npm link \
    && sudo ln -s /wechaty /node_modules/wechaty \
    && sudo ln -s /wechaty/node_modules/* /node_modules/ \
    && sudo ln -s /wechaty/node_modules/.bin/* /usr/local/bin/ \
    && sudo ln -s /wechaty/tsconfig.json / \
    && echo "export * from 'wechaty'" | sudo tee /index.ts \
    && echo 'Linked Wechaty to Global'

ENTRYPOINT  [ "/wechaty/bin/entrypoint.sh" ]
CMD         [ "" ]

#
# https://docs.docker.com/docker-cloud/builds/advanced/
# http://label-schema.org/rc1/
#
LABEL org.label-schema.license="Apache-2.0" \
      org.label-schema.build-date="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
      org.label-schema.version="$DOCKER_TAG" \
      org.label-schema.schema-version="$(wechaty-version)" \
      org.label-schema.name="Wechaty" \
      org.label-schema.description="Wechat for Bot" \
      org.label-schema.usage="https://github.com/chatie/wechaty/wiki/Docker" \
      org.label-schema.url="https://www.chatie.io" \
      org.label-schema.vendor="Chatie" \
      org.label-schema.vcs-ref="$SOURCE_COMMIT" \
      org.label-schema.vcs-url="https://github.com/chatie/wechaty" \
      org.label-schema.docker.cmd="docker run -ti --rm zixia/wechaty <code.js>" \
      org.label-schema.docker.cmd.test="docker run -ti --rm zixia/wechaty test" \
      org.label-schema.docker.cmd.help="docker run -ti --rm zixia/wechaty help" \
      org.label-schema.docker.params="WECHATY_TOKEN=token token from https://www.chatie.io, WECHATY_LOG=verbose Set Verbose Log, TZ='Asia/Shanghai' TimeZone"

