import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const EXAMPLES_URL = "https://raw.githubusercontent.com/elastic/built-docs/master/raw/en/elasticsearch/reference/current/alternatives_report.json";

const response = await fetch(EXAMPLES_URL);
const fileStream = fs.createWriteStream('.examples.json');
await finished(Readable.fromWeb(response.body).pipe(fileStream));
