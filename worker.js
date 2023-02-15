import 'dotenv/config.js'
import fg from 'fast-glob';
import { temporaryDirectory } from 'tempy';
import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';
import watcher from '@parcel/watcher';
import { nanoid } from 'nanoid';
import { Telegraf } from 'telegraf';
import sanitize from 'sanitize-filename';

const { TELEGRAM_TOKEN } = process.env;
const bot = new Telegraf(TELEGRAM_TOKEN);

async function resolveSendFile(chatId, audioFile) {
  const { dir, name } = path.parse(audioFile);
  const infoPath = path.join(dir, name + ".info.json");
  const { title } = JSON.parse(await fs.readFile(infoPath));
  const filename = sanitize(title) + ".mp3";
  
  bot.telegram.sendChatAction(chatId, "upload_document");
  
  await bot.telegram.sendDocument(chatId, { source: audioFile, filename }, {
    caption: title,
  });

}

export default async function main({ url, chatId }) {
  // const cwd = temporaryDirectory();

  const cwd = path.resolve("./tmp/" + nanoid())
  await fs.mkdir(cwd, { recursive: true });

  const subscription = await watcher.subscribe(cwd, async (err, events) => {

    if (err) {
      console.error(err);
      return;
    }

    for (const event of events) {
      if (event.type === 'delete' && event.path.endsWith(".weba")) {
        const { dir, name } = path.parse(event.path);
        await resolveSendFile(chatId, path.join(dir, name + ".mp3"));
      }
    }
  })

  console.info("path: " + JSON.stringify(cwd));
  console.info('downloading: ' + JSON.stringify(url));

  await execa('yt-dlp', [
    "--extract-audio",
    "--write-info-json",
    "--no-part",
    "--no-playlist",
    "--embed-metadata",
    "--audio-format",
    "mp3",
    "--output",
    "%(id)s.%(ext)s",
    url
  ], { cwd });

  const files = [];

  for await (const audioFile of fg.stream(`${cwd}/*.mp3`)) {
    const { dir, name } = path.parse(audioFile);
    const infoPath = path.join(dir, name + ".info.json");
    const { title } = JSON.parse(await fs.readFile(infoPath));
    files.push({ title: title.slice(0, 255), src: audioFile });
  }

  await subscription.unsubscribe();
  return files;
}

