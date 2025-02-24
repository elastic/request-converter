import { parseRequest, parseRequests } from "../src/parse";

describe("parse", () => {
  it("parses info GET request", async () => {
    const req = await parseRequest("GET /");
    expect(req).toMatchObject({
      source: "GET /",
      service: "es",
      api: "info",
      params: {},
      method: "GET",
      url: "/",
      path: "/",
    });
  });

  it("parses search GET request", async () => {
    const req = await parseRequest(
      "GET /my-index/_search?size=5&expand_wildcards",
    );
    expect(req).toMatchObject({
      source: "GET /my-index/_search?size=5&expand_wildcards",
      service: "es",
      api: "search",
      params: { index: "my-index" },
      method: "GET",
      url: "/my-index/_search?size=5&expand_wildcards",
      path: "/my-index/_search",
      query: { size: "5", expand_wildcards: "true" },
    });
  });

  it("parses search POST request", async () => {
    const req = await parseRequest(`POST /my-index/_search
{
  "size": 5
}
`);
    expect(req).toMatchObject({
      source: 'POST /my-index/_search\n{\n  "size": 5\n}',
      service: "es",
      api: "search",
      params: { index: "my-index" },
      method: "POST",
      url: "/my-index/_search",
      path: "/my-index/_search",
      body: { size: 5 },
    });
  });

  it("parses search POST request given in a single line", async () => {
    const req = await parseRequest(`POST /my-index/_search { "size": 5 }`);
    expect(req).toMatchObject({
      source: 'POST /my-index/_search { "size": 5 }',
      service: "es",
      api: "search",
      params: { index: "my-index" },
      method: "POST",
      url: "/my-index/_search",
      path: "/my-index/_search",
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


PUT /customer%7B/_doc/1{
  "foo": {  // comment
    "bar": "GET{POST}"
  }
}
GET /customer/_doc/1

POST /_bulk?foo=bar
{ "name": "John Doe" }
{ "name": "John Doe" } // comment
{ "name": "John Doe", }


POST /_bulk?foo=bar
{ "name": "John\\nDoe" }
{ "name": "John\\nDoe" }
{ "name": "John\\nDoe" }


GET /{customer}/_doc/1

POST _nodes/reload_secure_settings\n{\n  "reload_secure_settings": "s3cr3t" <1>\n}

GET {my_index}/_analyze <3>\n{\n  "field": "text",\n  "text": "The quick Brown Foxes.", \n}

POST\n_ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update\n{\n  "description": "Snapshot 1",\n  "retain": true\n}
`);
    expect(reqs.length).toEqual(11);
    expect(reqs[0]).toMatchObject({
      source: 'PUT /customer/_doc/1?foo=bar\n{\n  "name": "John Doe"\n}',
      service: "es",
      api: "index",
      params: { index: "customer", id: "1" },
      method: "PUT",
      url: "/customer/_doc/1?foo=bar",
      path: "/customer/_doc/1",
      rawPath: "/customer/_doc/1",
      query: { foo: "bar" },
      body: { name: "John Doe" },
    });
    expect(reqs[1]).toMatchObject({
      source: "GET /customer/_doc/1",
      service: "es",
      api: "get",
      params: { index: "customer", id: "1" },
      method: "GET",
      url: "/customer/_doc/1",
      path: "/customer/_doc/1",
      rawPath: "/customer/_doc/1",
    });
    expect(reqs[2]).toMatchObject({
      source: "GET/customer/_doc/1?foo=bar&v",
      service: "es",
      api: "get",
      params: { index: "customer", id: "1" },
      method: "GET",
      url: "/customer/_doc/1?foo=bar&v",
      path: "/customer/_doc/1",
      rawPath: "/customer/_doc/1",
      query: { foo: "bar", v: "true" },
    });
    expect(reqs[3]).toMatchObject({
      source:
        'PUT /customer%7B/_doc/1{\n  "foo": {\n    "bar": "GET{POST}"\n  }\n}',
      service: "es",
      api: "index",
      params: { index: "customer{", id: "1" },
      method: "PUT",
      url: "/customer%7B/_doc/1",
      path: "/customer{/_doc/1",
      rawPath: "/customer%7B/_doc/1",
      body: { foo: { bar: "GET{POST}" } },
    });
    expect(reqs[4]).toMatchObject({
      source: "GET /customer/_doc/1",
      service: "es",
      api: "get",
      params: { index: "customer", id: "1" },
      method: "GET",
      url: "/customer/_doc/1",
      path: "/customer/_doc/1",
      rawPath: "/customer/_doc/1",
    });
    expect(reqs[5]).toMatchObject({
      source:
        'POST /_bulk?foo=bar\n{ "name": "John Doe" }\n{ "name": "John Doe" }\n{ "name": "John Doe", }',
      service: "es",
      api: "bulk",
      params: {},
      method: "POST",
      url: "/_bulk?foo=bar",
      path: "/_bulk",
      rawPath: "/_bulk",
      query: { foo: "bar" },
      body: [{ name: "John Doe" }, { name: "John Doe" }, { name: "John Doe" }],
    });
    expect(reqs[6]).toMatchObject({
      source:
        'POST /_bulk?foo=bar\n{ "name": "John\\nDoe" }\n{ "name": "John\\nDoe" }\n{ "name": "John\\nDoe" }',
      service: "es",
      api: "bulk",
      params: {},
      method: "POST",
      url: "/_bulk?foo=bar",
      path: "/_bulk",
      rawPath: "/_bulk",
      query: { foo: "bar" },
      body: [
        { name: "John\nDoe" },
        { name: "John\nDoe" },
        { name: "John\nDoe" },
      ],
    });
    expect(reqs[7]).toMatchObject({
      source: "GET /{customer}/_doc/1",
      service: "es",
      api: "get",
      params: { index: "{customer}", id: "1" },
      method: "GET",
      url: "/%7Bcustomer%7D/_doc/1",
      path: "/{customer}/_doc/1",
      rawPath: "/%7Bcustomer%7D/_doc/1",
    });
    expect(reqs[8]).toMatchObject({
      source:
        'POST _nodes/reload_secure_settings\n{\n  "reload_secure_settings": "s3cr3t" \n}',
      service: "es",
      api: "nodes.reload_secure_settings",
      params: {},
      method: "POST",
      url: "/_nodes/reload_secure_settings",
      path: "/_nodes/reload_secure_settings",
      rawPath: "/_nodes/reload_secure_settings",
      body: { reload_secure_settings: "s3cr3t" },
    });
    expect(reqs[9]).toMatchObject({
      source:
        'GET {my_index}/_analyze \n{\n  "field": "text",\n  "text": "The quick Brown Foxes.", \n}',
      service: "es",
      api: "indices.analyze",
      params: { index: "{my_index}" },
      method: "GET",
      url: "/%7Bmy_index%7D/_analyze",
      path: "/{my_index}/_analyze",
      rawPath: "/%7Bmy_index%7D/_analyze",
      body: { field: "text", text: "The quick Brown Foxes." },
    });
    expect(reqs[10]).toMatchObject({
      source:
        'POST\n_ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update\n{\n  "description": "Snapshot 1",\n  "retain": true\n}',
      service: "es",
      api: "ml.update_model_snapshot",
      params: { job_id: "it_ops_new_logs", snapshot_id: "1491852978" },
      method: "POST",
      url: "/_ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update",
      path: "/_ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update",
      rawPath:
        "/_ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update",
      body: { description: "Snapshot 1", retain: true },
    });
  });

  it("parses bodies with triple quotes", async () => {
    const req = await parseRequest(`POST /_search
{
  "foo": """{"bar": "baz"}"""
}`);
    expect(req.body).toMatchObject({ foo: '{"bar": "baz"}' });
  });

  it("errors with unknown URLs", async () => {
    expect(
      async () => await parseRequest(`GET /my-index/invalid`),
    ).rejects.toThrowError("There is no handler");
  });

  it("errors with badly formatted bodies", async () => {
    const script = `GET /my-index/_search
{
  "query": ...
}`;
    expect(async () => await parseRequest(script)).rejects.toThrowError(
      "body cannot be parsed",
    );
    const req = await parseRequest(script, { ignoreErrors: true });
    expect(req).toMatchObject({
      source: 'GET /my-index/_search\n{\n  "query": ...\n}',
      service: "es",
      api: "search",
      body: '\n{\n  "query": ...\n}',
      method: "GET",
      params: {
        index: "my-index",
      },
      path: "/my-index/_search",
      rawPath: "/my-index/_search",
    });
  });

  it("errors with incomplete bodies", async () => {
    const script = `GET /my-index/_search
{`;
    expect(async () => await parseRequests(script)).rejects.toThrowError(
      "body cannot be parsed",
    );
    const req = await parseRequest(script, { ignoreErrors: true });
    expect(req).toMatchObject({
      source: "GET /my-index/_search\n{",
      service: "es",
      api: "search",
      body: "\n{",
      method: "GET",
      params: {
        index: "my-index",
      },
      path: "/my-index/_search",
      rawPath: "/my-index/_search",
    });
  });

  it("parses kibana requests", async () => {
    const req = await parseRequest(
      "GET kbn:/api/saved_objects/_find?type=dashboard",
    );
    expect(req).toMatchObject({
      source: "GET kbn:/api/saved_objects/_find?type=dashboard",
      service: "kbn",
      method: "GET",
      params: {},
      url: "/api/saved_objects/_find?type=dashboard",
      path: "/api/saved_objects/_find",
      query: { type: "dashboard" },
    });
  });
});
