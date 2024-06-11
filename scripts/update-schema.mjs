import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

function getSchemaUrl(version) {
  return `https://raw.githubusercontent.com/elastic/elasticsearch-specification/${version}/output/schema/schema.json`;
}

const packageJson = JSON.parse(fs.readFileSync('./package.json'));
const majorMinorVersion = packageJson.version.split(".").slice(0, 2).join(".");
let version = majorMinorVersion;
let response = await fetch(getSchemaUrl(version));
if (response.status === 404) {
  version = 'main';
  response = await fetch(getSchemaUrl(version));
}
if (response.status !== 200) {
  throw new Error(`Cannot download schema for ${majorMinorVersion}`);
}
console.log(`Updated schema to "${version}" for version ${majorMinorVersion}.`);
const fileStream = fs.createWriteStream('.examples.json');
await finished(Readable.fromWeb(response.body).pipe(fileStream));
