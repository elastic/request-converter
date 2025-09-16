import { readFileSync } from "fs";
import path from "path";
import Handlebars from "handlebars";
import prettier from "prettier";
import prettierTypeScript from "prettier/parser-typescript";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";
import "./templates";

const UNSUPPORTED_APIS = new RegExp("^_internal.*$");

export class JavaScriptExporter implements FormatExporter {
  _template: Handlebars.TemplateDelegate;

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
    const output = this.template({ requests, ...options });
    return prettier.format(output, {
      parser: "typescript",
      plugins: [prettierTypeScript],
    });
  }

  get template(): Handlebars.TemplateDelegate {
    if (!this._template) {
      Handlebars.registerHelper("json", function (context) {
        const val = JSON.stringify(context ?? null, null, 2);

        // turn number strings into numbers
        if (val.match(/^"\d+"$/)) {
          return parseInt(val.replaceAll('"', ""), 10);
        }
        return val;
      });

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

      // custom conditional to check for request body kind
      // the argument can be "properties" or "value"
      Handlebars.registerHelper(
        "ifRequestBodyKind",
        function (this: ParsedRequest, kind: string, options) {
          const bodyKind = this.request?.body?.kind ?? "value";

          if (bodyKind == kind) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );

      Handlebars.registerHelper("camelCase", (text) => toCamelCase(text));

      if (process.env.NODE_ENV !== "test") {
        this._template = Handlebars.templates["javascript.tpl"];
      } else {
        // when running tests we read the templates directly, in case the
        // compiled file is not up to date
        const t = readFileSync(
          path.join(__dirname, "./javascript.tpl"),
          "utf-8",
        );
        this._template = Handlebars.compile(t);
      }
    }

    return this._template;
  }
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (k) => k[1].toUpperCase());
}
