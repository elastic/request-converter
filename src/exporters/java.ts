import Handlebars from "handlebars";

import { ConvertOptions, FormatExporter } from "../convert";

import { InstanceOf, Interface, Request } from "../metamodel";
import { ParsedRequest, returnSchema } from "../parse";
import path from "path";

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
let specTypeMap: Map<any, any>;

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
    let spec = await returnSchema(path.join(__dirname, ".././schema.json"));
    specTypeMap = new Map(spec.types.map((obj) => [obj.name.name, obj]));
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
            handleList(request, val, false, writer, key, typeName, false);
          }
        }
      }
    }

    if (request.body != undefined) {
      buildRecursive(
        request.body,
        request,
        false,
        methodName,
        writer,
        1,
        false,
      );
    }
  }

  writer.push(");");
  return writer.join("");
}

function buildRecursive(
  object: Object,
  request: ParsedRequest,
  additionalDetails: Object,
  methodName: string,
  writer: string[],
  depth: number,
  inListOrMap: boolean,
): void {
  let dataType = handleDataTypes(
    object,
    request,
    additionalDetails,
    methodName,
    writer,
    depth,
    inListOrMap,
  );

  // "leaf" case for simple data types
  if (dataType == true) return;

  // handling all the fields in the class
  if (depth > 1) {
    generateLambdaCall(writer, methodName);
  }

  handleAllFields(object, request, dataType, methodName, writer, depth)
}

function handleAllFields(
  object: Object,
  request: ParsedRequest,
  additionalDetails: Object,
  methodName: string,
  writer: string[],
  depth: number,
): boolean {
  if (methodName == "") {
    return true;
  }
  let noFields = true;
  for (const [key, value] of Object.entries(object)) {
    let finalValue = value;

    // term query shortcut
    // TODO exclude TermSuggester from this (by checking body)
    if (key == "term") {
      let newValue = new TermQuery();
      for (const [subK, subV] of Object.entries(value)) {
        if (subK != "case_insensitive" && subK != "boost" && subK != "_name") {
          newValue.set("field", subK);
          newValue.set("value", subV);
        } else {
          newValue.set(subK, subV);
        }
      }
      finalValue = newValue;
    }

    writer.push("\n");
    // TODO indent here
    writer.push(".");
    writer.push(key);
    writer.push("(");
    buildRecursive(
      finalValue,
      request,
      additionalDetails,
      key,
      writer,
      depth + 1,
      false,
    );
    noFields = false;
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
  additionalDetails: Object,
  originalName: string,
  methodName: string,
  writer: string[],
  depth: number,
): void {
  if (
    handleDataTypes(object, request, false, methodName, writer, depth, true)
  ) {
    return;
  }
  if (complete) {
    imports.push("import " + "ClassName?" + ";"); // TODO need a list of class names generated from java client
  }
  writer.push(capitalizeFirstLetter(originalName)); // TODO still need list of class names
  writer.push(".of(");
  generateLambdaCall(writer, originalName);
  buildRecursive(
    object,
    request,
    additionalDetails,
    methodName,
    writer,
    depth,
    true,
  );
  writer.push(")");
}

// return true if finds and converts simple type, false if it finds an object,
// additional info to be used later if it finds a complex nested body
function handleDataTypes(
  object: Object,
  request: ParsedRequest,
  additionalDetails: Object,
  methodName: string,
  writer: string[],
  depth: number,
  inListOrMap: boolean,
): Object {
  if (methodName == "") {
    return false; // empty object early return case
  }
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
  } else if (type == "object") {
    // there's no info about nested types, preventively getting type info from spec
    let infoType: string = typeof additionalDetails;
    if (request.request?.body.kind == "properties") {
      if (infoType != "object") {
        let propMap = new Map(
          request.request.body.properties.map((obj) => [obj.name, obj]),
        );
        let typeDetails = propMap.get(methodName)?.type;
        if (typeDetails == undefined) {
          return false; // not there yet
        }
        if (propMap.get(methodName)?.type.kind == "instance_of") {
          let typeName = (propMap.get(methodName)?.type as InstanceOf).type
            .name;
          let typeDef = specTypeMap.get(typeName);
          return typeDef;
        }
      }
      // we already have the needed info
      else {
        // TODO maybe check before the cast
        if (methodName == "type") {
          handleTypeSpecialCase(
            request,
            object,
            additionalDetails,
            writer,
            methodName,
            inListOrMap,
          );
          return true;
        }
        if (methodName == "term"){
          return false; //going to term shortcut
        }
        let specType = findSpecType(methodName, additionalDetails as Interface);
        switch (specType) {
          // TODO establish how to get list object?
          // we don't need additionalDetails anymore
          case "list_of":
            handleList(
              request,
              "object",
              additionalDetails,
              writer,
              methodName,
              "?",
              inListOrMap,
            );
            return true;
          case "dictionary_of":
            handleMap(
              request,
              object,
              additionalDetails,
              writer,
              methodName,
              inListOrMap,
            );
            return true;
          default:
            return false;
        }
      }
    }
  }
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

// example: json "type": "integer" in java becomes .integer()
function handleTypeSpecialCase(
  request: ParsedRequest,
  object: Object,
  additionalDetails: Object,
  writer: string[],
  methodName: string, //TODO add depth here
  inListOrMap: boolean,
): void {
  for (const [key, value] of Object.entries(object)) {
    writer.push("\n");
    // TODO indent here
    writer.push(".");
    writer.push(snakeCaseToCamelCase(value));
    writer.push("(");
    generateLambdaCall(writer, value);
    // TODO the object has to be a copy of the original object, without the "type" field
    // which was just handled now
    buildRecursive({}, request, additionalDetails, "", writer, 1, inListOrMap);
    writer.push(")");
  }
}

function findSpecType(name: string, details: Interface): string {
  let found: string = "unknown";
  details.properties.forEach((element) => {
    if (element.name == name) {
      found = element.type.kind.toString();
    }
  });
  return found;
}

function handleList(
  request: ParsedRequest,
  object: string,
  additionalDetails: Object,
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
      buildFromRequest(
        element,
        request,
        additionalDetails,
        methodName,
        methodName,
        subWriter,
        1,
      );
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
    buildRecursive(
      vals[0],
      request,
      additionalDetails,
      methodName,
      writer,
      1,
      inListOrMap,
    );
  }
}

function handleMap(
  request: ParsedRequest,
  object: Object,
  additionalDetails: Object,
  writer: string[],
  methodName: string,
  inListOrMap: boolean,
): void {
  if (Object.entries(object).length > 1) {
    if (complete) {
      imports.push("import java.util.Map;");
    }
    // handle comma separated java 9 Map.of
    writer.push("Map.of(");
    let mapWriter: string[] = [];

    Object.entries(object).forEach((element) => {
      for (const [key, value] of Object.entries(element[1])) {
        let subWriter: string[] = [];
        subWriter.push('"');
        subWriter.push(element[0]);
        subWriter.push('"');
        subWriter.push(",");
        buildFromRequest(
          element[1],
          request,
          additionalDetails,
          methodName,
          key,
          subWriter,
          1,
        );
        mapWriter.push(subWriter.join(""));
      }
    });
    writer.push(mapWriter.join(","));
    writer.push(")");
    if (!inListOrMap) {
      writer.push(")");
    }
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

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

class TermQuery {
  boost: number;
  _name: string;
  field: string;
  value: object;
  case_insensitive: boolean;

  [k: string]: any;

  public set(k: string, v: any): this {
    this[k] = v;
    return this;
  }
}
