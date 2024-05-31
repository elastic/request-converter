type SkippedTest = {
  reason: string;
  formats?: string[];
};

export const skip: Record<string, SkippedTest> = {
  fd7eeadab6251d9113c4380a7fbe2572: {
    reason: "example references a non-existant `remote_indices` body attribute",
  },
  d69bd36335774c8ae1286cee21310241: {
    reason: "example references a non-existant `remote_indices` body attribute",
  },
  b24a374c0ad264abbcacb5686f5ed61c: {
    reason: "example puts attributes in body, spec says they go in query",
    formats: ["python"],
  },
  "42ba7c1d13aee91fe6f0a8a42c30eb74": {
    reason: "example references a non-existent `lazy` query attribute",
  },
  "96ea0e80323d6d2d99964625c004a44d": {
    reason: "example references a non-existant `enabled` body attribute",
  },
  d0c03847106d23ad632ceb624d647c37: {
    reason: "example has invalid body",
  },
  "16a9ebe102b53495de9d2231f5ae7158": {
    reason: "example has invalid body",
  },
  "48b21c5aaf16b87f1a9b1a18a5d27cbd": {
    reason: "example has invalid body",
  },
  a0bcad37014cb534a720722c3cb3fefd: {
    reason: "example has invalid body",
  },
  ed12eeadb4e530b53c4975dadaa06054: {
    reason:
      "example references non-existant `ecs_compatibility` query attribute",
  },
  dd1a25d821d0c8deaeaa9c8083152a54: {
    reason: "example references non-existant `s` query attribute",
  },
  c2c21e2824fbf6b7198ede30419da82b: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  b94cee0f74f57742b3948f9b784dfdd4: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  ad92a1a8bb1b0f26d1536fe8ba4ffd17: {
    reason: "example puts `id` path attribute in body",
  },
  "29953082744b7a36e437b392a6391c81": {
    reason: "example puts `id` path attribute in body",
  },
  "3182f26c61fbe5cf89400804533d5ed2": {
    reason: "example puts `id` path attribute in body",
  },
  "48d9697a14dfe131325521f48a7adc84": {
    reason: "example puts `id` path attribute in body",
  },
  "3e6db3d80439c2c176dbd1bb1296b6cf": {
    reason: "example puts `id` path attribute in body",
  },
  "73e75aa4bd24754909e48ee62c2702dc": {
    reason: "client does not implement `sub_searches` body attribute",
    formats: ["python"],
  },
  "39ce44333d28ed2b833722d3e3cb06f3": {
    reason:
      "example references a non-existant `include_named_queries_score` query attribute",
  },
};
