import childProcess, { ChildProcess } from "child_process";
import path from "path";
import {
  convertRequests,
  listFormats,
  FormatExporter,
  ConvertOptions,
  ExternalExporter,
  SubprocessExporter,
  WebExporter,
} from "../src/convert";
import { ParsedRequest } from "../src/parse";
import wasmRust from "./wasm/wasm-simple/pkg/wasm_simple";

const devConsoleScript = `GET /

POST /my-index/_search?from=40&size=20
{
  "query": {
    "term": {
      "user.id": "kimchy's"
    }
  }
}`;

const devConsoleBulkScript = `POST _bulk
{ "index" : { "_index" : "test", "_id" : "1" } }
{ "field1" : "value1" }
{ "delete" : { "_index" : "test", "_id" : "2" } }
{ "create" : { "_index" : "test", "_id" : "3" } }
{ "field1" : "value3" }
{ "update" : {"_id" : "1", "_index" : "test"} }
{ "doc" : {"field2" : "value2"} }`;

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

  it("checks for php", async () => {
    expect(
      await convertRequests(devConsoleScript, "php", {
        checkOnly: true,
      }),
    ).toBeTruthy();
    expect(
      await convertRequests(kibanaScript, "php", {
        checkOnly: true,
      }),
    ).toBeFalsy();
  });

  it("checks for ruby", async () => {
    expect(
      await convertRequests(devConsoleScript, "ruby", {
        checkOnly: true,
      }),
    ).toBeTruthy();
    expect(
      await convertRequests(kibanaScript, "ruby", {
        checkOnly: true,
      }),
    ).toBeFalsy();
  });

  it("checks for go", async () => {
    expect(
      await convertRequests(devConsoleScript, "go", {
        checkOnly: true,
      }),
    ).toBeTruthy();
    expect(
      await convertRequests(kibanaScript, "go", {
        checkOnly: true,
      }),
    ).toBeFalsy();
  });

  it("converts to go", async () => {
    expect(await convertRequests(devConsoleScript, "go", {})).toEqual(
      `res, err := es.Info().
    Do(context.Background())

res1, err := es.Search().
    Index("my-index").
    From(40).
    Size(20).
    Request(&search.Request{
        Query: &types.Query{
            Term: map[string]types.TermQuery{
                "user.id": types.TermQuery{Value: "kimchy's"},
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts to a complete go script", async () => {
    expect(
      await convertRequests(devConsoleScript, "go", {
        complete: true,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `package main

import (
    "context"
    "log"

    "github.com/elastic/go-elasticsearch/v9"
    "github.com/elastic/go-elasticsearch/v9/typedapi/core/search"
    "github.com/elastic/go-elasticsearch/v9/typedapi/types"
)

func main() {
    cfg := elasticsearch.Config{
        Addresses: []string{"https://localhost:9999"},
    }
    es, err := elasticsearch.NewTypedClient(cfg)
    if err != nil {
        log.Fatalf("Error creating client: %s", err)
    }

    res, err := es.Info().
        Do(context.Background())

    res1, err := es.Search().
        Index("my-index").
        From(40).
        Size(20).
        Request(&search.Request{
            Query: &types.Query{
                Term: map[string]types.TermQuery{
                    "user.id": types.TermQuery{Value: "kimchy's"},
                },
            },
        }).
        Do(context.Background())
}
`,
    );
  });

  it("converts an unsupported API to go", async () => {
    expect(
      await convertRequests("GET /_internal/desired_balance", "go", {
        complete: false,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `res, err := es.Transport.Perform(&http.Request{
    Method: "GET",
    URL:    &url.URL{Path: "/_internal/desired_balance"},
    Body:   nil,
})
`,
    );
  });

  it("errors when converting Kibana to go", async () => {
    expect(
      async () =>
        await convertRequests(kibanaScript, "go", {
          complete: false,
          elasticsearchUrl: "https://localhost:9999",
        }),
    ).rejects.toThrowError("Cannot perform conversion");
  });

  it("converts subclient call with enum query param to go", async () => {
    expect(
      await convertRequests(
        `GET /_settings?expand_wildcards=all&filter_path=*.settings.index.*.slowlog`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Indices.GetSettings().
    ExpandWildcards("all").
    FilterPath("*.settings.index.*.slowlog").
    Do(context.Background())
`,
    );
  });

  it("converts cluster reroute with commands to go", async () => {
    expect(
      await convertRequests(
        `POST /_cluster/reroute?metric=none
{"commands":[{"move":{"index":"test","shard":0,"from_node":"node1","to_node":"node2"}},{"allocate_replica":{"index":"test","shard":1,"node":"node3"}}]}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Cluster.Reroute().
    Metric("none").
    Request(&reroute.Request{
        Commands: []types.Command{
            types.Command{
                Move: &types.CommandMoveAction{
                    Index: "test",
                    Shard: 0,
                    FromNode: "node1",
                    ToNode: "node2",
                },
            },
            types.Command{
                AllocateReplica: &types.CommandAllocateReplicaAction{
                    Index: "test",
                    Shard: 1,
                    Node: "node3",
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts string params that are actually numbers to go", async () => {
    expect(
      await convertRequests(
        `PUT /_ml/trained_models/elastic__distilbert-base-uncased-finetuned-conll03-english/definition/0
{"definition":"...","total_definition_length":265632637,"total_parts":64}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Ml.PutTrainedModelDefinitionPart("elastic__distilbert-base-uncased-finetuned-conll03-english", "0").
    Request(&put_trained_model_definition_part.Request{
        Definition: "...",
        TotalDefinitionLength: 265632637,
        TotalParts: 64,
    }).
    Do(context.Background())
`,
    );
  });

  it("converts infer trained model to go", async () => {
    expect(
      await convertRequests(
        `POST /_ml/trained_models/test/_infer
{"docs":[{"text":"The fool doth think he is wise, but the wise man knows himself to be a fool."}]}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Ml.InferTrainedModel("test").
    Request(&infer_trained_model.Request{
        Docs: []map[string]interface{}{
            map[string]interface{}{
                "text": "The fool doth think he is wise, but the wise man knows himself to be a fool.",
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts deeply nested role mapping rules to go", async () => {
    expect(
      await convertRequests(
        `PUT /_security/role_mapping/mapping8
{"roles":["superuser"],"enabled":true,"rules":{"all":[{"any":[{"field":{"dn":"*,ou=admin,dc=example,dc=com"}},{"field":{"username":["es-admin","es-system"]}}]},{"field":{"groups":"cn=people,dc=example,dc=com"}},{"except":{"field":{"metadata.terminated_date":null}}}]}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Security.PutRoleMapping("mapping8").
    Request(&put_role_mapping.Request{
        Roles: []string{
            "superuser",
        },
        Enabled: true,
        Rules: &types.RoleMappingRule{
            All: []types.RoleMappingRule{
                types.RoleMappingRule{
                    Any: []types.RoleMappingRule{
                        types.RoleMappingRule{
                            Field: map[string]types.FieldValue{
                                "dn": "*,ou=admin,dc=example,dc=com",
                            },
                        },
                        types.RoleMappingRule{
                            Field: map[string]types.FieldValue{
                                "username": []types.FieldValue{
                                    "es-admin",
                                    "es-system",
                                },
                            },
                        },
                    },
                },
                types.RoleMappingRule{
                    Field: map[string]types.FieldValue{
                        "groups": "cn=people,dc=example,dc=com",
                    },
                },
                types.RoleMappingRule{
                    Except: &types.RoleMappingRule{
                        Field: map[string]types.FieldValue{
                            "metadata.terminated_date": nil,
                        },
                    },
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts match_all with enum and multi-index to go", async () => {
    expect(
      await convertRequests(
        `POST /my-index-000001,my-index-000002/_search?from=40&size=20&default_operator=AND
{"query":{"match_all":{}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Index("my-index-000001,my-index-000002").
    From(40).
    Size(20).
    DefaultOperator(operator.And).
    Request(&search.Request{
        Query: &types.Query{
            MatchAll: &types.MatchAllQuery{},
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts range query with aggregation to go", async () => {
    expect(
      await convertRequests(
        `POST /my-index-000001/_search?from=40&size=20
{"query":{"range":{"@timestamp":{"gte":"now-1d/d","lt":"now/d"}}},"aggs":{"my-agg-name":{"terms":{"field":"my-field"}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Index("my-index-000001").
    From(40).
    Size(20).
    Request(&search.Request{
        Query: &types.Query{
            Range: map[string]types.RangeQuery{
                "@timestamp": types.UntypedRangeQuery{
                    Gte: "now-1d/d",
                    Lt: "now/d",
                },
            },
        },
        Aggregations: map[string]types.Aggregations{
            "my-agg-name": types.Aggregations{
                Terms: &types.TermsAggregation{
                    Field: "my-field",
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts nested aggregation to go", async () => {
    expect(
      await convertRequests(
        `POST /_search
{"aggs":{"my-agg-name":{"terms":{"field":"my-field"},"aggs":{"my-sub-agg-name":{"avg":{"field":"my-other-field"}}}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Request(&search.Request{
        Aggregations: map[string]types.Aggregations{
            "my-agg-name": types.Aggregations{
                Terms: &types.TermsAggregation{
                    Field: "my-field",
                },
                Aggregations: map[string]types.Aggregations{
                    "my-sub-agg-name": types.Aggregations{
                        Avg: &types.AverageAggregation{
                            Field: "my-other-field",
                        },
                    },
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts aggregation with metadata to go", async () => {
    expect(
      await convertRequests(
        `POST /_search
{"aggs":{"my-agg-name":{"terms":{"field":"my-field"},"meta":{"my-metadata-field":"foo"}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Request(&search.Request{
        Aggregations: map[string]types.Aggregations{
            "my-agg-name": types.Aggregations{
                Terms: &types.TermsAggregation{
                    Field: "my-field",
                },
                Meta: "[object Object]",
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts runtime mappings with script to go", async () => {
    expect(
      await convertRequests(
        `POST /_search
{"runtime_mappings":{"message.length":{"type":"long","script":"emit(doc['message.keyword'].value.length())"}},"aggs":{"message_length":{"histogram":{"interval":10,"field":"message.length"}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Request(&search.Request{
        RuntimeMappings: map[string]types.RuntimeField{
            "message.length": types.RuntimeField{
                Type: runtimefieldtype.Long,
                Script: "emit(doc['message.keyword'].value.length())",
            },
        },
        Aggregations: map[string]types.Aggregations{
            "message_length": types.Aggregations{
                Histogram: &types.HistogramAggregation{
                    Interval: some.Int(10),
                    Field: "message.length",
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts function score query to go", async () => {
    expect(
      await convertRequests(
        `POST /_search
{"size":10,"query":{"function_score":{"query":{"bool":{"filter":[{"terms":{"tags.keyword":["Monkey","Lion"]}}]}},"functions":[{"filter":{"term":{"mustHaveTags.keyword":{"value":"Monkey"}}},"weight":1}],"score_mode":"sum","boost_mode":"sum"}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Request(&search.Request{
        Size: some.Int(10),
        Query: &types.Query{
            FunctionScore: &types.FunctionScoreQuery{
                Query: &types.Query{
                    Bool: &types.BoolQuery{
                        Filter: []types.Query{
                            types.Query{
                                Terms: &types.TermsQuery{
                                    Tags.keyword: []interface{}{
                                        "Monkey",
                                        "Lion",
                                    },
                                },
                            },
                        },
                    },
                },
                Functions: []types.FunctionScore{
                    types.FunctionScore{
                        Filter: &types.Query{
                            Term: map[string]types.TermQuery{
                                "mustHaveTags.keyword": types.TermQuery{
                                    Value: "Monkey",
                                },
                            },
                        },
                        Weight: some.Int(1),
                    },
                },
                ScoreMode: functionscoremode.Sum,
                BoostMode: functionboostmode.Sum,
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts ingest pipeline with processors to go", async () => {
    expect(
      await convertRequests(
        `PUT /_ingest/pipeline/my-pipeline
{"description":"My optional pipeline description","processors":[{"set":{"description":"My optional processor description","field":"my-long-field","value":10}},{"set":{"description":"Set 'my-boolean-field' to true","field":"my-boolean-field","value":true}},{"lowercase":{"field":"my-keyword-field"}}]}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Ingest.PutPipeline("my-pipeline").
    Request(&put_pipeline.Request{
        Description: "My optional pipeline description",
        Processors: []types.Processor{
            types.Processor{
                Set: &types.SetProcessor{
                    Description: "My optional processor description",
                    Field: "my-long-field",
                    Value: 10,
                },
            },
            types.Processor{
                Set: &types.SetProcessor{
                    Description: "Set 'my-boolean-field' to true",
                    Field: "my-boolean-field",
                    Value: true,
                },
            },
            types.Processor{
                Lowercase: &types.LowercaseProcessor{
                    Field: "my-keyword-field",
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts simulate ingest to go", async () => {
    expect(
      await convertRequests(
        `POST /_ingest/pipeline/my-pipeline/_simulate?verbose=true
{"docs":[{"_index":"index","_id":"id","_source":{"my-keyword-field":"bar"}},{"_index":"index","_id":"id","_source":{"my-long-field":10}}]}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Ingest.Simulate().
    Id("my-pipeline").
    Verbose(true).
    Request(&simulate.Request{
        Docs: []types.Document{
            types.Document{
                Index_: "index",
                Id_: "id",
                Source_: map[string]interface{}{
                    "my-keyword-field": "bar",
                },
            },
            types.Document{
                Index_: "index",
                Id_: "id",
                Source_: map[string]interface{}{
                    "my-long-field": 10,
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts index creation with analyzers to go", async () => {
    expect(
      await convertRequests(
        `PUT /arabic_example
{"settings":{"analysis":{"filter":{"arabic_stop":{"type":"stop","stopwords":"_arabic_"},"arabic_keywords":{"type":"keyword_marker","keywords":["مثال"]},"arabic_stemmer":{"type":"stemmer","language":"arabic"}},"analyzer":{"rebuilt_arabic":{"tokenizer":"standard","filter":["lowercase","decimal_digit","arabic_stop","arabic_normalization","arabic_keywords","arabic_stemmer"]}}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Indices.Create("arabic_example").
    Request(&create.Request{
        Settings: &types.IndexSettings{
            Analysis: &types.IndexSettingsAnalysis{
                Filter: map[string]types.TokenFilter{
                    "arabic_stop": map[string]interface{}{
                        "type": "stop",
                        "stopwords": "_arabic_",
                    },
                    "arabic_keywords": map[string]interface{}{
                        "type": "keyword_marker",
                        "keywords": []interface{}{
                            "\u0645\u062B\u0627\u0644",
                        },
                    },
                    "arabic_stemmer": map[string]interface{}{
                        "type": "stemmer",
                        "language": "arabic",
                    },
                },
                Analyzer: map[string]types.Analyzer{
                    "rebuilt_arabic": types.CustomAnalyzer{
                        Tokenizer: "standard",
                        Filter: []string{
                            "lowercase",
                            "decimal_digit",
                            "arabic_stop",
                            "arabic_normalization",
                            "arabic_keywords",
                            "arabic_stemmer",
                        },
                    },
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts multiple aggregations to go", async () => {
    expect(
      await convertRequests(
        `POST /my-index-000001/_search?from=40&size=20
{"aggs":{"my-first-agg-name":{"terms":{"field":"my-field"}},"my-second-agg-name":{"avg":{"field":"my-other-field"}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Index("my-index-000001").
    From(40).
    Size(20).
    Request(&search.Request{
        Aggregations: map[string]types.Aggregations{
            "my-first-agg-name": types.Aggregations{
                Terms: &types.TermsAggregation{
                    Field: "my-field",
                },
            },
            "my-second-agg-name": types.Aggregations{
                Avg: &types.AverageAggregation{
                    Field: "my-other-field",
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts KNN search with rescore to go", async () => {
    expect(
      await convertRequests(
        `POST /my-index-000001/_search?from=40&size=20
{"knn":{"field":"image-vector","query_vector":[0.1,-2],"k":15,"num_candidates":100},"fields":["title"],"rescore":{"window_size":10,"query":{"rescore_query":{"script_score":{"query":{"match_all":{}},"script":{"source":"cosineSimilarity(params.query_vector, 'image-vector') + 1.0","params":{"query_vector":[0.1,-2]}}}}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Index("my-index-000001").
    From(40).
    Size(20).
    Request(&search.Request{
        Knn: &types.KnnSearch{
            Field: "image-vector",
            QueryVector: []int{
                0.1,
                -2,
            },
            K: some.Int(15),
            NumCandidates: some.Int(100),
        },
        Fields: []types.FieldAndFormat{
            types.FieldAndFormat{Field: "title"},
        },
        Rescore: &types.Rescore{
            WindowSize: some.Int(10),
            Query: &types.RescoreQuery{
                Query: types.Query{
                    ScriptScore: &types.ScriptScoreQuery{
                        Query: types.Query{
                            MatchAll: &types.MatchAllQuery{},
                        },
                        Script: "[object Object]",
                    },
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts deeply nested queries (6 levels) to go", async () => {
    expect(
      await convertRequests(
        `POST /my-index-000001/_search?from=40&size=20
{"query":{"nested":{"path":"driver","query":{"nested":{"path":"driver.vehicle","query":{"nested":{"path":"driver.vehicle.wheel","query":{"nested":{"path":"driver.vehicle.wheel.nut","query":{"nested":{"path":"driver.vehicle.wheel.nut.metal","query":{"nested":{"path":"driver.vehicle.wheel.nut.metal.atom","query":{"match_all":{}}}}}}}}}}}}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Index("my-index-000001").
    From(40).
    Size(20).
    Request(&search.Request{
        Query: &types.Query{
            Nested: &types.NestedQuery{
                Path: "driver",
                Query: types.Query{
                    Nested: &types.NestedQuery{
                        Path: "driver.vehicle",
                        Query: types.Query{
                            Nested: &types.NestedQuery{
                                Path: "driver.vehicle.wheel",
                                Query: types.Query{
                                    Nested: &types.NestedQuery{
                                        Path: "driver.vehicle.wheel.nut",
                                        Query: types.Query{
                                            Nested: &types.NestedQuery{
                                                Path: "driver.vehicle.wheel.nut.metal",
                                                Query: types.Query{
                                                    Nested: &types.NestedQuery{
                                                        Path: "driver.vehicle.wheel.nut.metal.atom",
                                                        Query: types.Query{
                                                            MatchAll: &types.MatchAllQuery{},
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts distance feature query to go", async () => {
    expect(
      await convertRequests(
        `POST /my-index-000001/_search?from=40&size=20
{"query":{"bool":{"must":{"match":{"name":"chocolate"}},"should":{"distance_feature":{"field":"location","pivot":"1000m","origin":[-71.3,41.15]}}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Index("my-index-000001").
    From(40).
    Size(20).
    Request(&search.Request{
        Query: &types.Query{
            Bool: &types.BoolQuery{
                Must: &types.Query{
                    Match: map[string]types.MatchQuery{
                        "name": types.MatchQuery{Query: "chocolate"},
                    },
                },
                Should: &types.Query{
                    DistanceFeature: types.UntypedDistanceFeatureQuery{
                        Field: "location",
                        Pivot: "1000m",
                        Origin: []interface{}{
                            -71.3,
                            41.15,
                        },
                    },
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts complex sub-aggregation with ordering to go", async () => {
    expect(
      await convertRequests(
        `POST /_search
{"size":0,"query":{"bool":{"filter":[{"term":{"is_sold":true}},{"term":{"lender_id":4477943}}]}},"aggs":{"group_by_summaryGroup":{"terms":{"field":"group.keyword","order":{"_key":"desc"}},"aggs":{"note_count":{"value_count":{"field":"id"}},"invested_sum":{"sum":{"field":"amount_participation"}},"outstanding_principal_sum":{"sum":{"field":"principal_balance"}},"principal_repaid_sum":{"sum":{"field":"principal_repaid"}},"interest_paid_sum":{"sum":{"field":"interest_paid"}}}}}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Search().
    Request(&search.Request{
        Size: some.Int(0),
        Query: &types.Query{
            Bool: &types.BoolQuery{
                Filter: []types.Query{
                    types.Query{
                        Term: map[string]types.TermQuery{
                            "is_sold": types.TermQuery{Value: true},
                        },
                    },
                    types.Query{
                        Term: map[string]types.TermQuery{
                            "lender_id": types.TermQuery{Value: 4477943},
                        },
                    },
                },
            },
        },
        Aggregations: map[string]types.Aggregations{
            "group_by_summaryGroup": types.Aggregations{
                Terms: &types.TermsAggregation{
                    Field: "group.keyword",
                    Order: map[string]interface{}{
                        "_key": "desc",
                    },
                },
                Aggregations: map[string]types.Aggregations{
                    "note_count": types.Aggregations{
                        ValueCount: &types.ValueCountAggregation{
                            Field: "id",
                        },
                    },
                    "invested_sum": types.Aggregations{
                        Sum: &types.SumAggregation{
                            Field: "amount_participation",
                        },
                    },
                    "outstanding_principal_sum": types.Aggregations{
                        Sum: &types.SumAggregation{
                            Field: "principal_balance",
                        },
                    },
                    "principal_repaid_sum": types.Aggregations{
                        Sum: &types.SumAggregation{
                            Field: "principal_repaid",
                        },
                    },
                    "interest_paid_sum": types.Aggregations{
                        Sum: &types.SumAggregation{
                            Field: "interest_paid",
                        },
                    },
                },
            },
        },
    }).
    Do(context.Background())
`,
    );
  });

  it("converts cat health with boolean query param from behavior to go", async () => {
    expect(
      await convertRequests(
        `GET /_cat/health?v`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Cat.Health().
    V(true).
    Do(context.Background())
`,
    );
  });

  it("converts index doc with user_defined_value body to go", async () => {
    expect(
      await convertRequests(
        `PUT /my-index/_doc/1
{"title":"Hello World","tags":["intro","welcome"],"metadata":{"author":"test","version":2}}`,
        "go",
        {},
      ),
    ).toEqual(
      `res, err := es.Index("my-index").
    Id("1").
    Request(map[string]interface{}{
        "title": "Hello World",
        "tags": []interface{}{
            "intro",
            "welcome",
        },
        "metadata": map[string]interface{}{
            "author": "test",
            "version": 2,
        },
    }).
    Do(context.Background())
`,
    );
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

  it("converts to curl without URL", async () => {
    expect(await convertRequests(devConsoleScript, "curl", {})).toEqual(
      'curl -X GET -H "Authorization: ApiKey $ELASTIC_API_KEY" "$ELASTICSEARCH_URL/"\ncurl -X POST -H "Authorization: ApiKey $ELASTIC_API_KEY" -H "Content-Type: application/json" -d \'{"query":{"term":{"user.id":"kimchy\'"\'"\'s"}}}\' "$ELASTICSEARCH_URL/my-index/_search?from=40&size=20"\n',
    );
  });

  it("converts to curl on Windows", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
        windows: true,
      }),
    ).toEqual(
      'curl -X GET -H "Authorization: ApiKey $Env:ELASTIC_API_KEY" "http://localhost:9876/"\ncurl -X POST -H "Authorization: ApiKey $Env:ELASTIC_API_KEY" -H "Content-Type: application/json" -d \'{"query":{"term":{"user.id":"kimchy\'\'s"}}}\' "http://localhost:9876/my-index/_search?from=40&size=20"\n',
    );
  });

  it("converts to curl on Windows without URL", async () => {
    expect(
      await convertRequests(devConsoleScript, "curl", {
        windows: true,
      }),
    ).toEqual(
      'curl -X GET -H "Authorization: ApiKey $Env:ELASTIC_API_KEY" "$Env:ELASTICSEARCH_URL/"\ncurl -X POST -H "Authorization: ApiKey $Env:ELASTIC_API_KEY" -H "Content-Type: application/json" -d \'{"query":{"term":{"user.id":"kimchy\'\'s"}}}\' "$Env:ELASTICSEARCH_URL/my-index/_search?from=40&size=20"\n',
    );
  });

  it("converts a bulk request to curl", async () => {
    expect(
      await convertRequests(devConsoleBulkScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
      }),
    ).toEqual(
      `curl -X POST -H "Authorization: ApiKey $ELASTIC_API_KEY" -H "Content-Type: application/x-ndjson" -d $'{"index":{"_index":"test","_id":"1"}}\\n{"field1":"value1"}\\n{"delete":{"_index":"test","_id":"2"}}\\n{"create":{"_index":"test","_id":"3"}}\\n{"field1":"value3"}\\n{"update":{"_id":"1","_index":"test"}}\\n{"doc":{"field2":"value2"}}\\n' "http://localhost:9876/_bulk"\n`,
    );
  });

  it("converts a bulk request to curl on Windows", async () => {
    expect(
      await convertRequests(devConsoleBulkScript, "curl", {
        elasticsearchUrl: "http://localhost:9876",
        windows: true,
      }),
    ).toEqual(
      `curl -X POST -H "Authorization: ApiKey $Env:ELASTIC_API_KEY" -H "Content-Type: application/x-ndjson" -d "{""index"":{""_index"":""test"",""_id"":""1""}}\`n{""field1"":""value1""}\`n{""delete"":{""_index"":""test"",""_id"":""2""}}\`n{""create"":{""_index"":""test"",""_id"":""3""}}\`n{""field1"":""value3""}\`n{""update"":{""_id"":""1"",""_index"":""test""}}\`n{""doc"":{""field2"":""value2""}}\`n" "http://localhost:9876/_bulk"\n`,
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

  it("converts attribute with dashes or dots to python", async () => {
    expect(
      await convertRequests(
        `PUT /_security/settings {"security-profile": {}}
PUT /_watcher/settings {"index.auto_expand_replicas":"0-4"}`,
        "python",
        {},
      ),
    ).toEqual(
      `resp = client.security.update_settings(
    security_profile={},
)

resp1 = client.watcher.update_settings(
    index_auto_expand_replicas="0-4",
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

  it("converts to php", async () => {
    expect(await convertRequests(devConsoleScript, "php", {})).toEqual(
      `$resp = $client->info();

$resp1 = $client->search([
    "index" => "my-index",
    "from" => "40",
    "size" => "20",
    "body" => [
        "query" => [
            "term" => [
                "user.id" => "kimchy's",
            ],
        ],
    ],
]);

`,
    );
  });

  it("converts to php and prints the response", async () => {
    expect(
      await convertRequests(devConsoleScript, "php", {
        printResponse: true,
      }),
    ).toEqual(
      `$resp = $client->info();
echo $resp->asString();

$resp1 = $client->search([
    "index" => "my-index",
    "from" => "40",
    "size" => "20",
    "body" => [
        "query" => [
            "term" => [
                "user.id" => "kimchy's",
            ],
        ],
    ],
]);
echo $resp1->asString();

`,
    );
  });

  it("converts to a complete PHP script", async () => {
    expect(
      await convertRequests(devConsoleScript, "php", {
        complete: true,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `<?php

require(__DIR__ . "/vendor/autoload.php");

use Elastic\\Elasticsearch\\ClientBuilder;

$client = ClientBuilder::create()
    ->setHosts(["https://localhost:9999"])
    ->setApiKey(getenv("ELASTIC_API_KEY"))
    ->build();

$resp = $client->info();

$resp1 = $client->search([
    "index" => "my-index",
    "from" => "40",
    "size" => "20",
    "body" => [
        "query" => [
            "term" => [
                "user.id" => "kimchy's",
            ],
        ],
    ],
]);

`,
    );
  });

  it("converts a dollar-variable to php", async () => {
    expect(
      await convertRequests('POST /my-index/_doc\n{"key":"${value}"}', "php", {
        complete: false,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `$resp = $client->index([
    "index" => "my-index",
    "body" => [
        "key" => "\\\${value}",
    ],
]);

`,
    );
  });

  it("converts an unsupported API to php", async () => {
    expect(
      await convertRequests("GET /_internal/desired_balance", "php", {
        complete: false,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `$requestFactory = Psr17FactoryDiscovery::findRequestFactory();
$request = $requestFactory->createRequest(
    "GET",
    "/_internal/desired_balance",
);
$resp = $client->sendRequest($request);

`,
    );
  });

  it("errors when converting Kibana to php", async () => {
    expect(
      async () =>
        await convertRequests(kibanaScript, "php", {
          complete: false,
          elasticsearchUrl: "https://localhost:9999",
        }),
    ).rejects.toThrowError("Cannot perform conversion");
  });

  it("converts to ruby", async () => {
    expect(await convertRequests(devConsoleScript, "ruby", {})).toEqual(
      `response = client.info

response1 = client.search(
  index: "my-index",
  from: "40",
  size: "20",
  body: {
    "query": {
      "term": {
        "user.id": "kimchy's"
      }
    }
  }
)

`,
    );
  });

  it("converts to ruby and prints the response", async () => {
    expect(
      await convertRequests(devConsoleScript, "ruby", {
        printResponse: true,
      }),
    ).toEqual(
      `response = client.info
print(resp)

response1 = client.search(
  index: "my-index",
  from: "40",
  size: "20",
  body: {
    "query": {
      "term": {
        "user.id": "kimchy's"
      }
    }
  }
)
print(resp1)

`,
    );
  });

  it("converts to a complete ruby script", async () => {
    expect(
      await convertRequests(devConsoleScript, "ruby", {
        complete: true,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `require "elasticsearch"

client = Elasticsearch::Client.new(
  host: "https://localhost:9999",
  api_key: ENV["ELASTIC_API_KEY"]
)

response = client.info

response1 = client.search(
  index: "my-index",
  from: "40",
  size: "20",
  body: {
    "query": {
      "term": {
        "user.id": "kimchy's"
      }
    }
  }
)

`,
    );
  });

  it("converts an unsupported API to ruby", async () => {
    expect(
      await convertRequests("GET /_internal/desired_balance", "ruby", {
        complete: false,
        elasticsearchUrl: "https://localhost:9999",
      }),
    ).toEqual(
      `response = client.perform_request(
  "GET",
  "/_internal/desired_balance",
  {},
)

`,
    );
  });

  it("errors when converting Kibana to ruby", async () => {
    expect(
      async () =>
        await convertRequests(kibanaScript, "ruby", {
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
    expect(listFormats()).toContain("Python");
  });

  it("supports a simple external exporter", async () => {
    const externalExporter = new ExternalExporter({
      check: (json: string) => {
        const api: string = JSON.parse(json).requests[0].api;
        const ret = api.indexOf("search") >= 0;
        const error = api.indexOf("ml") >= 0 ? `unsupported:${api}` : null;
        return JSON.stringify({ return: ret, error });
      },
      convert: (json: string) => {
        const rets = JSON.parse(json).requests.map(
          (req: ParsedRequest) => req.api,
        );
        return JSON.stringify({ return: rets.join("\n") });
      },
    });

    expect(
      await convertRequests(
        "GET /my-index/_search\nGET /\n",
        externalExporter,
        { checkOnly: true },
      ),
    ).toBeTruthy();

    expect(
      await convertRequests("GET /_cat/indices", externalExporter, {
        checkOnly: true,
      }),
    ).toBeFalsy();

    expect(
      async () =>
        await convertRequests(
          "POST _ml/anomaly_detectors/it_ops_new_logs/model_snapshots/1491852978/_update",
          externalExporter,
          { checkOnly: true },
        ),
    ).rejects.toThrowError("unsupported:ml.update_model_snapshot");

    expect(
      await convertRequests(
        "GET /my-index/_search\nGET /\n",
        externalExporter,
        {},
      ),
    ).toEqual("search\ninfo");
  });

  it("supports a Rust/wasm external exporter", async () => {
    const wasmExporter = new ExternalExporter(wasmRust);

    expect(
      await convertRequests("GET /my-index/_search\nGET /\n", wasmExporter, {
        checkOnly: true,
      }),
    ).toBeTruthy();

    expect(
      await convertRequests("GET /my-index/_search\nGET /\n", wasmExporter, {}),
    ).toEqual("search,info");
  });

  it("supports a C#/wasm external exporter", async () => {
    const dotnetExporter = new SubprocessExporter(
      "node tests/wasm/wasm-dotnet/bin/Release/net9.0/browser-wasm/AppBundle/main.mjs",
    );

    expect(
      await convertRequests("GET /my-index/_search\nGET /\n", dotnetExporter, {
        checkOnly: true,
      }),
    ).toBeTruthy();

    expect(
      await convertRequests(
        "GET /my-index/_search\nGET /\n",
        dotnetExporter,
        {},
      ),
    ).toEqual("search,info");
  });

  describe("web external exporter tests", () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const baseUrl = "http://127.0.0.1:5000";
    const webExporter = new WebExporter(baseUrl);
    let proc: ChildProcess | null = null;

    beforeEach(async () => {
      proc = childProcess.spawn("python", [
        path.join(__dirname, "web/python-simple/web.py"),
      ]);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await sleep(1_000); // give the web app time to boot
        try {
          const response = await fetch(baseUrl);
          if (response.ok) {
            break; // web service is responsive
          }
        } catch (err) {
          // we need to wait some more
        }
      }
    }, 30_000); // use a longer timeout here, to give the web service time to start

    afterEach(async () => {
      if (proc) {
        proc.kill("SIGKILL");
        proc = null;
      }
    });

    it("supports a web external exporter", async () => {
      expect(
        await convertRequests("GET /my-index/_search\nGET /\n", webExporter, {
          checkOnly: true,
        }),
      ).toBeTruthy();

      expect(
        await convertRequests(
          "GET /my-index/_search\nGET /\n",
          webExporter,
          {},
        ),
      ).toEqual("search,info");
    });
  });
});
