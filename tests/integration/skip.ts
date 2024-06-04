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
  e39d51202913bf6d861e9e721570cdb8: {
    reason: "example has bad request syntax",
  },
  c06b96352e15f0161705fee0b5925776: {
    reason: "example has bad request syntax",
  },
  a78e06cdbcae75962db627f5015ed2f6: {
    reason: "client does not implement `sub_searches` body attribute",
    formats: ["python"],
  },
  "5203560189ccab7122c03500147701ef": {
    reason: "example has bad request syntax",
  },
  a84ffbaa4ffa68b22f6fe42d3b4f8dd5: {
    reason: "example has bad request syntax",
  },
  ba59a3b9a0a2694704b2bf9c6ad4a8cf: {
    reason: "example has bad request syntax",
  },
  "1ceaa211756e2db3d48c6bc4b1a861b0": {
    reason: "example has bad request syntax",
  },
  "3f1fe5f5f99b98d0891f38003e10b636": {
    reason: "endpoint URL is not in the spec",
  },
  "2afdf0d83724953aa2875b5fb37d60cc": {
    reason: "endpoint URL is not in the spec",
  },
  "67b71a95b6fe6c83faae51ea038a1bf1": {
    reason: "endpoint URL is not in the spec",
  },
  "50096ee0ca53fe8a88450ebb2a50f285": {
    reason: "example references a non-existant `delimiter` query attribute",
  },
  "32b8a5152b47930f2e16c40c8615c7bb": {
    reason: "example has bad request syntax",
  },
  "6b6fd0a5942dfb9762ad2790cf421a80": {
    reason: "example has bad request syntax",
  },
  "16634cfa7916cf4e8048a1d70e6240f2": {
    reason: "example has bad request syntax",
  },
  "c9c21191ae15a49955bffde0ac749a49": {
    reason: "example has bad request syntax",
  },
  "ba70b92f745a1765f1eb62e3457a86c3": {
    reason: "example has bad request syntax",
  },
  
};
