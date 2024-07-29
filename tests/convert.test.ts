import {
  convertRequests,
  listFormats,
  FormatExporter,
  ConvertOptions,
} from "../src/convert";
import { ParsedRequest } from "../src/parse";

const devConsoleScript = `GET /

POST /my-index/_search?from=40&size=20
{
  "query": {
    "term": {
      "user.id": "kimchy's"
    }
  }
}`;

describe("convert", () => {
  it("checks for curl", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        checkOnly: true,
      }),
    ).toBeTruthy();
  });

  it("checks for python", async () => {
    expect(
      await convertRequests(devConsoleScript, "python", {
        checkOnly: true,
      }),
    ).toBeTruthy();
  });

  it("checks for javascript", async () => {
    expect(
      await convertRequests(devConsoleScript, "javascript", {
        checkOnly: true,
      }),
    ).toBeTruthy();
  });

  it("converts to curl", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
      }),
    ).toEqual(
      'curl -X GET "http://localhost:9876/"\ncurl -X POST -H "Content-Type: application/json" -d \'{"query":{"term":{"user.id":"kimchy\'"\'"\'s"}}}\' "http://localhost:9876/my-index/_search?from=40&size=20"\n',
    );
  });

  it("converts to curl", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
        windows: true,
      }),
    ).toEqual(
      'curl -X GET "http://localhost:9876/"\ncurl -X POST -H "Content-Type: application/json" -d \'{"query":{"term":{"user.id":"kimchy\'\'s"}}}\' "http://localhost:9876/my-index/_search?from=40&size=20"\n',
    );
  });

  it("converts to python", async () => {
    expect(await convertRequests(devConsoleScript, "python", {})).toEqual(
      `resp = client.info()

resp1 = client.search(
    index="my-index",
    from_="40",
    size="20",
    query={
        "term": {
            "user.id": "kimchy's"
        }
    },
)

`,
    );
  });

  it("converts to python and prints the response", async () => {
    expect(
      await convertRequests(devConsoleScript, "python", {
        printResponse: true,
      }),
    ).toEqual(
      `resp = client.info()
print(resp)

resp1 = client.search(
    index="my-index",
    from_="40",
    size="20",
    query={
        "term": {
            "user.id": "kimchy's"
        }
    },
)
print(resp1)

`,
    );
  });

  it("converts to a complete python script", async () => {
    expect(
      await convertRequests(devConsoleScript, "python", {
        complete: true,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `import os
from elasticsearch import Elasticsearch

client = Elasticsearch(
    hosts=["https://localhost:9999"],
    api_key=os.getenv("ELASTIC_API_KEY"),
)

resp = client.info()

resp1 = client.search(
    index="my-index",
    from_="40",
    size="20",
    query={
        "term": {
            "user.id": "kimchy's"
        }
    },
)

`,
    );
  });

  it("converts an unsupported API to python", async () => {
    expect(
      await convertRequests("GET /_internal/desired_balance", "python", {
        complete: false,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `resp = client.perform_request(
    "GET",
    "/_internal/desired_balance",
)

`,
    );
  });

  it("converts to javascript", async () => {
    expect(await convertRequests(devConsoleScript, "javascript", {})).toEqual(
      `const response = await client.info();

const response1 = await client.search({
  index: "my-index",
  from: 40,
  size: 20,
  query: {
    term: {
      "user.id": "kimchy's",
    },
  },
});
`,
    );
  });

  it("supports a custom exporter", async () => {
    class MyExporter implements FormatExporter {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async check(requests: ParsedRequest[]): Promise<boolean> {
        return true;
      }
      async convert(
        requests: ParsedRequest[],
        options: ConvertOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
      ): Promise<string> {
        return requests.map((req) => req.api).join("\n");
      }
    }

    expect(
      await convertRequests(
        "GET /my-index/_search\nGET /\n",
        new MyExporter(),
        {},
      ),
    ).toEqual("search\ninfo");
  });

  it("returns the list of available formats", () => {
    expect(listFormats()).toContain("python");
  });
});
