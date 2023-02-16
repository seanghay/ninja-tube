import path from 'path'
import YouTubeUrl from 'youtube-url'
import 'dotenv/config.js';
import { Piscina } from 'piscina';
import { Telegraf } from 'telegraf';
import PQueue from 'p-queue';
import sanitize from 'sanitize-filename';

const { TELEGRAM_TOKEN } = process.env;
const workerFilename = new URL("./worker.js", import.meta.url).href
const queue = new PQueue({ concurrency: 10 });
const piscina = new Piscina({ filename: workerFilename });

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start(ctx => ctx.reply("Hi! Get started by sending me a link of YouTube video or playlist."));
bot.on('message', async ctx => {
  queue.add(async () => {

    const text = ctx.message.text;
    
    const download = async () => {
      const files = await piscina.run({ url: text, chatId: ctx.message.chat.id });
      for (const { src, title } of files) {
        const filename = sanitize(title) + ".mp3";
        ctx.sendChatAction('upload_document');
        await ctx.replyWithDocument({ source: src, filename }, {
          caption: title,
        });
      }
    }

    if (YouTubeUrl.valid(text)) {
      await ctx.reply("Your video is being downloaded");
      await download();
      return;
    }

    if (/\/playlist/i.test(text)) {
      await ctx.reply("Your video playlist is being downloaded");
      await download();
      return;
    }

    if (/(https?:\/\/)?(www.)?(youtube\.com|youtu\.be)\/\w+/i.test(text)) {
      await ctx.reply("Your live video is being downloaded");
      await download();
    }

    await ctx.reply("invalid");
  })
})


await bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
