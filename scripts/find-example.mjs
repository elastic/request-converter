import { readFile } from "fs/promises";
import { Command } from "commander";

const examples = JSON.parse(await readFile('.examples.json', {encoding: 'utf-8'}));
const program = new Command()
  .name("find-example")
  .description("Find Elasticsearch examples by their digest")
  .argument('<example-digest>')

program.parse();
const digest = program.args[0];

let found = false;
for (const example of examples) {
  if (example.digest === digest) {
    console.log(example.source);
    found = true;
    break;
  }
}

if (!found) {
  console.log('Example not found');
}
