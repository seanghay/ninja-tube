FROM node:22-alpine

RUN apk update && apk add -U yt-dlp

WORKDIR /app

COPY package.json .
RUN npm install --no-audit --no-fund

COPY *.js .

EXPOSE 8080
CMD [ "node", "index.js" ]