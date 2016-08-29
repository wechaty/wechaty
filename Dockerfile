FROM node:6.4

RUN apt-get update && apt-get install -y \
  apt-utils \
  xvfb

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable \
  && google-chrome --version

RUN groupadd -r wechaty && useradd -m -r -g wechaty wechaty -d /wechaty

WORKDIR /wechaty
COPY . .
RUN npm install

COPY entrypoint.sh /entrypoint.sh
RUN bash -n /entrypoint.sh && chmod a+x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "start" ]

RUN chown -R wechaty.wechaty /wechaty
USER wechaty
