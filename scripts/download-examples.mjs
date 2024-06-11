import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

function getExamplesUrl(version) {
  return `https://raw.githubusercontent.com/elastic/built-docs/master/raw/en/elasticsearch/reference/${version}/alternatives_report.json`;
}

const packageJson = JSON.parse(fs.readFileSync('./package.json'));
const majorMinorVersion = packageJson.version.split(".").slice(0, 2).join(".");
let version = majorMinorVersion;
let response = await fetch(getExamplesUrl(version));
if (response.status === 404) {
  version = 'current';
  response = await fetch(getExamplesUrl(version));
}
if (response.status !== 200) {
  throw new Error('Cannot download examples');
}
console.log(`Downloaded "${version}" examples for version ${majorMinorVersion}.`);
const fileStream = fs.createWriteStream('.examples.json');
await finished(Readable.fromWeb(response.body).pipe(fileStream));
