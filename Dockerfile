FROM node:7
ENV NPM_CONFIG_LOGLEVEL warn

# https://peteris.rocks/blog/quiet-and-unattended-installation-with-apt-get/
RUN  DEBIAN_FRONTEND=noninteractive apt-get -qq update > /dev/null \
  && apt-get -qqy -o Dpkg::Use-Pty=0 install \
      apt-utils \
      chromium \
      figlet \
      vim \
      xvfb \
  > /dev/null \
  && rm -rf /tmp/*

WORKDIR /wechaty

COPY package.json .
RUN  npm --progress false install > /dev/null \
  && rm -fr /tmp/*
  # && npm install ts-node typescript -g \

COPY . .
RUN npm --progress false link

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "start" ]
