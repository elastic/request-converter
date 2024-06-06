import { Command, Option } from "commander";
import { convertRequests } from "./convert";

async function main() {
  const program = new Command();
  program
    .name("request-converter")
    .description("Convert Elasticsearch Dev Console scripts to other languages")
    .addOption(
      new Option("-f, --format <format>", "export format")
        .choices(["python", "javascript", "curl"])
        .makeOptionMandatory(),
    )
    .option("--complete", "output complete code", false)
    .option(
      "--elasticsearch-url",
      "Elasticsearch endpoint URL",
      "http://localhost:9200",
    )
    .option("--debug", "output information useful when debugging", false)
    .option("--print-response", "add code to print response", false);

  program.parse();
  const opts = program.opts();

  let data = "";
  for await (const chunk of process.stdin) {
    data += chunk;
  }

  const code = (await convertRequests(data, opts.format, {
    complete: opts.complete,
    elasticsearchUrl: opts.elasticsearchUrl,
    debug: opts.debug,
    printResponse: opts.printResponse,
  })) as string;
  process.stdout.write(code);
}

main();
