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
  indicesPutAliasRequestExample1: {
    reason: "client uses a different URL alternative",
    formats: ["ruby", "go"],
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
  PostChatCompletionRequestExample4: {
    reason: "client does not have this endpoint yet",
    formats: ["python"],
  },
  PostChatCompletionRequestExample5: {
    reason: "client does not have this endpoint yet",
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
  MlGetModelSnapshotsExample1: {
    reason: "client converts string to a number",
    formats: ["javascript"],
  },
  MlGetOverallBucketsExample1: {
    reason: "client converts string to a number",
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
  SnapshotRestoreRequestExample2: {
    reason: "example passes invalid `indices` field in the body",
    formats: ["python"],
  },
  IndicesDeleteSampleConfigurationRequest1: {
    reason: "removed endpoint",
    formats: ["ruby", "go"],
  },
  IndicesGetAllSampleConfigurationRequest1: {
    reason: "removed endpoint",
    formats: ["ruby", "javascript", "go"],
  },
  GetRandomSampleRequest1: {
    reason: "removed endpoint",
    formats: ["ruby", "javascript", "go"],
  },
  IndicesGetSampleConfigurationRequest1: {
    reason: "removed endpoint",
    formats: ["ruby", "javascript", "go"],
  },
  GetRandomSampleStatsRequest1: {
    reason: "removed endpoint",
    formats: ["ruby", "javascript", "go"],
  },
  IndicesPutSampleConfigurationRequest1: {
    reason: "removed endpoint",
    formats: ["ruby", "javascript"],
  },
  AsyncSearchGetRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  AsyncSearchSubmitRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  ClearScrollRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ClusterPutComponentTemplateRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  CountRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  DeleteByQueryRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  DeleteByQueryRequestExample3: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  EnrichPutPolicyExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  IndicesPutIndexTemplateRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  IndicesPutIndexTemplateRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MlEvaluateDataFrameRequestExample4: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MlExplainDataFrameAnalyticsRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MlPostCalendarEventsExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MlPreviewDataFrameAnalyticsExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MlUpdateDatafeedExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MlUpdateJobExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MsearchRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  MultiGetRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  MultiSearchTemplateRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  PreviewTransformRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  PutTransformRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  PutTransformRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  QueryApiKeysRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  QueryApiKeysRequestExample3: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  ReindexRequestExample10: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample12: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample13: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample3: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample4: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample5: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample6: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample7: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  ReindexRequestExample9: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  RollupSearchRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  SearchApplicationsSearchRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  SearchMvtRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SearchRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  SearchRequestExample2: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  SearchRequestExample3: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  SearchTemplateRequestExample1: {
    reason: "typed client adds typed_keys parameter",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample3: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample4: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample5: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample6: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample7: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample8: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityPutRoleMappingRequestExample9: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SecurityQueryUserRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SnapshotCreateRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SnapshotRestoreRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  SynonymsPutRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  TextEmbeddingRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  UpdateByQueryRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  UpdateByQueryRequestExample3: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  UpdateTransformRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesAnalyzeRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesAnalyzeRequestExample3: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesAnalyzeRequestExample4: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesAnalyzeRequestExample5: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesAnalyzeRequestExample6: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesAnalyzeRequestExample7: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesCreateRequestExample1: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesCreateRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesCreateRequestExample3: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  indicesPutTemplateRequestExample2: {
    reason:
      "typed client canonicalizes request body (query shorthand, string/array coercion)",
    formats: ["go"],
  },
  CancelReindexRequestExample1: {
    reason: "PHP does not currently include reindex endpoints",
    formats: ["php"],
  },
  CancelReindexRequestExample2: {
    reason: "PHP does not currently include reindex endpoints",
    formats: ["php"],
  },
  GetReindexRequestExample1: {
    reason: "PHP does not currently include reindex endpoints",
    formats: ["php"],
  },
  GetReindexRequestExample2: {
    reason: "PHP does not currently include reindex endpoints",
    formats: ["php"],
  },
  ListReindexRequestExample1: {
    reason: "PHP does not currently include reindex endpoints",
    formats: ["php"],
  },
  ListReindexRequestExample2: {
    reason: "PHP does not currently include reindex endpoints",
    formats: ["php"],
  },
  MlGetInfluencersExample1: {
    reason: "example includes quotes in query argument",
    formats: ["curl"],
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
