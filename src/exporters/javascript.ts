import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

export class JavaScriptExporter implements FormatExporter {
  async check(): Promise<boolean> {
    return false;
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    console.log(requests, options);
    return "foojs";
  }
}
