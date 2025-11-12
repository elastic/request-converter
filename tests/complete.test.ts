import { getCompletions } from "../src/complete";
import { loadSchema } from "../src/parse";

describe("complete", () => {
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
  it("accepts empty requests", async () => {
    const req = await getCompletions("");
    expect(req).toMatchObject([]);
    const req2 = await getCompletions("GET /\n");
    expect(req2).toMatchObject([]);
    const req3 = await getCompletions('GET /\n{\n  "foo": "bar"\n}\n\n');
    expect(req3).toMatchObject([]);
    const req4 = await getCompletions("{}");
    expect(req4).toMatchObject([]);
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
    const req11 = await getCompletions("GET /_cat/indices?f");
    expect(req11).toContainEqual({ replace: "f", insert: "ormat" });
    expect(req11).toContainEqual({ replace: "f", insert: "ilter_path" });
    const req12 = await getCompletions("GET /_cat/indices?format=c");
    expect(req12).toContainEqual({ replace: "c", insert: "bor" });
    const req13 = await getCompletions("GET /myindex/_sea");
    expect(req13).toContainEqual({ replace: "/myindex/_sea", insert: "rch" });
  });
  it("completes request bodies", async () => {
    await loadSchema("./src/schema.json");
    const req = await getCompletions('POST /_create_from/src/dst {"');
    expect(req).toContainEqual({
      replace: '"',
      insert: 'mappings_override"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
    const req2 = await getCompletions('POST /_create_from/src/dst {"ma');
    expect(req2).toContainEqual({
      replace: '"ma',
      insert: 'ppings_override"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
    const req3 = await getCompletions(
      'POST /_create_from/src/dst {"mappings_override": null, "ma',
    );
    expect(req3).not.toContainEqual({
      replace: "ma",
      insert: "ppings_override",
      extraBeforeCursor: '": {',
      extraAfterCursor: "}",
    });
    const req4 = await getCompletions(
      'POST /_create_from/src/dst {"foo": "bar","',
    );
    expect(req4).toContainEqual({
      replace: '"',
      insert: 'mappings_override"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
    const req5 = await getCompletions('POST /_create_from/src/dst {"foo');
    expect(req5).toMatchObject([]);
    const req6 = await getCompletions(
      'POST /_create_from/src/dst {"remove_index_blocks": ',
    );
    expect(req6).toContainEqual({ replace: "", insert: "false" });
    expect(req6).toContainEqual({ replace: "", insert: "true" });
    const req7 = await getCompletions(
      'POST /_create_from/src/dst {"remove_index_blocks": t',
    );
    expect(req7).toContainEqual({ replace: "t", insert: "rue" });
    const req8 = await getCompletions(
      'POST /_create_from/src/dst {"mappings_override": { "_m',
    );
    expect(req8).toContainEqual({
      replace: '"_m',
      insert: 'eta"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    const req9 = await getCompletions('GET /_search\n{ "docvalue_field');
    expect(req9).toContainEqual({
      replace: '"docvalue_field',
      insert: 's"',
      extraBeforeCursor: ": [",
      extraAfterCursor: "]",
    });
    const req10 = await getCompletions(
      'GET /_search\n{ "docvalue_fields": [{"',
    );
    expect(req10).toContainEqual({
      replace: '"',
      insert: 'field"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    expect(req10).toContainEqual({
      replace: '"',
      insert: 'format"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    expect(req10).toContainEqual({
      replace: '"',
      insert: 'include_unmapped"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    const req11 = await getCompletions(
      'GET /_search\n{ "docvalue_fields": [{"format": "","f',
    );
    expect(req11).toContainEqual({
      replace: '"f',
      insert: 'ield"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    expect(req11).not.toContainEqual({
      replace: '"f',
      insert: 'ormat"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    const req12 = await getCompletions(
      'GET /_search\n{ "docvalue_fields": [{"format": "","field": ""},{"f',
    );
    expect(req12).toContainEqual({
      replace: '"f',
      insert: 'ield"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    expect(req12).toContainEqual({
      replace: '"f',
      insert: 'ormat"',
      extraBeforeCursor: ": ",
      extraAfterCursor: "",
    });
    const req13 = await getCompletions('GET /_search\n{ "highlight": {"fie');
    expect(req13).toContainEqual({
      replace: '"fie',
      insert: 'lds"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
    const req14 = await getCompletions('GET /_search\n{"aggregations": {"fo');
    expect(req14).toMatchObject([]);
    const req15 = await getCompletions(
      'GET /_search\n{"aggregations": {"foo": {"bo',
    );
    expect(req15).toContainEqual({
      replace: '"bo',
      insert: 'xplot"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
    const req16 = await getCompletions(
      'GET /_search\n{"aggregations": {"foo": {"aggregations": {"bar":{"bo',
    );
    expect(req16).toContainEqual({
      replace: '"bo',
      insert: 'xplot"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
    const req17 = await getCompletions(
      'GET /_search\n{"aggregations": {"foo": {"date_histogram": {"calendar_interval": "m',
    );
    expect(req17).toContainEqual({
      replace: '"m',
      insert: 'onth"',
    });
    expect(req17).toContainEqual({
      replace: '"m',
      insert: 'inute"',
    });
    const req18 = await getCompletions('GET /_search {"query":{"bool":{"mu');
    expect(req18).toContainEqual({
      replace: '"mu',
      insert: 'st"',
      extraBeforeCursor: ": [{",
      extraAfterCursor: "}]",
    });
    const req19 = await getCompletions(
      'GET /_search {"query":{"bool":{"must":{"',
    );
    expect(req19).toContainEqual({
      replace: '"',
      insert: 'match"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
    const req20 = await getCompletions(
      'GET /_search {"query":{"bool":{"must":[{"foo":"bar"},{"',
    );
    expect(req20).toContainEqual({
      replace: '"',
      insert: 'match"',
      extraBeforeCursor: ": {",
      extraAfterCursor: "}",
    });
  });
  it("completes when there are comments", async () => {
    const req = await getCompletions("# foo\nGE");
    expect(req).toContainEqual({
      replace: "GE",
      insert: "T ",
    });
  });
});
