FROM zixia/wechaty

ONBUILD ARG NODE_ENV
ONBUILD ENV NODE_ENV $NODE_ENV

ONBUILD WORKDIR /bot

ONBUILD COPY package.json .
ONBUILD RUN jq 'del(.dependencies.wechaty)' package.json | sponge package.json \
    && npm install \
    && sudo rm -fr /tmp/* ~/.npm
ONBUILD COPY . .

CMD [ "npm", "start" ]
