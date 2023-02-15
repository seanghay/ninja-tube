import fg from 'fast-glob';
import { temporaryDirectory } from 'tempy'
import { execa } from 'execa'
import fs from 'node:fs/promises'
import path from 'node:path'

export default async function main({ url }) {
  const cwd = temporaryDirectory();
  // const cwd = path.resolve("./tmp/" + nanoid())
  await fs.mkdir(cwd, { recursive: true });
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
  return files;
}
