import { readFile } from "fs/promises";
import path from "path";
import Handlebars from "handlebars";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

// this regex should match the list of APIs that do not have specific handlers
// in the Ruby client. APIs in this list are rendered with a perform_request()
// call
const UNSUPPORTED_APIS = new RegExp("^_internal.*$");

const RUBYCONSTANTS: Record<string, string> = { null: "nil" };

export class RubyExporter implements FormatExporter {
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

  async getTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (!this.template) {
      // custom data renderer for Ruby
      Handlebars.registerHelper("rubyprint", (context) => {
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
      // TODO: I don't think any of these are necessary in Ruby, but check for others
      Handlebars.registerHelper("alias", (name, props) => {
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
      });

      const t = await readFile(path.join(__dirname, "./ruby.tpl"), {
        encoding: "utf-8",
      });
      this.template = Handlebars.compile(t);
    }
    return this.template;
  }
}