import { METHODS } from "http";
import { URL } from "url";
import querystring, { ParsedUrlQuery } from "querystring";
import * as Router from "find-my-way-ts";
import { Model, Request } from "./metamodel";

export type JSONValue = string | number | boolean | JSONArray | JSONObject;
interface JSONArray extends Array<JSONValue> {}
interface JSONObject {
  [x: string]: JSONValue;
}

export type ParsedRequest = {
  /** The name of the Elasticsearch API this request refers to. */
  api?: string;
  /** The request definition from the Elasticsearch specification that applies to this request. */
  request?: Request;
  /** The dynamic parameters that are part of the request's URL. */
  params: { [x: string]: string | undefined };
  /** The request method. */
  method: string;
  /** The request URL. */
  url: string;
  /** An object with the arguments passed in the query string of the request. */
  query?: ParsedUrlQuery;
  /** The body of the request, given as an object for a JSON body, or an array of
   * objects for the ndjson bodies used in bulk requests. */
  body?: JSONObject | JSONObject[] | string;
};

type ESRoute = {
  name: string;
  request: Request;
};

const SPEC_URL =
  "https://raw.githubusercontent.com/elastic/elasticsearch-specification/main/output/schema/schema.json";
const router = Router.make<ESRoute>({
  ignoreTrailingSlash: true,
  maxParamLength: 1000,
});

// split Dev Console source code into individual commands
export function splitSource(source: string): string[] {
  source = source.replace(/^#.*$/gm, "\n"); // remove comments
  source = source.trim();
  const len = source.length;
  const sources = [];
  let index = 0;
  let prev = 0;
  while (index < len) {
    // Beginning of a new command, we should find the method and proceede to the url.
    for (const method of METHODS) {
      if (source.slice(index, len).startsWith(method)) {
        index += method.length;
        break;
      }
    }

    nextCommand();
    sources.push(source.slice(prev, index).trim());
    prev = index;
  }

  return sources;

  function nextCommand() {
    if (index == len) return;
    let brackets = 0;
    // If we found an http method, then we have found a new command.
    for (const method of METHODS) {
      if (source.slice(index, len).startsWith(method)) {
        return;
      }
    }

    // If we didn't find an http method, we should increment the index.
    // If we find an open curly bracket, we should also find the closing one
    // before to checking for the http method.
    if (source[index] == "{") {
      for (;;) {
        if (source[index] == "{") {
          brackets += 1;
        } else if (source[index] == "}") {
          brackets -= 1;
        }
        if (brackets == 0) {
          break;
        }
        index += 1;
      }
    } else {
      index += 1;
    }
    nextCommand();
  }
}

// parse a single console command
function parseCommand(source: string) {
  source = source
    // removes comments tags, such as `<1>`
    .replace(/<([\S\s])>/g, "")
    // removes comments, such as `// optional`
    .replace(/\/\/\s.+/g, "");

  const data: ParsedRequest = {
    params: {},
    method: "",
    url: "",
  };

  const len = source.length;
  let index = 0;
  // identify the method
  for (const method of METHODS) {
    if (source.slice(index, len).startsWith(method)) {
      data.method = method;
      index += method.length;
      break;
    }
  }
  /* istanbul ignore if */
  if (!data.method) {
    throw new Error("Invalid request method");
  }

  // identify the url and query
  skip(" ", "\n");
  const urlStart = index;
  until("{", "\n");

  const urlPart = source.slice(urlStart, index);
  const url = new URL(
    `http://localhost${urlPart[0] != "/" ? "/" + urlPart : urlPart}`,
  );
  data.url =
    url.pathname != "/" ? url.pathname.replace(/\/$/, "") : url.pathname;
  data.url = decodeURIComponent(data.url);

  if (url.search.length) {
    data.query = querystring.parse(url.search.slice(1));
    for (const q in data.query) {
      if (data.query[q] == "") {
        data.query[q] = "true";
      }
    }
  }

  // TODO: this should be an issue in the docs,
  // the correct url is `<index/_mapping`
  /* istanbul ignore next */
  if (data.url.endsWith("_mappings")) {
    data.url = data.url.slice(0, -1);
  }

  // identify the body
  const body = collapseLiteralStrings(source.slice(index));

  if (body != "") {
    try {
      // json body
      console.log(body);
      data.body = JSON.parse(body) as JSONObject;
    } catch (err) {
      console.log(err);
      try {
        // ndjson body
        const ndbody = body.split("\n").filter(Boolean) as string[];
        data.body = ndbody.map((b) => JSON.parse(b));
      } catch (err) {
        throw new Error("body cannot be parsed");
      }
    }
  }

  return data;

  // some commands have three double quotes `"""` in the body
  // this utility removes them and makes the string a valid json
  function collapseLiteralStrings(data: string) {
    const splitData = data.split('"""');
    for (let idx = 1; idx < splitData.length - 1; idx += 2) {
      splitData[idx] = JSON.stringify(splitData[idx]);
    }
    return splitData.join("");
  }

  // proceeds until it finds a character not present
  // in the list passed as input
  function skip(...args: string[]) {
    if (index == len) return;
    if (!args.includes(source[index])) {
      return;
    }
    index += 1;
    skip(...args);
  }

  // proceeds until it finds a character present
  // in the list passed as input
  function until(...args: string[]) {
    if (index == len) return;
    if (args.includes(source[index])) {
      return;
    }
    index += 1;
    until(...args);
  }
}

// use a router to figure out the API name
async function getAPI(
  method: string,
  url: string,
): Promise<Router.FindResult<ESRoute>> {
  if (!router.has("GET", "/")) {
    // download the Elasticsearch spec
    const r = await fetch(SPEC_URL);
    const spec = (await r.json()) as Model;
    for (const endpoint of spec.endpoints) {
      for (const url of endpoint.urls) {
        const { path, methods } = url;
        let formattedPath = path
          .split("/")
          .map((p) => (p.startsWith("{") ? `:${p.slice(1, -1)}` : p))
          .join("/");
        /* istanbul ignore next */
        if (!formattedPath.startsWith("/")) {
          formattedPath = "/" + formattedPath;
        }

        // find the request in the spec
        try {
          let req: Request | undefined;
          for (const type of spec.types) {
            if (
              type.name.namespace == endpoint.request?.namespace &&
              type.name.name == endpoint.request?.name
            ) {
              if (type.kind != "request") {
                throw new Error(
                  `Unexpected request type ${type.kind} for URL ${url}`,
                );
              }
              req = type as Request;
              break;
            }
          }
          const r = {
            name: endpoint.name,
            request: req as Request,
          };
          router.on(methods, formattedPath as Router.PathInput, r);
        } catch (err) {
          // in some cases there are routes that have the same url but different
          // dynamic parameters, which causes find-my-way to fail
        }
      }
    }
  }

  const formattedUrl = url.startsWith("/") ? url : `/${url}`;
  const route = router.find(method, formattedUrl);
  if (!route) {
    /* istanbul ignore next */
    throw new Error(
      `There is no handler for method '${method}' and url '${formattedUrl}'`,
    );
  }
  return route;
}

export async function parseRequest(source: string): Promise<ParsedRequest> {
  source = source.replace(/^\s+|\s+$/g, ""); // trim whitespace
  const req = parseCommand(source);
  const route = await getAPI(req.method, req.url);
  req.api = route.handler.name;
  req.request = route.handler.request;
  if (Object.keys(route.params).length > 0) {
    req.params = route.params;
  }
  return req;
}

/** Parse a Dev Console script.
 *
 * This function is used internally by the `convertRequests()` function, so in
 * general it does not need to be called directly.
 *
 * @param source The source code to parse in Dev Console syntax. Multiple requests
 *   can be separated with an empty line.
 * @returns The function returns an array of `ParsedRequest` objects, each describing
 *   a request.
 */
export async function parseRequests(source: string): Promise<ParsedRequest[]> {
  const sources = splitSource(source);
  return await Promise.all(sources.map((source) => parseRequest(source)));
}
