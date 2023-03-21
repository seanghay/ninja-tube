# 🥷 Ninja Tube 

A Telegram bot to download mp3 from You[t]ube by just sending the link to it.

- It uses `yt-dlp` to fetch video info.
- It uses `piscina` for pooling Node.js workers for faster download.
- It uses `p-queue` to queue requests.
- It store files under `/tmp` directory, so it will be disposed after it's done.
- It transcodes audio to mp3
- It cannot send audio larger than 50MB.

## Development

Make you have `.env` in the `cwd` with the content below

```sh
TELEGRAM_TOKEN=
```

I used `node-16`

Install deps

```sh
npm install
```

Run

```sh
node index.js
```
