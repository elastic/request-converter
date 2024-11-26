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
    const escapedSingleQuote = options.windows ? "''" : "'\"'\"'";
    const envPrefix = options.windows ? "$env:" : "$";
    const auth = ` -H "Authorization: ApiKey ${envPrefix}ELASTIC_API_KEY"`;
    const otherUrls = (options.otherUrls as Record<string, string>) ?? {};
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
      const baseUrl =
        (otherUrls[request.service] ?? "").replace(/\/$/, "") ||
        (options.elasticsearchUrl ?? "").replace(/\/$/, "") ||
        "http://localhost:9200";
      output += `curl ${method}${headers}${body} "${baseUrl}${request.url}"\n`;
    }
    return output;
  }
}
