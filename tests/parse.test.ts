import { parseRequest, parseRequests } from "../src/parse";

describe("parse", () => {
  it("parses info GET request", async () => {
    const req = await parseRequest("GET /");
    expect(req).toEqual({
      api: "info",
      params: {},
      method: "GET",
      url: "/",
    });
  });

  it("parses search GET request", async () => {
    const req = await parseRequest(
      "GET /my-index/_search?size=5&expand_wildcards",
    );
    expect(req).toEqual({
      api: "search",
      params: { index: "my-index" },
      method: "GET",
      url: "/my-index/_search",
      query: { size: "5", expand_wildcards: "true" },
    });
  });

  it("parses search POST request", async () => {
    const req = await parseRequest(`POST /my-index/_search
{
  "size": 5
}
`);
    expect(req).toEqual({
      api: "search",
      params: { index: "my-index" },
      method: "POST",
      url: "/my-index/_search",
      body: { size: 5 },
    });
  });

  it("parses a complex sequence of requests", async () => {
    const reqs = await parseRequests(`PUT /customer/_doc/1?foo=bar
{
  "name": "John Doe"
}    // comment

// comment
GET /customer/_doc/1

GET/customer/_doc/1?foo=bar&v


PUT /customer/_doc/1{
  "foo": {  // comment
    "bar": "GET{POST}"
  }
}
GET /customer/_doc/1

POST /_bulk?foo=bar
{ "name": "John Doe" }
{ "name": "John Doe" } // comment
{ "name": "John Doe" }


POST /_bulk?foo=bar
{ "name": "John\nDoe" }
{ "name": "John\nDoe" }
{ "name": "John\nDoe" }

POST /_bulk?foo=bar
{ "name": "John\\nDoe" }
{ "name": "John\\nDoe" }
{ "name": "John\\nDoe" }


GET /customer/_doc/1

POST _nodes/reload_secure_settings\n{\n  "reload_secure_settings": "s3cr3t" <1>\n}

GET my_index/_analyze <3>\n{\n  "field": "text",\n  "text": "The quick Brown Foxes."\n}

POST\n_ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update\n{\n  "description": "Snapshot 1",\n  "retain": true\n}
`);
    expect(reqs.length).toEqual(12);
    expect(reqs[0]).toEqual({
      api: "index",
      params: { index: "customer", id: "1" },
      method: "PUT",
      url: "/customer/_doc/1",
      query: { foo: "bar" },
      body: { name: "John Doe" },
    });
    expect(reqs[1]).toEqual({
      api: "get",
      params: { index: "customer", id: "1" },
      method: "GET",
      url: "/customer/_doc/1",
    });
    expect(reqs[2]).toEqual({
      api: "get",
      params: { index: "customer", id: "1" },
      method: "GET",
      url: "/customer/_doc/1",
      query: { foo: "bar", v: "true" },
    });
    expect(reqs[3]).toEqual({
      api: "index",
      params: { index: "customer", id: "1" },
      method: "PUT",
      url: "/customer/_doc/1",
      body: { foo: { bar: "GET{POST}" } },
    });
    expect(reqs[4]).toEqual({
      api: "get",
      params: { index: "customer", id: "1" },
      method: "GET",
      url: "/customer/_doc/1",
    });
    expect(reqs[5]).toEqual({
      api: "bulk",
      params: {},
      method: "POST",
      url: "/_bulk",
      query: { foo: "bar" },
      body: [{ name: "John Doe" }, { name: "John Doe" }, { name: "John Doe" }],
    });
    expect(reqs[6]).toEqual({
      api: "bulk",
      params: {},
      method: "POST",
      url: "/_bulk",
      query: { foo: "bar" },
      body: '\n{ "name": "John\nDoe" }\n{ "name": "John\nDoe" }\n{ "name": "John\nDoe" }',
    });
    expect(reqs[7]).toEqual({
      api: "bulk",
      params: {},
      method: "POST",
      url: "/_bulk",
      query: { foo: "bar" },
      body: [
        { name: "John\nDoe" },
        { name: "John\nDoe" },
        { name: "John\nDoe" },
      ],
    });
    expect(reqs[8]).toEqual({
      api: "get",
      params: { index: "customer", id: "1" },
      method: "GET",
      url: "/customer/_doc/1",
    });
    expect(reqs[9]).toEqual({
      api: "nodes.reload_secure_settings",
      params: {},
      method: "POST",
      url: "/_nodes/reload_secure_settings",
      body: { reload_secure_settings: "s3cr3t" },
    });
    expect(reqs[10]).toEqual({
      api: "indices.analyze",
      params: { index: "my_index" },
      method: "GET",
      url: "/my_index/_analyze",
      body: { field: "text", text: "The quick Brown Foxes." },
    });
    expect(reqs[11]).toEqual({
      api: "ml.update_model_snapshot",
      params: { job_id: "it_ops_new_logs", snapshot_id: "1491852978" },
      method: "POST",
      url: "/_ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update",
      body: { description: "Snapshot 1", retain: true },
    });
  });

  it("parses bodies with triple quotes", async () => {
    const req = await parseRequest(`POST /_search
{
  "foo": """{"bar": "baz"}"""
}`);
    expect(req.body).toEqual({ foo: '{"bar": "baz"}' });
  });

  it("errors with unknown URLs", async () => {
    expect(
      async () => await parseRequest(`GET /my-index/invalid`),
    ).rejects.toThrowError("There is no handler");
  });
});
