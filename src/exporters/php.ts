import { readFileSync } from "fs";
import path from "path";
import Handlebars from "handlebars";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";
import "./templates";

type jsontype =
  | number
  | boolean
  | null
  | undefined
  | string
  | jsonarray
  | jsonobject;
interface jsonarray extends Array<jsontype> {}
interface jsonobject extends Record<string, jsontype> {}

// this regex should match the list of APIs that do not have specific handlers
// in the Python client. APIs in this list are rendered with a perform_request()
// call
const UNSUPPORTED_APIS = new RegExp(
  "^_internal.*$" + "|^connector.update_features$",
);

export class PHPExporter implements FormatExporter {
  template: Handlebars.TemplateDelegate | undefined;

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
    if (!(await this.check(requests))) {
      throw new Error("Cannot perform conversion");
    }
    return (await this.getTemplate())({ requests, ...options });
  }

  phpprint(data: jsontype, indent: string, startIndented: boolean): string {
    // render a JSON data structure with PHP syntax
    if (typeof data === "number" || typeof data === "boolean") {
      return (startIndented ? indent : "") + String(data);
    } else if (data === null || data === undefined) {
      return (startIndented ? indent : "") + "null";
    } else if (typeof data === "string") {
      return (
        (startIndented ? indent : "") + '"' + data.replaceAll('"', '\\"') + '"'
      );
    } else if (Array.isArray(data)) {
      const elements =
        data.length === 0
          ? ""
          : data
              .map(
                (elem) => "    " + this.phpprint(elem, indent + "    ", true),
              )
              .join(",\n") + ",\n";
      return (
        (startIndented ? indent + "    " : "") +
        "array(\n" +
        elements +
        indent +
        "    )"
      );
    } else if (typeof data === "object") {
      const elements =
        Object.keys(data).length === 0
          ? ""
          : Object.keys(data)
              .map(
                (key) =>
                  `${indent}        "${key}" => ` +
                  this.phpprint(data[key] as jsontype, indent + "    ", false),
              )
              .join(",\n") + ",\n";
      if (elements.length) {
        return (
          (startIndented ? indent : "") + "[\n" + elements + indent + "    ]"
        );
      } else {
        return (startIndented ? indent : "") + "new ArrayObject([])";
      }
    } else {
      throw new Error(`Unexpected type in JSON payload`);
    }
  }

  async getTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (!this.template) {
      // custom data renderer for Python
      Handlebars.registerHelper("phpprint", (context) => {
        return this.phpprint(context, "", false);
      });

      //
      Handlebars.registerHelper(
        "needsRequestFactory",
        function (
          this: { requests: ParsedRequest[] } & ConvertOptions,
          options,
        ) {
          let anyUnsupported = false;
          for (const request of this.requests) {
            if (UNSUPPORTED_APIS.test(request.api as string)) {
              anyUnsupported = true;
              break;
            }
          }
          if (anyUnsupported) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );

      // custom conditional for requests without any arguments
      Handlebars.registerHelper(
        "hasArgs",
        function (this: ParsedRequest, options) {
          if (
            Object.keys(this.params ?? {}).length +
              Object.keys(this.query ?? {}).length +
              Object.keys(this.body ?? {}).length >
            0
          ) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );

      // custom conditional to separate supported vs unsupported APIs
      Handlebars.registerHelper(
        "supportedApi",
        function (this: ParsedRequest, options) {
          if (!UNSUPPORTED_APIS.test(this.api as string) && this.request) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );

      // attribute name renderer that considers aliases and code-specific names
      // arguments:
      //   name: the name of the attribute
      //   props: the list of schema properties this attribute belongs to
      Handlebars.registerHelper("alias", (name, props) => {
        if (props) {
          for (const prop of props) {
            if (prop.name == name && prop.codegenName != undefined) {
              return prop.codegenName;
            }
          }
        }
        return name;
      });

      Handlebars.registerHelper("phpEndpoint", (name) => {
        const snakeToCamel = (str: string) =>
          str
            .toLowerCase()
            .replace(/([-_][a-z])/g, (group) =>
              group.toUpperCase().replace("-", "").replace("_", ""),
            );

        const parts = name.split(".").map((part: string) => snakeToCamel(part));
        const phpParts = parts.slice(0, -1).map((part: string) => part + "()");
        phpParts.push(parts.slice(-1));
        return phpParts.join("->");
      });

      /*
      // custom conditional to check for request body kind
      // the argument can be "properties" or "value"
      Handlebars.registerHelper(
        "ifRequestBodyKind",
        function (this: ParsedRequest, kind: string, options) {
          let bodyKind = this.request?.body?.kind ?? "value";
          const parsedBody = typeof this.body == "object" ? this.body : {};
          if (this.api == "search" && "sub_searches" in parsedBody) {
            // Change the kind of any search requests that use sub-searches to
            // "value", so that the template renders a single body argument
            // instead of expanding the kwargs. This is needed because the
            // Python client does not support "sub_searches" as a kwarg yet.
            bodyKind = "value";
          }
          if (bodyKind == kind) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );
      */

      if (process.env.NODE_ENV !== "test") {
        this.template = Handlebars.templates["php.tpl"];
      } else {
        // when running tests we read the templates directly, in case the
        // compiled file is not up to date
        const t = readFileSync(path.join(__dirname, "./php.tpl"), "utf-8");
        this.template = Handlebars.compile(t);
      }
    }
    return this.template;
  }
}
