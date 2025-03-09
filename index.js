import YouTubeUrl from "youtube-url";
import "dotenv/config.js";
import { Piscina } from "piscina";
import { Telegraf } from "telegraf";
import PQueue from "p-queue";
import http from "./http.js";
import gracefulShutdown from "http-graceful-shutdown";
import fs from "node:fs/promises";

async function tryDeleteFiles(files = []) {
	for (const file of files) {
		try {
			await fs.unlink(file.src);
		} catch (e) {
			console.error(e);
		}
	}
}

const { TELEGRAM_TOKEN } = process.env;
const workerFilename = new URL("./worker.js", import.meta.url).href;
const queue = new PQueue({ concurrency: 10 });
const piscina = new Piscina({ filename: workerFilename });

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) =>
	ctx.reply(
		"Hi! Get started by sending me a link of YouTube video or playlist.",
	),
);

bot.on("message", async (ctx) => {
	queue.add(async () => {
		const text = ctx.message.text;

		const download = async (url) => {
			ctx.sendChatAction("typing");
			const files = await piscina.run({ url, chatId: ctx.message.chat.id });
      ctx.sendChatAction("upload_voice");

			for (const { filename, src, title, duration } of files) {
				ctx.sendChatAction("upload_voice");
				await ctx.replyWithAudio(
					{
						source: src,
						filename,
					},
					{
						duration,
						//caption: title,
						title: title,
					},
				);
			}
      
			await tryDeleteFiles(files);
		};

		if (YouTubeUrl.valid(text)) {
			await ctx.reply("Your video is being downloaded");
			await download(text);
			return;
		}

		if (/\/playlist/i.test(text)) {
			await ctx.reply("Your video playlist is being downloaded");
			await download(text);
			return;
		}

		if (
			/^(https?:\/\/)?(www.)?(youtube\.com|youtu\.be)\/(live\/)?(\w+)/i.test(
				text,
			)
		) {
			const result =
				/^(https?:\/\/)?(www.)?(youtube\.com|youtu\.be)\/(live\/)?(\w+)/i.exec(
					text,
				);

			if (result) {
				const videoId = result[5];
				await ctx.reply(`Your live video is being downloaded. [${videoId}]`);
				await download(videoId);
				return;
			}
		}

		await ctx.reply("invalid");
	});
});

http.listen(process.env.PORT || 8080, () => bot.launch());

gracefulShutdown(http);
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
