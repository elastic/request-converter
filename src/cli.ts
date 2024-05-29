import { Command, Option } from "commander";
import { convertRequests } from "./convert";

async function main() {
  const program = new Command();
  program
    .name("request-converter")
    .description("Convert Elasticsearch Dev Console scripts to other languages")
    .addOption(
      new Option("-f, --format <format>", "export format")
        .choices(["python", "javascript"])
        .makeOptionMandatory(),
    )
    .option("--complete", "output complete code", false)
    .option("--print-response", "add code to print response", false);

  program.parse();
  const opts = program.opts();

  let data = "";
  for await (const chunk of process.stdin) {
    data += chunk;
  }

  const code = (await convertRequests(data, opts.format, {
    complete: opts.complete,
    printResponse: opts.printResponse,
  })) as string;
  process.stdout.write(code);
}

main();
