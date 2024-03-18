FROM node:lts-iron

WORKDIR /botlarr/app
COPY . .
RUN yarn install

ENTRYPOINT [ "node", "src/index.js" ]