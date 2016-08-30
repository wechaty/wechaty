FROM node:6

# RUN mkdir /tmp/.X11-unix/ && chmod 777 /tmp/.X11-unix/
RUN apt-get update && apt-get install -y \
  apt-utils \
  dbus-x11 \
  xvfb

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable \
  && google-chrome --version

# RUN groupadd -r wechaty && useradd -m -r -g wechaty wechaty -d /wechaty

WORKDIR /wechaty
COPY package.json .
RUN npm install
COPY . .
RUN npm link \
  && bash -n entrypoint.sh \
  && chmod a+x entrypoint.sh

ENTRYPOINT [ "/wechaty/entrypoint.sh" ]
CMD [ "start" ]

# RUN chown -R wechaty.wechaty /wechaty
# USER wechaty
