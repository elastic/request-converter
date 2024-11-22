import { readFileSync } from "fs";
import { writeFile, rm } from "fs/promises";
import childProcess from "child-process";
import path from "path";
import util from "util";
import { convertRequests } from "../../src/convert";
import { parseRequest, splitSource, ParsedRequest } from "../../src/parse";
import { startServer, stopServer } from "./testserver";
import { shouldBeSkipped } from "./skip";

const execAsync = util.promisify(childProcess.exec);

const TEST_FORMATS: Record<string, string> = {
  python: "py",
  javascript: "js",
  curl: "sh",
};

interface Example {
  digest: string;
  lang: string;
  source: string;
}

interface Case {
  digest: string;
  source: string;
}

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
  const examples: Example[] = JSON.parse(
    readFileSync(".examples.json", "utf-8"),
  );
  const cases: Case[] = [];
  for (const example of examples) {
    if (
      process.env.ONLY_EXAMPLE &&
      example.digest != process.env.ONLY_EXAMPLE
    ) {
      continue;
    }
    if (example.lang == "console") {
      const sources = splitSource(example.source);
      if (sources.length == 1) {
        cases.push({ digest: example.digest, source: example.source });
      } else {
        for (let i = 0; i < sources.length; i++) {
          cases.push({ digest: `${example.digest}[${i}]`, source: sources[i] });
        }
      }
    }
  }

  for (const c of cases) {
    const { digest, source } = c;
    for (const format of Object.keys(TEST_FORMATS)) {
      if (process.env.ONLY_FORMAT && format != process.env.ONLY_FORMAT) {
        continue;
      }
      const reason = shouldBeSkipped(digest, format);
      const testOrFail = !reason ? test : test.failing;
      testOrFail.each([
        [digest, format, reason ? ` (FAIL: ${reason})` : "", source],
      ])(
        `convert %s to %s%s`,
        async (
          digest: string,
          format: string,
          skipReason: string,
          source: string,
        ): Promise<void> => {
          const code = await convertRequests(source, format, {
            complete: true,
            elasticsearchUrl: "http://localhost:9876",
          });

          const ext = TEST_FORMATS[format];
          let parsedRequest: ParsedRequest | undefined;
          await writeFile(`.tmp.request.${ext}`, code as string);

          const failureMessage = `Failed code snippet:\n\n${code}\n\n`;

          try {
            await execAsync(
              path.join(__dirname, `./run-${format}.sh .tmp.request.${ext}`),
            );
            parsedRequest = await parseRequest(source);
          } catch (err) {
            // force an assertion to have a reference to the failing test
            expect({ error: err, source }, failureMessage).toEqual({
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

          expect(
            { result: capturedRequest.path, source },
            failureMessage,
          ).toEqual({
            result: parsedRequest?.path,
            source,
          });
          expect(
            { result: capturedRequest.query, source },
            failureMessage,
          ).toEqual({
            result: parsedRequest?.query ?? {},
            source,
          });
          expect(
            { result: capturedRequest.body, source },
            failureMessage,
          ).toEqual({
            result: parsedRequest?.body ?? {},
            source,
          });
        },
      );
    }
  }
});
