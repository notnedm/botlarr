FROM node:lts-iron

WORKDIR /botlarr/app
COPY . .
RUN yarn install
RUN yarn build

ENTRYPOINT [ "node", "dist/app.js" ]