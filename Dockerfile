FROM node:7

# RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#   && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

RUN apt-get update -q && apt-get install -qy \
      apt-utils \
      chromium \
      vim \
      xvfb \
    && rm -rf /tmp/*
      # google-chrome-stable \

WORKDIR /wechaty

COPY package.json .
RUN npm set progress=false \
  && npm install --loglevel warn \
  && rm -fr /tmp/*
  # && npm install ts-node typescript -g \

COPY . .
RUN npm link

ENTRYPOINT [ "/wechaty/bin/entrypoint.sh" ]
CMD [ "start" ]
