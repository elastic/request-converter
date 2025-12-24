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

// For the languages listed, bodies are compared taking into account that some
// array or object properties may have been given in their shortcut form, but
// the language client expands them to full form.
// For these languages, a property that is expected to have a scalar value but
// instead comes back as a single-key dictionary or single-element array is
// compared against the value wrapped in the object or array.
const checkExpandedShortcuts = ["java"];

interface SchemaExample {
  method_request: string;
  value: string;
}

interface Example {
  key: string;
  source: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepCompare(actual: any, expected: any): boolean {
  try {
    // first try a standard comparison
    expect(actual).toEqual(expected);
  } catch (error) {
    return false;
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compareWithShortcuts(actual: any, expected: any): boolean {
  if (deepCompare(actual, expected)) {
    return true;
  }

  // check for single-element arrays
  if (Array.isArray(actual) && actual.length === 1) {
    if (deepCompare(actual[0], expected)) {
      return true;
    }
  }

  // check for single-key objects
  if (typeof actual === "object" && Object.keys(actual).length === 1) {
    if (deepCompare(actual[Object.keys(actual)[0]], expected)) {
      return true;
    }
  }

  // check for integer vs string
  if (typeof actual === "number" && typeof expected === "string") {
    return actual === parseFloat(expected);
  }

  if (typeof actual === "string" && typeof expected === "number") {
    return parseFloat(actual) === expected;
  }

  // check for boolean vs string
  if (typeof actual === "boolean" && typeof expected === "string") {
    return actual ? expected === "true" : expected === "false";
  }
  if (typeof actual === "string" && typeof expected === "boolean") {
    return expected ? actual === "true" : actual === "false";
  }

  // check floats given as strings
  const NUMERIC_REGEX = /^[-+]?(\d+\.\d+|\d+|\.\d+)$/;
  if (
    typeof actual === "string" &&
    typeof expected === "string" &&
    NUMERIC_REGEX.test(actual) &&
    NUMERIC_REGEX.test(expected)
  ) {
    console.log("heyyy");
    return parseFloat(actual) === parseFloat(expected);
  }

  if (typeof actual !== "object" || typeof expected !== "object") {
    return false; // the caller will do a complete assert and report the diff
  }

  // for objects we recursively compare its properties
  for (const actualProp in actual) {
    if (!compareWithShortcuts(actual[actualProp], expected[actualProp])) {
      return false;
    }
  }
  for (const expectedProp in expected) {
    if (!Object.keys(actual).includes(expectedProp)) {
      return false;
    }
  }
  return true;
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
          if (checkExpandedShortcuts.includes(format)) {
            if (
              !compareWithShortcuts(capturedRequest.query, parsedRequest?.query)
            ) {
              // A comparison accounting for shortcut properties came as different
              // so now we do a full assert to report this error
              expect(
                { result: capturedRequest.query, source },
                failureMessage,
              ).toEqual({
                result: parsedRequest?.query ?? {},
                source,
              });
            }
          } else {
            expect(
              { result: capturedRequest.query, source },
              failureMessage,
            ).toEqual({
              result: parsedRequest?.query ?? {},
              source,
            });
          }
          if (checkExpandedShortcuts.includes(format)) {
            if (
              !compareWithShortcuts(capturedRequest.body, parsedRequest?.body)
            ) {
              // A comparison accounting for shortcut properties came as different
              // so now we do a full assert to report this error
              expect(
                { result: capturedRequest.body, source },
                failureMessage,
              ).toEqual({
                result: parsedRequest?.body ?? {},
                source,
              });
            }
          } else {
            expect(
              { result: capturedRequest.body, source },
              failureMessage,
            ).toEqual({
              result: parsedRequest?.body ?? {},
              source,
            });
          }
        },
      );
    }
  }
});
