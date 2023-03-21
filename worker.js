import 'dotenv/config.js'
import fg from 'fast-glob';
import { temporaryDirectory } from 'tempy';
import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';
import sanitize from 'sanitize-filename';

export default async function main({ url, ext = "mp3" }) {
  const cwd = temporaryDirectory();

  // const cwd = path.resolve("./tmp/" + nanoid())
  await fs.mkdir(cwd, { recursive: true });

  console.info("path: " + JSON.stringify(cwd));
  console.info('downloading: ' + JSON.stringify(url));

  const args = (ext === "mp3") ? [
    "--extract-audio",
    "--audio-format",
    "mp3",
  ] : [
    "-f",
    "ba[ext=m4a]"
  ]

  const subprocess = execa('yt-dlp', [
    "--write-info-json",
    "--no-part",
    "--no-playlist",
    "--embed-metadata",
    "--max-filesize",
    "50M",
    ...args,
    "--output",
    "%(id)s.%(ext)s",
    url
  ], { cwd });

  subprocess.stdout.pipe(process.stdout);

  await subprocess;

  const files = [];

  for await (const audioFile of fg.stream(`${cwd}/*.${ext}`)) {
    const { dir, name } = path.parse(audioFile);
    const infoPath = path.join(dir, name + ".info.json");
    const info = JSON.parse(await fs.readFile(infoPath));
    const { title, duration } = info;
    const filename = sanitize(title) + "." + ext;

    files.push({
      filename,
      duration,
      title: title.slice(0, 255),
      src: audioFile
    });
  }

  return files;
}

