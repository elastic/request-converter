import { readFileSync } from "fs";
import { writeFile, rm } from "fs/promises";
import path from "path";
import { exec } from "child-process-promise";
import { convertRequests } from "../../src/convert";
import { parseRequest, splitSource, ParsedRequest } from "../../src/parse";
import { startServer, stopServer } from "./testserver";

beforeAll(async () => {
  // start a simple web server that will capture requests sent when running
  // converted scripts
  await startServer();
});

afterAll(async () => {
  // stop the testing web server
  await stopServer();
});

describe("convert", () => {
  const examples: { digest: string; lang: string; source: string }[] =
    JSON.parse(readFileSync(".examples.json", { encoding: "utf-8" }));
  let cases: { digest: string; source: string }[] = [];
  for (const example of examples) {
    if (process.env.ONLY_EXAMPLE && example.digest != process.env.ONLY_EXAMPLE) {
      continue;
    }
    if (example.lang == "console") {
      const sources = splitSource(example.source);
      for (const source of sources) {
        cases.push({ digest: example.digest, source: source });
      }
    }
  }
  //console.log(cases.length);
  //cases = cases.slice(0, 1000); //[cases[7]];

  //   cases = [`
  // POST books/_doc
  // {"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}
  // `]
  //
  test.each(cases)(
    "converts the request to python successfully",
    async ({ digest, source }) => {
      const code = await convertRequests(source, "python", {
        complete: true,
        elasticsearchUrl: "http://localhost:9876",
      });

      let parsedRequest: ParsedRequest | undefined;
      await writeFile(".tmp.request.py", code as string);
      try {
        await exec(path.join(__dirname, "./run-python.sh .tmp.request.py"));
        parsedRequest = await parseRequest(source);
      } catch (err) {
        // force an assertion to have a reference to the failing test
        expect({ error: err, digest, source }).toEqual({
          error: undefined,
          digest,
          source,
        });
      }
      await rm(".tmp.request.py");

      const res = await fetch("http://localhost:9876/__getLastRequest");
      const capturedRequest = await res.json();

      expect({ result: capturedRequest.path, digest, source }).toEqual({
        result: parsedRequest?.url,
        digest,
        source,
      });
      expect({ result: capturedRequest.query, digest, source }).toEqual({
        result: parsedRequest?.query ?? {},
        digest,
        source,
      });
      expect({ result: capturedRequest.body, digest, source }).toEqual({
        result: parsedRequest?.body ?? {},
        digest,
        source,
      });
    },
  );
});
