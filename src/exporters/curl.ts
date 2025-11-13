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
    const escapedDoubleQuote = options.windows ? '""' : '\\"';
    const envPrefix = options.windows ? "$Env:" : "$";
    const newLineInCmd = options.windows ? "`n" : "\\n";
    const auth = ` -H "Authorization: ApiKey ${envPrefix}ELASTIC_API_KEY"`;
    const otherUrls = (options.otherUrls as Record<string, string>) ?? {};
    let output = "";
    for (const request of requests) {
      let headers = auth;
      let body = "";
      if (request.body) {
        if (
          Array.isArray(request.body) &&
          request.mediaTypes?.includes("application/x-ndjson")
        ) {
          // this is a bulk request with ndjson payload
          headers += ' -H "Content-Type: application/x-ndjson"';
          const escapedSingleQuote = options.windows ? "''" : "'\"'\"$$'";
          if (!options.windows) {
            body =
              " -d $'" +
              request.body
                .map((line) =>
                  JSON.stringify(line).replaceAll("'", escapedSingleQuote),
                )
                .join(newLineInCmd) +
              newLineInCmd +
              "'";
          } else {
            body =
              ' -d "' +
              request.body
                .map((line) =>
                  JSON.stringify(line).replaceAll('"', escapedDoubleQuote),
                )
                .join(newLineInCmd) +
              newLineInCmd +
              '"';
          }
        } else {
          headers += ' -H "Content-Type: application/json"';
          const escapedSingleQuote = options.windows ? "''" : "'\"'\"'";
          body =
            " -d '" +
            JSON.stringify(request.body).replaceAll("'", escapedSingleQuote) +
            "'";
        }
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
