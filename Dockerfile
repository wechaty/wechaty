FROM node:6

RUN apt-get update && apt-get install -y \
  apt-utils \
  chromium \
  vim \
  xvfb

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable \
  && google-chrome --version

WORKDIR /wechaty
COPY package.json .
RUN npm install && rm -fr /tmp/*
COPY . .
RUN npm link

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "start" ]

