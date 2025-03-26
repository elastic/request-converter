import { getCompletions } from "../src/complete";
import { loadSchema } from "../src/parse";

describe("complete", () => {
  it("completes HTTP methods for an empty request", async () => {
    const req = await getCompletions("");
    expect(req).toMatchObject([
      { replace: "", insert: "GET " },
      { replace: "", insert: "POST " },
      { replace: "", insert: "PUT " },
      { replace: "", insert: "DELETE " },
      { replace: "", insert: "HEAD " },
    ]);
    const req2 = await getCompletions("GET /\n");
    expect(req2).toMatchObject([
      { replace: "", insert: "GET " },
      { replace: "", insert: "POST " },
      { replace: "", insert: "PUT " },
      { replace: "", insert: "DELETE " },
      { replace: "", insert: "HEAD " },
    ]);
    const req3 = await getCompletions('GET /\n{\n  "foo": "bar"\n}\n');
    expect(req3).toMatchObject([
      { replace: "", insert: "GET " },
      { replace: "", insert: "POST " },
      { replace: "", insert: "PUT " },
      { replace: "", insert: "DELETE " },
      { replace: "", insert: "HEAD " },
    ]);
  });
  it("completes HTTP methods", async () => {
    const req = await getCompletions("G");
    expect(req).toMatchObject([{ replace: "G", insert: "ET " }]);
    const req2 = await getCompletions("P");
    expect(req2).toMatchObject([
      { replace: "P", insert: "OST " },
      { replace: "P", insert: "UT " },
    ]);
    const req3 = await getCompletions('GET /\n{\n  "foo": "bar"\n}\nPU');
    expect(req3).toMatchObject([{ replace: "PU", insert: "T " }]);
    const req4 = await getCompletions("POST");
    expect(req4).toMatchObject([{ replace: "POST", insert: " " }]);
    const req5 = await getCompletions("DELETE ");
    expect(req5).toMatchObject([]);
  });
  it("completes endpoint URLs and query strings", async () => {
    await loadSchema("./src/schema.json");
    const req = await getCompletions("GET /_sea");
    expect(req).toContainEqual({ replace: "/_sea", insert: "rch" });
    expect(req).toContainEqual({ replace: "/_sea", insert: "rch/scroll" });
    expect(req).toContainEqual({
      replace: "/_sea",
      insert: "rch/scroll/{scroll_id}",
    });
    const req2 = await getCompletions("GET /_search/");
    expect(req2).toContainEqual({ replace: "/_search/", insert: "scroll" });
    expect(req2).toContainEqual({
      replace: "/_search/",
      insert: "scroll/{scroll_id}",
    });
    const req3 = await getCompletions("GET /");
    expect(req3).toContainEqual({ replace: "/", insert: "{index}/_search" });
    const req4 = await getCompletions("GET /foo");
    expect(req4).toContainEqual({ replace: "/foo", insert: "/_search" });
    const req5 = await getCompletions("GET /_search?");
    expect(req5).toContainEqual({ replace: "", insert: "human" });
    const req6 = await getCompletions("GET /_search?pre");
    expect(req6).toContainEqual({ replace: "pre", insert: "tty" });
    const req7 = await getCompletions("GET /_search?pretty=");
    expect(req7).toContainEqual({ replace: "", insert: "true" });
    expect(req7).toContainEqual({ replace: "", insert: "false" });
    const req8 = await getCompletions("GET /_search?pretty=fa");
    expect(req8).toContainEqual({ replace: "fa", insert: "lse" });
    const req9 = await getCompletions("GET /_search?pretty=false&pret");
    expect(req9).toMatchObject([]);
    const req10 = await getCompletions("GET /_search?pretty=false&");
    expect(req10).not.toContainEqual({ replace: "", insert: "pretty" });
  });
  it("completes request bodies", async () => {
    await loadSchema("./src/schema.json");
    //const req = await getCompletions('POST /_create_from/src/dst { "foo": "bar", "baz": {"a": "b", "c": {"d": "e"}}, "');
    //const req2 = await getCompletions('POST /_search { "foo": "b');
    //const req3 = await getCompletions('POST /_create_from/src/dst {"a":{"b":[{"c":{"d": [{"e');
    //const req = await getCompletions('POST /my-index/_search\n{\n  "');
    //const req2 = await getCompletions('POST /_create_from/{src}/dst { "mappings_override": {"d');
  });
});
