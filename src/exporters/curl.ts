import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";

export class CurlExporter implements FormatExporter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async check(requests: ParsedRequest[]): Promise<boolean> {
    return true;
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    const endpoint =
      (options.elasticsearchUrl ?? "").replace(/\/$/, "") ??
      "http://localhost:9200";
    const escapedSingleQuote = options.windows ? "''" : "'\"'\"'";
    const envPrefix = options.windows ? "$env:" : "$";
    const auth = ` -H "Authorization: ApiKey ${envPrefix}ELASTIC_API_KEY"`;
    let output = "";
    for (const request of requests) {
      let headers = auth;
      let body = "";
      if (request.body) {
        headers += ' -H "Content-Type: application/json"';
        body =
          " -d '" +
          JSON.stringify(request.body).replaceAll("'", escapedSingleQuote) +
          "'";
      }
      const method =
        request.method != "HEAD" ? `-X ${request.method}` : "--head";
      output += `curl ${method}${headers}${body} "${endpoint}${request.url}"\n`;
    }
    return output;
  }
}
