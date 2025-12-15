import { readFileSync } from "fs";
import { writeFile, rm } from "fs/promises";
import childProcess from "child_process";
import path from "path";
import util from "util";
import { convertRequests } from "../../src/convert";
import { parseRequest, ParsedRequest } from "../../src/parse";
import { startServer, stopServer } from "./testserver";
import { shouldBeSkipped } from "./skip";
import { Model } from "../../src/metamodel";

const execAsync = util.promisify(childProcess.exec);

const TEST_FORMATS: Record<string, string> = {
  python: "py",
  javascript: "js",
  php: "php",
  curl: "sh",
  ruby: "rb",
  java: "java",
};

interface SchemaExample {
  method_request: string;
  value: string;
}

interface Example {
  key: string;
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
  const examples: Example[] = [];
  const schema = JSON.parse(readFileSync("src/schema.json", "utf-8")) as Model;
  for (const type of schema.types) {
    if (type.kind === "request" && "examples" in type) {
      for (const example in type.examples as Record<string, SchemaExample>) {
        if (process.env.ONLY_EXAMPLE && example != process.env.ONLY_EXAMPLE) {
          continue;
        }
        let code = (type.examples as Record<string, SchemaExample>)[example]
          .method_request;
        if ((type.examples as Record<string, SchemaExample>)[example].value) {
          code += `\n${
            (type.examples as Record<string, SchemaExample>)[example].value
          }`;
        }
        examples.push({
          key: example,
          source: code,
        });
      }
    }
  }

  for (const example of examples) {
    const { key, source } = example;
    for (const format of Object.keys(TEST_FORMATS)) {
      if (process.env.ONLY_FORMAT && format != process.env.ONLY_FORMAT) {
        continue;
      }
      const reason = shouldBeSkipped(key, format);
      const testOrFail = !reason ? test : test.failing;
      testOrFail.each([
        [key, format, reason ? ` (FAIL: ${reason})` : "", source],
      ])(
        `convert %s to %s%s`,
        async (
          key: string,
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

          const failureMessage = `Failed code snippet:\n\n${source}\n\n${code}\n\n`;

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
                (!capturedRequest.query ||
                  capturedRequest.query === undefined) &&
                capturedRequest.body !== undefined
              ) {
                capturedRequest.query[q] = capturedRequest.body[q].toString();
                delete capturedRequest.body[q];
              }
            }
          }

          /* this is useful for debugging, but too noisy otherwise
          if (parsedRequest?.method != capturedRequest.method) {
            console.log(
              `Method mismatch in ${key} expected:${parsedRequest?.method} actual:${capturedRequest.method}`,
            );
          }
          */

          for (const param in parsedRequest?.query ?? {}) {
            if (
              capturedRequest.query[param] === undefined &&
              capturedRequest.body[param] !== undefined
            ) {
              // the client moved a query argument to the body
              // we can't be sure this is legal, but since it is in many cases
              // we allow it
              capturedRequest.query[param] =
                capturedRequest.body[param].toString();
              delete capturedRequest.body[param];
            }
          }

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
