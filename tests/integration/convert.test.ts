import { readFileSync } from "fs";
import { writeFile, rm } from "fs/promises";
import path from "path";
import { exec } from "child-process-promise";
import { convertRequests } from "../../src/convert";
import { parseRequest, splitSource, ParsedRequest } from "../../src/parse";
import { startServer, stopServer } from "./testserver";
import { skip } from "./skip";

const TEST_FORMATS: Record<string, string> = {
  python: "py",
  //"javascript": "js",
};

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
  const cases: { digest: string; source: string }[] = [];
  for (const example of examples) {
    if (
      process.env.ONLY_EXAMPLE &&
      example.digest != process.env.ONLY_EXAMPLE
    ) {
      continue;
    }
    if (example.lang == "console") {
      const sources = splitSource(example.source);
      for (const source of sources) {
        cases.push({ digest: example.digest, source: source });
      }
    }
  }
  /*
  const from = 0;
  const to = 100;
  cases.splice(to);
  cases.splice(0, from);
  */

  for (const c of cases) {
    const { digest, source } = c;
    for (const format of Object.keys(TEST_FORMATS)) {
      let testOrFail = test;
      if (skip[digest] && (skip[digest].formats ?? [format]).includes(format)) {
        testOrFail = test.failing;
      }
      testOrFail.each([
        [
          digest,
          format,
          skip[digest] ? ` (FAIL: ${skip[digest].reason})` : "",
          source,
        ],
      ])(
        `convert %s to %s%s`,
        async (
          digest: string,
          format: string,
          skipReason: string,
          source: string,
        ): Promise<void> => {
          const code = await convertRequests(source, "python", {
            complete: true,
            elasticsearchUrl: "http://localhost:9876",
          });

          const ext = TEST_FORMATS[format];
          let parsedRequest: ParsedRequest | undefined;
          await writeFile(`.tmp.request.${ext}`, code as string);
          try {
            await exec(
              path.join(__dirname, `./run-${format}.sh .tmp.request.${ext}`),
            );
            parsedRequest = await parseRequest(source);
          } catch (err) {
            // force an assertion to have a reference to the failing test
            expect({ error: err, source }).toEqual({
              error: undefined,
              source,
            });
          }
          await rm(`.tmp.request.${ext}`);

          const res = await fetch("http://localhost:9876/__getLastRequest");
          const capturedRequest = await res.json();

          if (capturedRequest.method != "GET") {
            // arguments expected in the query are also accepted in the body
            // here we check for this case and move arguments to the query if
            // the example has them there
            for (const q of Object.keys(parsedRequest?.query ?? {})) {
              if (
                capturedRequest.query[q] == undefined &&
                capturedRequest.body[q] != undefined
              ) {
                capturedRequest.query[q] = capturedRequest.body[q].toString();
                delete capturedRequest.body[q];
              }
            }
          }

          /* this is useful for debugging, but too noisy otherwise
          if (parsedRequest?.method != capturedRequest.method) {
            console.log(
              `Method mismatch in ${digest} expected:${parsedRequest?.method} actual:${capturedRequest.method}`,
            );
          }
          */

          expect({ result: capturedRequest.path, source }).toEqual({
            result: parsedRequest?.path,
            source,
          });
          expect({ result: capturedRequest.query, source }).toEqual({
            result: parsedRequest?.query ?? {},
            source,
          });
          expect({ result: capturedRequest.body, source }).toEqual({
            result: parsedRequest?.body ?? {},
            source,
          });
        },
      );
    }
  }
});
