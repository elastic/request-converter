import { readFileSync } from "fs";
import path from "path";
import Handlebars from "handlebars";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";
import "./templates";

const RUBYCONSTANTS: Record<string, string> = { null: "nil" };

function isSupportedAPI(req: ParsedRequest) {
  if (
    req.api?.startsWith("_internal") ||
    req.api === "knn_search" ||
    req.api?.startsWith("shutdown.") ||
    req.api?.startsWith("rollup.") ||
    req.api?.startsWith("autoscaling.")
  ) {
    return false;
  }
  let supported = false;
  if (req.availability && req.availability.stack?.visibility !== "private") {
    supported = true;
  }
  return supported;
}

export class RubyExporter implements FormatExporter {
  template: Handlebars.TemplateDelegate | undefined;
  helpers: Record<string, Handlebars.HelperDelegate> | undefined;

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
    const template = await this.getTemplate();
    return template({ requests, ...options }, { helpers: this.getHelpers() });
  }

  // Helpers are handed to the template at render time instead of being
  // registered on the global Handlebars environment, because every exporter
  // defines helpers under the same names but with different behavior.
  getHelpers(): Record<string, Handlebars.HelperDelegate> {
    if (!this.helpers) {
      this.helpers = {
        // custom data renderer for Ruby
        rubyprint: (context) => {
          const lines = JSON.stringify(context ?? null, null, 2).split(/\r?\n/);
          for (let i = 1; i < lines.length; i++) {
            lines[i] = "  " + lines[i];
          }
          if (lines.length > 1) {
            let result = lines.join("\n");
            for (const k of Object.keys(RUBYCONSTANTS)) {
              result = result.replaceAll(`${k},\n`, `${RUBYCONSTANTS[k]},\n`);
              result = result.replaceAll(`${k}\n`, `${RUBYCONSTANTS[k]}\n`);
            }
            return result;
          } else if (RUBYCONSTANTS[lines[0]]) {
            return RUBYCONSTANTS[lines[0]];
          } else if (lines[0].startsWith('"') && lines[0].endsWith('"')) {
            // special case: handle strings such as "null" as
            // their native types
            const s = lines[0].substring(1, lines[0].length - 1);
            if (RUBYCONSTANTS[s]) {
              return RUBYCONSTANTS[s];
            } else {
              return lines[0];
            }
          } else {
            return lines[0];
          }
        },

        // custom conditional for requests without any arguments
        hasArgs: function (
          this: ParsedRequest,
          options: Handlebars.HelperOptions,
        ) {
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

        // custom conditional to separate supported vs unsupported APIs
        supportedApi: function (
          this: ParsedRequest,
          options: Handlebars.HelperOptions,
        ) {
          if (isSupportedAPI(this)) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },

        // attribute name renderer that considers aliases and code-specific names
        // arguments:
        //   name: the name of the attribute
        //   props: the list of schema properties this attribute belongs to
        // TODO: I don't think any of these are necessary in Ruby, but check for others
        alias: (name, props) => {
          const aliases: Record<string, string> = {
            _meta: "meta",
            _field_names: "field_names",
            _routing: "routing",
            _source: "source",
            _source_excludes: "source_excludes",
            _source_includes: "source_includes",
          };
          if (aliases[name]) {
            return aliases[name];
          }
          if (props) {
            for (const prop of props) {
              if (prop.name == name && prop.codegenName != undefined) {
                return prop.codegenName;
              }
            }
          }
          return name;
        },
      };
    }
    return this.helpers;
  }

  async getTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (!this.template) {
      if (process.env.NODE_ENV !== "test") {
        this.template = Handlebars.templates["ruby.tpl"];
      } else {
        // when running tests we read the templates directly, in case the
        // compiled file is not up to date
        const t = readFileSync(path.join(__dirname, "./ruby.tpl"), "utf-8");
        this.template = Handlebars.compile(t);
      }
    }
    return this.template;
  }
}
