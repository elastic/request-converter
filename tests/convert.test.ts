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

const kibanaScript = `GET /

GET kbn:/api/saved_objects/_find?type=dashboard`;

describe("convert", () => {
  it("checks for curl", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        checkOnly: true,
      }),
    ).toBeTruthy();
    expect(
      await convertRequests(kibanaScript, "curl", {
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
    expect(
      await convertRequests(kibanaScript, "python", {
        checkOnly: true,
      }),
    ).toBeFalsy();
  });

  it("checks for javascript", async () => {
    expect(
      await convertRequests(devConsoleScript, "javascript", {
        checkOnly: true,
      }),
    ).toBeTruthy();
    expect(
      await convertRequests(kibanaScript, "javascript", {
        checkOnly: true,
      }),
    ).toBeFalsy();
  });

  it("errors for unknown language", async () => {
    expect(
      async () =>
        await convertRequests(devConsoleScript, "perl", {
          checkOnly: true,
        }),
    ).rejects.toThrowError("Invalid output format");
  });

  it("converts to curl", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
      }),
    ).toEqual(
      'curl -X GET -H "Authorization: ApiKey $ELASTIC_API_KEY" "http://localhost:9876/"\ncurl -X POST -H "Authorization: ApiKey $ELASTIC_API_KEY" -H "Content-Type: application/json" -d \'{"query":{"term":{"user.id":"kimchy\'"\'"\'s"}}}\' "http://localhost:9876/my-index/_search?from=40&size=20"\n',
    );
  });

  it("converts to curl", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
        windows: true,
      }),
    ).toEqual(
      'curl -X GET -H "Authorization: ApiKey $env:ELASTIC_API_KEY" "http://localhost:9876/"\ncurl -X POST -H "Authorization: ApiKey $env:ELASTIC_API_KEY" -H "Content-Type: application/json" -d \'{"query":{"term":{"user.id":"kimchy\'\'s"}}}\' "http://localhost:9876/my-index/_search?from=40&size=20"\n',
    );
  });

  it("converts Kibana to curl", async () => {
    expect(
      await convertRequests(kibanaScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
        otherUrls: { kbn: "http://localhost:5601" },
      }),
    ).toEqual(
      'curl -X GET -H "Authorization: ApiKey $ELASTIC_API_KEY" "http://localhost:9876/"\ncurl -X GET -H "Authorization: ApiKey $ELASTIC_API_KEY" "http://localhost:5601/api/saved_objects/_find?type=dashboard"\n',
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

  it("errors when converting Kibana to Python", async () => {
    expect(
      async () =>
        await convertRequests(kibanaScript, "python", {
          complete: false,
          elasticsearchUrl: "https://localhost:9999",
        }),
    ).rejects.toThrowError("Cannot perform conversion");
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

  it("converts to a complete javascript snippet with full async compatibility", async () => {
    expect(
      await convertRequests(devConsoleScript, "javascript", { complete: true }),
    ).toEqual(
      `const { Client } = require("@elastic/elasticsearch");

const client = new Client({
  nodes: [process.env["ELASTICSEARCH_URL"]],
  auth: {
    apiKey: process.env["ELASTIC_API_KEY"],
  },
});

async function run() {
  const response = await client.info();

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
}

run();
`,
    );
  });

  it("errors when converting Kibana to JavaScript", async () => {
    expect(
      async () =>
        await convertRequests(kibanaScript, "javascript", {
          complete: false,
          elasticsearchUrl: "https://localhost:9999",
        }),
    ).rejects.toThrowError("Cannot perform conversion");
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
