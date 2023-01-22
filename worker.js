import fg from 'fast-glob';
import { temporaryDirectory } from 'tempy'
import { execa } from 'execa'

export default async function ({ url }) {
  const cwd = temporaryDirectory();
  console.info("path: " + JSON.stringify(cwd));
  console.info('downloading: ' + JSON.stringify(url))
  await execa('yt-dlp', [
    "--extract-audio",
    "--quiet",
    "--no-part",
    "--no-playlist",
    "--audio-format",
    "mp3",
    url
  ], { cwd });

  const files = await fg(`${cwd}/*.mp3`);
  return files;
}