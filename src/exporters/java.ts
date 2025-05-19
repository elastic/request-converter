import Handlebars from "handlebars";

import { ConvertOptions, FormatExporter } from "../convert";

import { Request } from "../metamodel";
import { ParsedRequest } from "../parse";

// this regex should match the list of APIs that the java generator ignores

const UNSUPPORTED_APIS = new RegExp(
  "^_internal.*$" +
    "|^text_structure.find_structure$" +
    "|^fleet.global_checkpoints$" +
    "|^fleet.msearch$" +
    "|^connector.last_sync$",
);

function getCodeGenParamNames(
  params: Record<string, string | undefined>,
  request: Request | undefined,
): Record<string, string | undefined> {
  for (const [key, value] of Object.entries(params)) {
    if (request?.path) {
      for (const prop of request.path) {
        if (prop.name == key && prop.codegenName != undefined) {
          delete params[key];

          params[prop.codegenName] = value;
        }
      }
    }
  }

  return params;
}

// setting global variables
var takenLambdaNames: string[] = [];
var imports: string[] = [];
var DEFAULT_CLIENT_NAME = "client";

export class JavaExporter implements FormatExporter {
  template: Handlebars.TemplateDelegate;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  async check(requests: ParsedRequest[]): Promise<boolean> {
    return true;
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    let writer: string[] = [];

    requests.forEach((req) => {
      const correctParams = getCodeGenParamNames(req.params, req.request);
      let apiName = req.api;
      if (apiName == null) {
        return "Missing api";
      }
      let clientName = DEFAULT_CLIENT_NAME;
      let methodName;
      // understand if direct call (like search) or subclient call (like ingest.put_pipeline)
      var apiPath = apiName.split(".");
      if (apiPath.length > 1) {
        // the first part of the api name is the subclient, the second part is the method to call
        clientName = snakeCaseToCamelCase(apiPath[0]);
        methodName = snakeCaseToCamelCase(apiPath[1]);
      } else {
        // direct call, simply identifying the method
        methodName = snakeCaseToCamelCase(apiPath[0]);
      }

      writer.push(buildDslString(clientName,methodName,req, correctParams));
    });

    let result: string = writer.join("\n\n");
    return result;
  }
}

function buildDslString(
  clientName: string,
  methodName: string,
  request: ParsedRequest,
  correctParams: Record<string, string | undefined>
): string {

  takenLambdaNames = [];
  let writer: string[] = [];

  // starting by calling the client
  writer.push(DEFAULT_CLIENT_NAME);
  writer.push(".");

  // subclient case
  if(clientName != DEFAULT_CLIENT_NAME){
    writer.push(clientName);
    writer.push("().")
  }

  // calling request method
  writer.push(methodName)
  writer.push("(")

  // TODO aren't they all Request?
  if(request.request?.body.kind == "no_body" && Object.keys(correctParams).length < 1 && request.request.query.length < 1 ){
    // empty case, like info()
    writer.push(");")
    return writer.join("");
  }

  if(request.request?.query.length > 0){

  }
  if(Object.keys(correctParams).length > 0){

  }


  else {
    // normal body case
    buildRecursive(request, methodName, writer, 1, false);
  }

  return writer.join("");
}

function buildRecursive(
  request: ParsedRequest,
  methodName: string,
  writer: string[],
  depth: number,
  inListOrArray: boolean
): void {
}


function snakeCaseToCamelCase(
  input: string
): string {
  return   input
    .split("_")
    .reduce(
      (res, word, i) =>
        i === 0
          ? word.toLowerCase()
          : `${res}${word.charAt(0).toUpperCase()}${word
            .substr(1)
            .toLowerCase()}`,
      "",
    );
}
