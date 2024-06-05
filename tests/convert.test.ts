import { convertRequests } from "../src/convert";

const devConsoleScript = `GET /

GET /my-index/_search?from=40&size=20
{
  "query": {
    "term": {
      "user.id": "kimchy"
    }
  }
}`;

describe("convert", () => {
  it("checks for python", async () => {
    expect(
      await convertRequests(devConsoleScript, "python", {
        checkOnly: true,
      }),
    ).toBeTruthy();
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
            "user.id": "kimchy"
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
            "user.id": "kimchy"
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
            "user.id": "kimchy"
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
});
