import { readFile } from "fs/promises";
import path from "path";
import Handlebars from "handlebars";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

const PYCONSTANTS: Record<string, string> = {
  true: "True",
  false: "False",
  null: "None",
  '"true"': "True",
  '"false"': "False",
  '"null"': "None",
};

export class PythonExporter implements FormatExporter {
  template: Handlebars.TemplateDelegate | undefined;

  async check(): Promise<boolean> {
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
          return lines
            .join("\n")
            .replaceAll("null,\n", "None,\n")
            .replaceAll("null\n", "None\n")
            .replaceAll("true,\n", "True,\n")
            .replaceAll("true\n", "True\n")
            .replaceAll("false,\n", "False,\n")
            .replaceAll("false\n", "False\n");
        } else if (PYCONSTANTS[lines[0]]) {
          return PYCONSTANTS[lines[0]];
        } else {
          return lines[0];
        }
      });

      // custom aliased word renderer
      Handlebars.registerHelper("alias", (context) => {
        const aliases: Record<string, string> = {
          from: "from_",
          _meta: "meta",
          _field_names: "field_names",
          _routing: "routing",
          _source: "source",
          _source_excludes: "source_excludes",
          _source_includes: "source_includes",
        };
        if (aliases[context]) {
          return aliases[context];
        }
        return context;
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

      // custom condition to check for request body kind
      Handlebars.registerHelper(
        "requestKind",
        function (this: ParsedRequest, kind: string, options) {
          if (this.request?.kind == kind) {
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
