import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

export class JavaScriptExporter implements FormatExporter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async check(requests: ParsedRequest[]): Promise<boolean> {
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
