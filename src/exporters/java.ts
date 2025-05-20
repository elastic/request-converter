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
let takenLambdaNames: string[] = [];
let imports: string[] = [];
let DEFAULT_CLIENT_NAME = "client";
let complete = false; // TODO get from options

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

      writer.push(buildDslString(clientName, methodName, req, correctParams));
    });

    let result: string = writer.join("\n\n");
    return result;
  }
}

function buildDslString(
  clientName: string,
  methodName: string,
  request: ParsedRequest,
  correctParams: Record<string, string | undefined>,
): string {
  takenLambdaNames = [];
  let writer: string[] = [];

  // starting by calling the client
  writer.push(DEFAULT_CLIENT_NAME);
  writer.push(".");

  // subclient case
  if (clientName != DEFAULT_CLIENT_NAME) {
    writer.push(clientName);
    writer.push("().");
  }

  // calling request method
  writer.push(methodName);
  writer.push("(");

  // TODO aren't they all Request?
  if (
    request.body == undefined &&
    Object.keys(correctParams).length < 1 &&
    request.query == undefined
  ) {
    // empty case, like info()
    writer.push(");");
    return writer.join("");
  }

  // not empty case, starting with first lambda call
  generateLambdaCall(writer, methodName);

  if (request.request) {
    if (request.query != undefined) {
      // converting array of query parameters to map for faster access
      const typeMap = new Map(
        request.request.query.map((obj) => [obj.name, obj.type]),
      );

      for (const key in request.query) {
        const val = request.query[key];
        let type = typeMap.get(key);
        // only handling primitive query parameters for now
        if (type?.kind == "instance_of") {
          let typeName = type.type.name;
          writer.push(".");
          writer.push(key);
          writer.push("(");
          handlePrimitive(val, writer, typeName, false);
        }
      }
    }

    if (Object.keys(correctParams).length > 0) {
      // converting array of path parameters to map for faster access
      const typeMap = new Map(
        request.request.path.map((obj) => [obj.name, obj.type]),
      );
      for (const key in correctParams) {
        const val = request.params[key];
        let type = typeMap.get(key);
        // TODO handle enums, arrays
        if (type?.kind == "instance_of" && val != undefined) {
          let typeName = type.type.name;
          let javaType = getJavaType(typeName);
          writer.push(".");
          writer.push(key);
          writer.push("(");
          if (javaType.structure == undefined) {
            handlePrimitive(val, writer, typeName, false);
          } else if (javaType.structure == "list") {
            handleList(request, val, writer, key, typeName, false);
          }
        }
      }
    }

    if (request.body != undefined) {
      buildRecursive(request.body, request, methodName, writer, 1, false);
    }
  }

  writer.push(");");
  return writer.join("");
}

function buildRecursive(
  object: Object,
  request: ParsedRequest,
  methodName: string,
  writer: string[],
  depth: number,
  inListOrMap: boolean,
): void {
  if (
    // "leaf" case for simple data types
    handleDataTypes(object, request, methodName, writer, depth, inListOrMap)
  ) {
    return;
  }
  // handling all the fields in the class
  if(depth > 1) {
    generateLambdaCall(writer, methodName);
  }
  handleAllFields(object, request, writer, depth);
}

function handleAllFields(
  object: Object,
  request: ParsedRequest,
  writer: string[],
  depth: number,
): boolean {
  let noFields = false;
  for (const [key, value] of Object.entries(object)) {

    let finalValue = value;

    // term query shortcut
    // TODO exclude TermSuggester from this (by checking body)
    if (key == "term") {
      let newValue = new TermQuery();
      for (const [subK, subV] of Object.entries(value)) {
        if (subK != "case_insensitive" && subK != "boost" && subK != "_name"){
          newValue.set("field",subK)
          newValue.set("value",subV);
        }
        else{
          newValue.set(subK,subV);
        }
      }
      finalValue = newValue
    }

    writer.push("\n");
    // TODO indent here
    writer.push(".");
    writer.push(key);
    writer.push("(");
    buildRecursive(finalValue, request, key, writer, depth + 1, false);
    noFields = true;
  }
  if (depth > 1) {
    writer.push(")"); // TODO handle no field case
  }
  return noFields;
}

// specific builder for elements inside a list or map
function buildFromRequest(
  object: Object,
  request: ParsedRequest,
  methodName: string,
  writer: string[],
  depth: number,
): void {
  if (handleDataTypes(object, request, methodName, writer, depth, true)) {
    return;
  }
  if (complete) {
    imports.push("import " + "ClassName?" + ";"); // TODO need a list of class names generated from java client
  }
  // TODO handle class names like Query.of()
}

function handleDataTypes(
  object: Object,
  request: ParsedRequest,
  methodName: string,
  writer: string[],
  depth: number,
  inListOrMap: boolean,
): boolean {
  let type: string = typeof object;
  if (type == "string") {
    writer.push('"');
    writer.push(object.toString());
    writer.push('"');
    if (!inListOrMap) {
      writer.push(")");
    }
    return true;
  } else if (type == "number") {
    let javaType = getJavaType(type);
    handlePrimitive(object.toString(), writer, javaType.primitive, inListOrMap);
    return true;
  }
  // TODO need to use request to find out actual type of "objects" (map, list, whatever)
  return false;
}

function generateLambdaCall(writer: string[], methodName: string): void {
  let letters = 1;
  // failsafe in case not enough letters, numbers will be added to name
  let extraLetters = 1;
  let originalName = methodName;
  let subName = methodName.substring(0, 1);

  while (takenLambdaNames.includes(subName)) {
    if (letters + 1 > originalName.length) {
      originalName = methodName + extraLetters;
      extraLetters++;
    } else {
      letters++;
    }
    subName = originalName.substring(0, letters);
  }
  writer.push(subName);
  writer.push(" -> ");
  writer.push(subName);
}

function handlePrimitive(
  object: Object,
  writer: string[],
  type: string,
  inListOrMap: boolean,
): void {
  if (type == "integer") {
    writer.push(object.toString());
  } else if (type == "float") {
    writer.push(object.toString());
    writer.push("F");
  } else if (type == "double") {
    writer.push(object.toString());
    writer.push("D");
  }
  if (!inListOrMap) {
    writer.push(")");
  }
}

function handleList(
  request: ParsedRequest,
  object: string,
  writer: string[],
  methodName: string,
  type: string,
  inListOrMap: boolean,
): void {
  var vals = object.split(",");
  // find out if just one or multi
  if (vals.length > 1) {
    if (complete) {
      imports.push("import java.util.List;");
    }
    // handle comma separated java 9 List.of
    writer.push("List.of(");

    let listWriter: string[] = [];

    vals.forEach((element) => {
      let subWriter: string[] = [];
      buildFromRequest(element, request, methodName, subWriter, 1);
      listWriter.push(subWriter.join(""));
    });

    writer.push(listWriter.join(","));

    writer.push(")");
    if (!inListOrMap) {
      writer.push(")");
    }
  }
  // need to extrapolate single element
  else {
    buildRecursive(vals[0], request, methodName, writer, 1, inListOrMap);
  }
}

export class JavaType {
  constructor(structure: string | undefined, primitive: string) {
    this.structure = structure;
    this.primitive = primitive;
  }

  structure: string | undefined;
  primitive: string;
}

function getJavaType(type: string): JavaType {
  switch (type) {
    case "Indices": {
      return new JavaType("list", "string");
      break;
    }
    case "IndexName": {
      return new JavaType("list", "string");
      break;
    }
    default: {
      return new JavaType(undefined, "string");
      break;
    }
  }
}

function snakeCaseToCamelCase(input: string): string {
  return input
    .split("_")
    .reduce(
      (res, word, i) =>
        i === 0
          ? word.toLowerCase()
          : `${res}${word.charAt(0).toUpperCase()}${word
              .substring(1)
              .toLowerCase()}`,
      "",
    );
}

class TermQuery {
  boost: number
  _name: string
  field: string
  value: object
  case_insensitive: boolean
  [k: string]: any;

  public set(k: string, v: any): this  {
    this[k] = v
    return this;
  }
}
