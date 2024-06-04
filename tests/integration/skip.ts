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
  c9c21191ae15a49955bffde0ac749a49: {
    reason: "example has bad request syntax",
  },
  ba70b92f745a1765f1eb62e3457a86c3: {
    reason: "example has bad request syntax",
  },
  dcdfec72b5666c316abf88432d52f687: {
    reason: "example uses undefined method for endpoint",
  },
  "150505202c0eb46ed7d4a51844438b8a": {
    reason: "example uses undefined method for endpoint",
  },
  d8c10fbaa808899f10ce83891437121f: {
    reason: "example uses undefined method for endpoint",
  },
  "6ce8334def48552ba7d44025580d9105": {
    reason: "url cannot be parsed",
  },
  "2a5f7e7d6b92c66e52616845146d2820": {
    reason: "example puts `id` path attribute in body",
  },
  "9b09ad677a0f4331830bed254a8388d1": {
    reason: "example uses undefined method for endpoint",
  },
  ae0d20c2ebb59278e08a26c9634d90c9: {
    reason: "url cannot be parsed",
  },
  e85e3ab802fc9b40798fb0f546a7d05a: {
    reason: "invalid request syntax",
  },
  a71154ea11a5214f409ecfd118e9b5e3: {
    reason: "invalid `query` attribute in body",
  },
  e3019fd5f23458ae49ad9854c97d321c: {
    reason: "example uses undefined `oidc_prepare_authentication` attribute",
  },
  "9c01db07c9ac395b6370e3b33965c21f": {
    reason: "example uses undefined `oidc_authentication` attribute",
  },
  "2a1eece9a59ac1773edcf0a932c26de0": {
    reason: "example uses undefined `oidc_logout` attribute",
  },
  "734e2b1d1ca84a305240a449738f0eba": {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  fe806011466e7cdc1590da186297edb6: {
    reason: "url cannot be parsed",
  },
  a34d70d7022eb4ba48909d440c80390f: {
    reason: "url cannot be parsed",
  },
  "9afa0844883b7471883aa378a8dd10b4": {
    reason: "TODO",
  },
  e0bbfb368eae307e9508ab8d6e9cf23c: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  "3c4d7ef8422d2db423a8f23effcddaa1": {
    reason: "TODO",
  },
  e35abc9403e4aef7d538ab29ccc363b3: {
    reason: "example uses private /_internal endpoint",
  },
  ef9c29759459904fef162acd223462c4: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  f160561efab38e40c2feebf5a2542ab5: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  "166bcfc6d5d39defec7ad6aa44d0914b": {
    reason: "example uses undefined `nodes` query attribute",
  },
  "0470d7101637568b9d3d1239f06325a7": {
    reason: "example uses private /_internal endpoint",
  },
  "10796a4efa3c2a5e9e50b6bdeb08bbb9": {
    reason: "example uses private /_internal endpoint",
  },
  dfcdcd3ea6753dcc391a4a52cf640527: {
    reason: "example uses private /_internal endpoint",
  },
  cf8ca470156698dbf47fdc822d0a714f: {
    reason: "example uses private /_internal endpoint",
  },
  ddf375e4b6175d830fa4097ea0b41536: {
    reason: "example uses private /_internal endpoint",
  },
  "97a3216af3d4b4d805d467d9c715cb3e": {
    reason: "example uses private /_internal endpoint",
  },
  b3756e700d0f6c7e8919003bdf26bc8f: {
    reason: "example uses private /_internal endpoint",
  },
  ba10b644a4e9a2e7d78744ca607355d0: {
    reason: "example uses undefined `data_stream_name` attribute",
  },
  "1b3762712c14a19e8c2956b4f530d327": {
    reason: "example uses undefined `settings` attribute",
  },
  "365256ebdfa47b449780771d9beba8d9": {
    reason: "example uses undefined method for endpoint",
  },
  cb0f3eea39612a694d47a57aee93956f: {
    reason: "example uses unknown URL",
  },
  e9ae959608d128202921b174f4faa7a8: {
    reason: "invalid request syntax",
  },
  "7c862a20772467e0f5beebbd1b80c4cb": {
    reason: "invalid request syntax",
  },
  "16985e5b17d2da0955a14fbe02e8dfca": {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  aeaa97939a05f5b2f3f2c43b771f35e3: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  a1d0603b24a5b048f0959975d8057534: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  b37919cc438b47477343833b4e522408: {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
  f0c3235d8fce641d6ff8ce90ab7b7b8b: {
    reason: "example uses undefined `parameters` attribute",
  },
  "88cecae3f0363fc186d955dd8616b5d4": {
    reason: "example uses undefined `keep_alive` attribute",
  },
  "405511f7c1f12cc0a227b4563fe7b2e2": {
    reason: "example uses unknown URL",
  },
  "6539a04aac4d43e6ce4a769fe8cdf2d8": {
    reason: "example uses unknown URL",
  },
  "8bf1e7a6d529547906ba8b1d6501fa0c": {
    reason: "example uses undefined method for endpoint",
  },
  "90083d93e46fad2524755b8d4d1306fc": {
    reason: "example uses undefined method for endpoint",
  },
  "615dc36f0978c676624fb7d1144b4899": {
    reason: "example uses unknown URL",
  },
  "af91019991bee136df5460e2fd4ac72a": {
    reason: "example uses unknown `lazy` query attribute",
  },
  "0a46cc8fe93e372909660a63dc52ae3b": {
    reason: "invalid request syntax",
  },
  "b1ee1b0b5f7af596e5f81743cfd3755f": {
    reason: "invalid request syntax",
  },
  "83b94f9e7b3a9abca8e165ea56927714": {
    reason: "invalid request syntax",
  },
  "7c8f207e43115ea8f20d2298be5aaebc": {
    reason: "example uses unknown URL",
  },
  "19c00c6b29bc7dbc5e92b3668da2da93": {
    reason: "example uses unknown URL",
  },
  "bcdfaa4487747249699a86a0dcd22f5e": {
    reason: "example uses unknown URL",
  },
  "5bbccf103107e505c17ae59863753efd": {
    reason: "example uses GET request with body",
  },
  "2d633b7f346b828d01f923ce9dbf6ad5": {
    reason: "invalid request syntax",
  },
  "3fdc1269aaedea61248e39c70997fed8": {
    reason: "client does not implement `sub_searches` body attribute",
    formats: ["python"],
  },
  "0dfde6a9d953822fd4b3aa0121ddd8fb": {
    reason: "example uses undefined `render_query` attribute.",
  },
  "4b113c7f475cfe484a150ddbb8e6c5c7": {
    reason: "example references a non-existant `remote_indices` body attribute",
  },
  "174b93c323aa8e9cc8ee2a3df5736810": {
    reason: "example uses unknown URL",
  },
  "61a528b86d38c2f17a172326edf6b53b": {
    reason: "example uses unknown URL",
  },
  "dd71b0c9f9197684ff29c61062c55660": {
    reason: "example uses unknown URL",
  },
  "b22559a7c319f90bc63a41cac1c39b4c": {
    reason: "example passes boolean as string",
  },
  "cfad3631be0634ee49c424f9ccec62d9": {
    reason: "example passes boolean as string",
  },
  "57dc15e5ad663c342fd5c1d86fcd1b29": {
    reason: "example uses undefined `oidc_prepare_authentication` attribute",
  },
  "d35c8cf7a98b3f112e1de8797ec6689d": {
    reason: "example uses undefined `oidc_prepare_authentication` attribute",
  },
  "88a283dfccc481f1afba79d9b3c61f51": {
    reason: "example uses unknown URL",
  },
  "340b027449ca37d2e778e747974af9ff": {
    reason: "example uses unknown URL",
  },
  "f20692e35a61b98746e926549030702b": {
    reason: "example uses unknown URL",
  },
  "80dd7f5882c59b9c1c90e8351937441f": {
    reason: "example uses unknown `bulk_update_api_keys` attribute",
  },
  "c580990a70028bb49cca8a6bde86bbf6": {
    reason: "example uses unknown `bulk_update_api_keys` attribute",
  },
  "6f3b723bf6179b96c3413597ed7f49e1": {
    reason: "example uses unknown `bulk_update_api_keys` attribute",
  },
  "0ab002c6618af75e1041a23c692327ad": {
    reason: "example uses unknown URL",
  },
  "841d8b766902c8e3ae85c228a31383ac": {
    reason: "example uses unknown `format` attribute",
  },
  "3ed79871d956bfb2d6d2721d7272520c": {
    reason: "client does not implement this endpoint variant",
    formats: ["python"],
  },
};
