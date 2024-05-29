import { readFile } from "fs/promises";
import path from 'path';
import Handlebars from "handlebars";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

export class PythonExporter implements FormatExporter {
  template: Handlebars.TemplateDelegate | undefined;

  async getTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (!this.template) {
      // custom JSON-style renderer
      Handlebars.registerHelper('json', context => {
        let lines = JSON.stringify(context, null, 4).split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
          lines[i] = '    ' + lines[i]
        }
        return lines.join("\n");
      });

      // custom aliased word renderer
      Handlebars.registerHelper('alias', context => {
        const aliases: Record<string, string> = {
          "from": "from_",
          "_meta": "meta",
          "_field_names": "field_names",
          "_routing": "routing",
          "_source": "source",
          "_source_excludes": "source_excludes",
          "_source_includes": "source_includes",
        }
        if (aliases[context]) {
          return aliases[context]
        }
        return context;
      });

      // custom conditional for reguests without any arguments
      Handlebars.registerHelper('hasArgs', (context, options) => {
        if (Object.keys(context.params ?? {}).length + Object.keys(context.query ?? {}).length + Object.keys(context.body ?? {}).length > 0) {
          return options.fn(context);
        }
        else {
          return options.inverse(context);
        }
      });

      const t = await readFile(path.join(__dirname, './python.tpl'), { encoding: 'utf-8' });
      this.template = Handlebars.compile(t);
    }
    return this.template;
  }

  async check(): Promise<boolean> {
    return true;
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    return (await this.getTemplate())({requests, ...options});
  }
}
