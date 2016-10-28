FROM node:7
ENV NPM_CONFIG_LOGLEVEL warn

# Installing the 'apt-utils' package gets rid of the 'debconf: delaying package configuration, since apt-utils is not installed'
# error message when installing any other package with the apt-get package manager.
# https://peteris.rocks/blog/quiet-and-unattended-installation-with-apt-get/
RUN apt-get update > /dev/null 2>&1 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    apt-utils \
  > /dev/null 2>&1 \
  && rm -rf /var/lib/apt/lists/*

# 1. xvfb depend on xauth
# 2. chromium(with webdriver) depend on libgconf-2-4
RUN  apt-get update > /dev/null \
  && DEBIAN_FRONTEND=noninteractive apt-get -qqy --no-install-recommends -o Dpkg::Use-Pty=0 install \
      chromium \
      figlet \
      libgconf-2-4 \
      vim \
      xauth \
      xvfb \
  > /dev/null \
  && rm -rf /tmp/* /var/lib/apt/lists/*

RUN mkdir /wechaty
WORKDIR /wechaty

COPY package.json .
RUN  npm --progress false install > /dev/null \
  && rm -fr /tmp/*
  # && npm install ts-node typescript -g \

COPY . .
RUN npm --progress false link

VOLUME [ "/app" ]

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "start" ]
