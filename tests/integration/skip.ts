type SkippedTest = {
  reason: string;
  formats?: string[];
};

const skip: Record<string, SkippedTest> = {
  MultiTermVectorsRequestExample2: {
    reason: "client sends query properties in the body",
    formats: ["python", "javascript"],
  },
  RenderSearchTemplateRequestExample1: {
    reason: "client uses a different URL alternative",
    formats: ["python", "javascript"],
  },
  CatFielddataRequestExample1: {
    reason: "client uses a different URL alternative",
    formats: ["python", "javascript", "php", "ruby"],
  },
  ClusterPutComponentTemplateRequestExample2: {
    reason: "example passes invalid `settings` field in the body",
    formats: ["python"],
  },
  indicesPutAliasRequestExample1: {
    reason: "client uses a different URL alternative",
    formats: ["ruby"],
  },
  indicesPutAliasRequestExample2: {
    reason: "client uses a different URL alternative",
    formats: ["ruby"],
  },
  indicesPutAliasRequestExample3: {
    reason: "client uses a different URL alternative",
    formats: ["ruby", "javascript"],
  },
  IndicesDeleteAliasExample1: {
    reason: "client uses a different URL alternative",
    formats: ["ruby"],
  },
  PostChatCompletionRequestExample1: {
    reason: "client does not have this endpoint yet",
    formats: ["python"],
  },
  PostChatCompletionRequestExample2: {
    reason: "client does not have this endpoint yet",
    formats: ["python"],
  },
  PostChatCompletionRequestExample3: {
    reason: "client does not have this endpoint yet",
    formats: ["python"],
  },
  RerankRequestExample2: {
    reason: "example passes invalid `return_documents` field in the body",
    formats: ["python"],
  },
  RerankRequestExample3: {
    reason: "example passes invalid `return_documents` field in the body",
    formats: ["python"],
  },
  StreamInferenceRequestExample1: {
    reason: "client does not implement streaming endpoints",
    formats: ["python"],
  },
  MlGetBucketsExample1: {
    reason: "client converts string to a number",
    formats: ["javascript"],
  },
  MlGetInfluencersExample1: {
    reason: "client passes query properties in the body",
    formats: ["python", "javascript"],
  },
  MlGetModelSnapshotsExample1: {
    reason: "client converts string to a number",
    formats: ["javascript"],
  },
  MlGetOverallBucketsExample1: {
    reason: "client converts string to a number",
    formats: ["javascript"],
  },
  MlPutJobRequestExample1: {
    reason: "client passes job id both in the URL and the body",
    formats: ["javascript"],
  },
  MlGetRecordsExample1: {
    reason: "client converts string to a number",
    formats: ["javascript"],
  },
  SamlServiceProviderMetadataRequestExample1: {
    reason: "client implements this endpoints as PUT, but example uses POST",
    formats: ["php", "ruby"],
  },
  SecurityInvalidateApiKeyRequestExample5: {
    reason: "example passes boolean in string format",
    formats: ["python"],
  },
  SecurityPutUserRequestExample1: {
    reason: "client passes user id both in the URL and the body",
    formats: ["javascript"],
  },
  SnapshotRestoreRequestExample2: {
    reason: "example passes invalid `indices` field in the body",
    formats: ["python"],
  },
  SynonymsPutRequestExample1: {
    reason: "example does not pass required `synonyms_set` field in the body",
    formats: ["python", "php", "ruby"],
  },

  // the following examples trigger known bugs in the Java request converter or
  // the Elasticsearch specification, so for now they are skipped
  PutScriptRequestExample1: {
    reason: "spec bug",
    formats: ["java"],
  },
  indicesPutSettingsRequestExample2: {
    reason: "spec bug",
    formats: ["java"],
  },
  IndicesPutDataLifecycleRequestExample2: {
    reason: "spec bug",
    formats: ["java"],
  },
  IndicesCreateFromExample1: {
    reason: "java client bug",
    formats: ["java"],
  },
  indicesSimulateIndexTemplateRequestExample1: {
    reason: "java client bug",
    formats: ["java"],
  },

  // the following examples are not currently supported by the Java request converter
  // so they are skipped
  BulkRequestExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  BulkRequestExample2: {
    reason: "unsupported",
    formats: ["java"],
  },
  BulkRequestExample3: {
    reason: "unsupported",
    formats: ["java"],
  },
  BulkRequestExample4: {
    reason: "unsupported",
    formats: ["java"],
  },
  MultiGetRequestExample2: {
    reason: "unsupported",
    formats: ["java"],
  },
  MsearchRequestExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  MultiSearchTemplateRequestExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  ConnectorUpdateLastSyncRequestExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  AsyncQueryRequestExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  EsqlAsyncQueryDeleteExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  EsqlAsyncQueryGetExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  EsqlAsyncQueryStopExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
  FindStructureRequestExample1: {
    reason: "unsupported",
    formats: ["java"],
  },
};

export function shouldBeSkipped(
  digest: string,
  format: string,
): string | false {
  const s = skip[digest] ?? skip[digest.split("[", 1)[0]];
  if (s && (s.formats ?? [format]).includes(format)) {
    return s.reason;
  }
  return false;
}
