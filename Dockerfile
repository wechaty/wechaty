FROM node:6

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

RUN apt-get update -qq && apt-get install -qq -y \
  apt-utils \
  chromium \
  google-chrome-stable \
  vim \
  xvfb

WORKDIR /wechaty

COPY package.json .
RUN npm set progress=false \
  && npm install --loglevel warn \
  && rm -fr /tmp/*
COPY . .
RUN npm link

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "start" ]
