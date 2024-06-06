import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

export class CurlExporter implements FormatExporter {
  async check(): Promise<boolean> {
    return true;
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    const endpoint =
      (options.elasticsearchUrl ?? "").replace(/\/$/, "") ??
      "http://localhost:9200";
    let output = "";
    for (const request of requests) {
      let headers = "";
      let body = "";
      if (request.body) {
        headers = ' -H "Content-Type: application/json"';
        body = " -d '" + JSON.stringify(request.body) + "'";
      }
      output += `curl -X ${request.method}${headers}${body} ${endpoint}${request.url}\n`;
    }
    return output;
  }
}
