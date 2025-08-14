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
  ClusterPutComponentTemplateRequestExample1: {
    reason: "example passes invalid `settings` field in the body",
    formats: ["python"],
  },
  ClusterPutComponentTemplateRequestExample2: {
    reason: "example passes invalid `settings` field in the body",
    formats: ["python"],
  },
  IndicesCreateFromExample1: {
    reason: "example does not send a required body",
    formats: ["python", "ruby"],
  },
  IndicesDeleteAliasExample1: {
    reason: "client uses a different URL alternative",
    formats: ["ruby"],
  },
  IndicesPutDataStreamSettingsRequestExample1: {
    reason: "client does not have this endpoint yet",
    formats: ["php"],
  },
  indicesPutTemplateRequestExample1: {
    reason: "example passes invalid `properties` field in the body",
    formats: ["python"],
  },
  InferencePutExample1: {
    reason: "badly formatted body",
  },
  ReloadSearchAnalyzersRequestExample1: {
    reason: "example passes a body but this endpoint does not define one",
    formats: ["python", "javascript", "php", "ruby"],
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
