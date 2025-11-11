import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest, JSONValue } from "../parse";
import { Request } from "../metamodel";
import { JavaCaller } from "java-caller";

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
    return !!process.env.JAVA_ES_REQUEST_CONVERTER_JAR;
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

    const args = [];
    args.push(JSON.stringify(javaRequests));
    args.push(options.complete ? "true" : "false");
    args.push(options.elasticsearchUrl ?? "");

    // preparing the java caller class to call the java request converter jar
    const java = new JavaCaller({
      minimumJavaVersion: 21,
      jar: process.env.JAVA_ES_REQUEST_CONVERTER_JAR,
    });
    const { status, stdout, stderr } = await java.run(args);
    // error
    if (status) {
      throw new Error(stderr);
    }
    // success!
    return stdout;
  }
}
