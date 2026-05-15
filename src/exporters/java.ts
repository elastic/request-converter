import childProcess from "child_process";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest, JSONValue } from "../parse";
import { Request } from "../metamodel";
import util from "util";

const isBrowser = typeof window !== "undefined";
const execAsync = !isBrowser ? util.promisify(childProcess.exec) : undefined;

type JavaRequest = {
  api?: string;
  params: Record<string, string | undefined>;
  query?: Record<string, string>;
  body: JSONValue;
};

function getCodeGenParamNames(
  params: Record<string, string | undefined>,
  request: Request,
) {
  for (const [key, value] of Object.entries(params)) {
    if (request?.path) {
      for (const prop of request.path) {
        if (prop.name === key && prop.codegenName !== undefined) {
          delete params[key];
          params[prop.codegenName] = value;
        }
      }
    }
  }
  return params;
}

export class JavaExporter implements FormatExporter {
  available(): boolean {
    return !isBrowser && !!process.env.JAVA_ES_REQUEST_CONVERTER_JAR;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async check(requests: ParsedRequest[]): Promise<boolean> {
    // only return true if all requests are for Elasticsearch
    return requests
      .map((req) => req.service == "es")
      .reduce((prev, curr) => prev && curr, true);
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    const javaRequests: JavaRequest[] = [];
    for (const request of requests) {
      if (request.request) {
        const correctParams = getCodeGenParamNames(
          request.params,
          request.request,
        );
        const body = request.body ?? {};

        const javaRequest: JavaRequest = {
          api: request.api,
          params: correctParams,
          query: request.query,
          body: body,
        };
        javaRequests.push(javaRequest);
      }
    }

    // escape single quotes that may appear in the payload
    // (only for bash-style shells for now)
    const req = JSON.stringify(javaRequests).replaceAll("'", "'\"'\"'");
    // other arguments to the Java converter
    const complete = options.complete ? "true" : "false";
    const url = options.elasticsearchUrl ?? "";

    if (execAsync === undefined) {
      throw new Error("Cannot use exec()");
    }
    const { stdout, stderr } = await execAsync(
      `java -jar ${process.env.JAVA_ES_REQUEST_CONVERTER_JAR} '${req}' '${complete}' '${url}'`,
    );
    if (!stdout) {
      throw new Error(`Could not invoke exporter: ${stderr}`);
    }
    return stdout;
  }
}
