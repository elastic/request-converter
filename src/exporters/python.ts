import { readFile } from "fs/promises";
import path from "path";
import Handlebars from "handlebars";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

// this regex should match the list of APIs that do not have specific handlers
// in the Python client. APIs in this list are rendered with a perform_request()
// call
const UNSUPPORTED_APIS = new RegExp(
  "^connector.*$" +
    "|^inference.*$" +
    "|^_internal.*$" +
    "|^security.create_cross_cluster_api_key$" +
    "|^security.update_cross_cluster_api_key$" +
    "|^security.update_settings$" +
    "|^snapshot.repository_analyze$" +
    "|^watcher.get_settings$" +
    "|^watcher.update_settings",
);

const PYCONSTANTS: Record<string, string> = {
  true: "True",
  false: "False",
  null: "None",
};

export class PythonExporter implements FormatExporter {
  template: Handlebars.TemplateDelegate | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async check(requests: ParsedRequest[]): Promise<boolean> {
    return true;
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    return (await this.getTemplate())({ requests, ...options });
  }

  async getTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (!this.template) {
      // custom data renderer for Python
      Handlebars.registerHelper("pyprint", (context) => {
        const lines = JSON.stringify(context, null, 4).split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
          lines[i] = "    " + lines[i];
        }
        if (lines.length > 1) {
          let result = lines.join("\n");
          for (const k of Object.keys(PYCONSTANTS)) {
            result = result.replaceAll(`${k},\n`, `${PYCONSTANTS[k]},\n`);
            result = result.replaceAll(`${k}\n`, `${PYCONSTANTS[k]}\n`);
          }
          return result;
        } else if (PYCONSTANTS[lines[0]]) {
          return PYCONSTANTS[lines[0]];
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
          if (!UNSUPPORTED_APIS.test(this.api as string)) {
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
        const aliases: Record<string, string> = {
          from: "from_",
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

      // custom conditional to check for request body kind
      // the argument can be "properties" or "value"
      Handlebars.registerHelper(
        "ifRequestBodyKind",
        function (this: ParsedRequest, kind: string, options) {
          let bodyKind = this.request?.body?.kind;
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

      const t = await readFile(path.join(__dirname, "./python.tpl"), {
        encoding: "utf-8",
      });
      this.template = Handlebars.compile(t);
    }
    return this.template;
  }
}
