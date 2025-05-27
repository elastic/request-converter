import http from "http";
import url from "url";
import { JSONValue } from "../../src/parse";

type ElasticsearchRequest = {
  method: string;
  path: string;
  query: { [x: string]: string | string[] | undefined };
  body: JSONValue;
};

let capturedRequest: ElasticsearchRequest | undefined;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");

  if (req.url == "/__getLastRequest") {
    if (capturedRequest != undefined) {
      res.end(JSON.stringify(capturedRequest));
      capturedRequest = undefined;
    } else {
      res.end('"undefined"');
    }
  } else {
    // fool the client into thinking they are talking to a real Elasticsearch
    res.setHeader("X-Elastic-Product", "Elasticsearch");

    const parsedUrl = url.parse(req.url as string, true);
    capturedRequest = {
      method: req.method as string,
      path: decodeURIComponent(parsedUrl.pathname as string).replace(
        /(.)\/$/,
        "$1",
      ),
      query: parsedUrl.query,
      body: {},
    };

    // fix query string options that are empty to true
    for (const key in capturedRequest.query) {
      if (capturedRequest.query[key] == "") {
        capturedRequest.query[key] = "true";
      }
      capturedRequest.query[key] = decodeURIComponent(
        capturedRequest.query[key] as string,
      );
    }

    const body: string[] = [];
    req.on("data", (chunk) => body.push(chunk));
    req.on("end", () => {
      if (capturedRequest) {
        const fullBody = body.length > 0 ? body.join() : "{}";
        if ((req.headers["content-type"] ?? "").includes("ndjson")) {
          capturedRequest.body = fullBody
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
        } else {
          capturedRequest.body = JSON.parse(fullBody);
        }
      }
      res.end("{}");
    });
  }
});

export async function startServer(): Promise<void> {
  return new Promise<void>((resolve) => {
    server.listen(9876, "localhost", () => resolve());
  });
}

export async function stopServer(): Promise<void> {
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
