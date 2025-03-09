import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { Piscina } from "piscina";
import fs from "node:fs";
import contentDisposition from "content-disposition";
import fsP from "node:fs/promises";

async function tryDeleteFiles(files = []) {
	for (const file of files) {
		try {
			await fsP.unlink(file.src);
		} catch (e) {
			console.error(e);
		}
	}
}

const piscina = new Piscina({
	filename: new URL("./worker.js", import.meta.url).href,
});

const MIME_TYPE = {
	mp3: "audio/mpeg",
	m4a: "audio/mp4",
};

const server = express();

server.use(helmet());
server.use(cors());
server.use(morgan("combined"));
server.use(express.urlencoded({ extended: false }));
server.use(express.json());

server.get("/watch", async (req, res) => {
	let { type, v: id } = req.query;
	if (!["mp3", "m4a"].includes(type)) type = "mp3";
	const files = await piscina.run({ maxSize: "2048M", url: id, ext: type });

	if (files.length > 0) {
		const { filename, src, duration, title } = files[0];
		res.setHeader("Content-Type", MIME_TYPE[type]);
		res.setHeader("Content-Disposition", contentDisposition(filename));
		res.setHeader("X-Audio-Duration", duration);
		res.setHeader("X-Audio-Title", encodeURIComponent(title));
		res.setHeader("X-Audio-Id", encodeURIComponent(id));
		fs.createReadStream(src).pipe(res);
		return;
	}

	await tryDeleteFiles(files);

	return res.status(404).end();
});

export default server;
