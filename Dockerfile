FROM ubuntu:17.10
LABEL maintainer="Huan LI <zixia@zixia.net>"

ENV NPM_CONFIG_LOGLEVEL warn
ENV DEBIAN_FRONTEND     noninteractive

# Installing the 'apt-utils' package gets rid of the 'debconf: delaying package configuration, since apt-utils is not installed'
# error message when installing any other package with the apt-get package manager.
# https://peteris.rocks/blog/quiet-and-unattended-installation-with-apt-get/
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-utils \
    bash \
    ca-certificates \
    curl \
    coreutils \
    figlet \
    jq \
    libav-tools \
    moreutils \
    sudo \
    ttf-freefont \
    vim \
    wget \
  && rm -rf /tmp/* /var/lib/apt/lists/* \
  && apt-get purge --auto-remove

RUN curl -sL https://deb.nodesource.com/setup_8.x | bash - \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /tmp/* /var/lib/apt/lists/* \
    && apt-get purge --auto-remove

# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md
# https://github.com/ebidel/try-puppeteer/blob/master/backend/Dockerfile
# Install latest chrome dev package.
# Note: this also installs the necessary libs so we don't need the previous RUN command.
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update && apt-get install -y --no-install-recommends \
      google-chrome-unstable \
    && rm -rf /tmp/* /var/lib/apt/lists/* \
    && apt-get purge --auto-remove

# Add chatie user.
RUN groupadd bot && useradd -g bot -d /bot -m -G audio,video,sudo bot \
    && mkdir -p /bot/Downloads \
    && chown -R bot:bot /bot \
    && echo "bot   ALL=NOPASSWD:ALL" >> /etc/sudoers

RUN mkdir /wechaty \
    && chown -R bot:bot /wechaty \
    && mkdir /node_modules

WORKDIR /wechaty

# Run user as non privileged.
USER bot

COPY package.json .
RUN  npm install \
  && sudo rm -fr /tmp/* ~/.npm

COPY . .
RUN  npm run dist

# Loading from node_modules Folders: https://nodejs.org/api/modules.html
# If it is not found there, then it moves to the parent directory, and so on, until the root of the file system is reached.
RUN sudo npm link \
    && sudo ln -s /wechaty /node_modules/wechaty \
    && sudo ln -s /wechaty/node_modules/* /node_modules/ \
    && sudo ln -s /wechaty/tsconfig.json / \
    && echo "export * from 'wechaty'" | sudo tee /index.ts \
    && echo 'Linked wechaty to global'

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "" ]

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
      org.label-schema.docker.params="WECHATY_TOKEN=token token from https://www.chatie.io"

#RUN npm test
