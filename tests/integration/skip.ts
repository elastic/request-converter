type SkippedTest = {
  reason: string;
  formats?: string[];
};

const skip: Record<string, SkippedTest> = {
  "0b8fa90bc9aeeadb420ad785bd0b9953": {
    reason: "example references a non-existant `remote_indices` body attribute",
    formats: ["python", "javascript"],
  },
  b24a374c0ad264abbcacb5686f5ed61c: {
    reason: "example puts attributes in body, spec says they go in query",
    formats: ["python"],
  },
  "42ba7c1d13aee91fe6f0a8a42c30eb74": {
    reason: "example references a non-existent `lazy` query attribute",
    formats: ["python"],
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
    formats: ["python", "php"],
  },
  dd1a25d821d0c8deaeaa9c8083152a54: {
    reason: "example references non-existant `s` query attribute",
    formats: ["python", "php"],
  },
  c2c21e2824fbf6b7198ede30419da82b: {
    reason: "client does not implement this endpoint variant",
    formats: ["python", "javascript", "ruby"],
  },
  b94cee0f74f57742b3948f9b784dfdd4: {
    reason: "client does not implement this endpoint variant",
    formats: ["python", "javascript", "ruby"],
  },
  ad92a1a8bb1b0f26d1536fe8ba4ffd17: {
    reason: "example puts `id` path attribute in body",
    formats: ["python", "javascript"],
  },
  "29953082744b7a36e437b392a6391c81": {
    reason: "example puts `id` path attribute in body",
    formats: ["python", "javascript"],
  },
  "3182f26c61fbe5cf89400804533d5ed2": {
    reason: "example puts `id` path attribute in body",
    formats: ["python", "javascript"],
  },
  "48d9697a14dfe131325521f48a7adc84": {
    reason: "example puts `id` path attribute in body",
    formats: ["python", "javascript"],
  },
  "3e6db3d80439c2c176dbd1bb1296b6cf": {
    reason: "example puts `id` path attribute in body",
    formats: ["python", "javascript"],
  },
  e39d51202913bf6d861e9e721570cdb8: {
    reason: "example has bad request syntax",
  },
  c06b96352e15f0161705fee0b5925776: {
    reason: "example has bad request syntax",
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
  "50096ee0ca53fe8a88450ebb2a50f285": {
    reason: "example references a non-existant `delimiter` query attribute",
    formats: ["python", "php"],
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
    formats: ["python"],
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
    formats: ["python"],
  },
  "2afd49985950cbcccf727fa858d00067": {
    reason: "invalid `query` attribute in body",
    formats: ["python"],
  },
  "734e2b1d1ca84a305240a449738f0eba": {
    reason: "client does not implement this endpoint variant",
    formats: ["python", "javascript", "php", "ruby"],
  },
  fe806011466e7cdc1590da186297edb6: {
    reason: "url cannot be parsed",
  },
  a34d70d7022eb4ba48909d440c80390f: {
    reason: "url cannot be parsed",
  },
  e0bbfb368eae307e9508ab8d6e9cf23c: {
    reason: "client does not implement this endpoint variant",
    formats: ["python", "javascript", "php", "ruby"],
  },
  ef9c29759459904fef162acd223462c4: {
    reason: "client does not implement this endpoint variant",
    formats: ["python", "javascript", "php", "ruby"],
  },
  f160561efab38e40c2feebf5a2542ab5: {
    reason: "client does not implement this endpoint variant",
    formats: ["python", "javascript", "php", "ruby"],
  },
  "0470d7101637568b9d3d1239f06325a7": {
    reason: "example uses invalid URL",
    formats: ["python", "javascript", "ruby"],
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
    formats: ["python"],
  },
  "88cecae3f0363fc186d955dd8616b5d4": {
    reason: "example uses undefined `keep_alive` attribute",
    formats: ["python", "php"],
  },
  "6539a04aac4d43e6ce4a769fe8cdf2d8": {
    reason: "example uses unknown URL",
  },
  af91019991bee136df5460e2fd4ac72a: {
    reason: "example uses unknown `lazy` query attribute",
    formats: ["python"],
  },
  "0a46cc8fe93e372909660a63dc52ae3b": {
    reason: "invalid request syntax",
  },
  b1ee1b0b5f7af596e5f81743cfd3755f: {
    reason: "invalid request syntax",
  },
  "83b94f9e7b3a9abca8e165ea56927714": {
    reason: "invalid request syntax",
  },
  "7c8f207e43115ea8f20d2298be5aaebc": {
    reason: "example uses unknown URL",
    formats: ["python", "javascript"],
  },
  "5bbccf103107e505c17ae59863753efd": {
    reason: "example uses GET request with body",
    formats: ["python", "javascript"],
  },
  "2d633b7f346b828d01f923ce9dbf6ad5": {
    reason: "invalid request syntax",
  },
  "61a528b86d38c2f17a172326edf6b53b": {
    reason: "example uses unknown URL",
  },
  "340b027449ca37d2e778e747974af9ff": {
    reason: "example uses unknown URL",
    formats: ["javascript"],
  },
  f20692e35a61b98746e926549030702b: {
    reason: "example uses unknown URL",
    formats: ["javascript"],
  },
  "0ab002c6618af75e1041a23c692327ad": {
    reason: "example uses unknown URL",
  },
  "841d8b766902c8e3ae85c228a31383ac": {
    reason: "example uses unknown `format` attribute",
    formats: ["python", "php"],
  },
  "3ed79871d956bfb2d6d2721d7272520c": {
    reason: "client does not implement this endpoint variant",
    formats: ["python", "javascript", "php", "ruby"],
  },
  "3c4d7ef8422d2db423a8f23effcddaa1[3]": {
    reason: "example uses unknown URL",
  },
  "9b68748c061b768c0153c1f2508ce207": {
    reason: "example uses bad format for comments",
  },
  a3464bd6f0a61623562162859566b078: {
    reason: "example uses bad format for comments",
  },
  "902cfd5aeec2f65b3adf55f5e38b21f0": {
    reason: "example uses bad format for comments",
  },
  f749efe8f11ebd43ef83db91922c736e: {
    reason: "example uses bad format for comments",
  },
  c79b284fa7a5d7421c6daae62bc697f9: {
    reason: "example uses bad format for comments",
  },
  "691fe20d467324ed43a36fd15852c492": {
    reason: "example uses bad format for comments",
  },
  "8d6631b622f9bfb8fa70154f6fb8b153": {
    reason: "example uses bad format for comments",
  },
  "0a3003fa5af850e415634b50b1029859": {
    reason: "example uses bad format for comments",
  },
  "083e514297c09e91211f0d168aef1b0b": {
    reason: "example uses bad format for comments",
  },
  b22559a7c319f90bc63a41cac1c39b4c: {
    reason: "test passes boolean field as string",
    formats: ["python"],
  },
  cfad3631be0634ee49c424f9ccec62d9: {
    reason: "test passes boolean field as string",
    formats: ["python"],
  },
  "20e3b181114e00c943a27a9bbcf85f15": {
    reason: "test passes date epoch number as string",
    formats: ["javascript"],
  },
  "405db6f3a01eceacfaa8b0ed3e4b3ac2": {
    reason: "test passes date epoch number as string",
    formats: ["javascript"],
  },
  e48e7da65c2b32d724fd7e3bfa175c6f: {
    reason: "test passes date epoch number as string",
    formats: ["javascript"],
  },
  c873f9cd093e26515148f052e28c7805: {
    reason: "test passes date epoch number as string",
    formats: ["javascript"],
  },
  f96d4614f2fc294339fef325b794355f: {
    reason: "test passes date epoch number as string",
    formats: ["javascript"],
  },
  "7ebfb30b3ece855c1b783d9210939469": {
    reason: "test passes date epoch number as string",
    formats: ["javascript"],
  },
  "1147a02afa087278e51fa365fb9e06b7": {
    reason: "test passes size number as string",
    formats: ["javascript"],
  },
  "8a617dbfe5887f8ecc8815de132b6eb0": {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  "47e6dfb5b09d954c9c0c33fda2b6c66d": {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  "111c31db1fd29baeaa9964eafaea6789": {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  "7b3f255d28ce5b46d111402b96b41351": {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  "53e4ac5a4009fd21024f4b31e54aa83f": {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  b2b26f8568c5dba7649e79f09b859272: {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  "9d5855075e7008270459cc88c189043d": {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  "0b47b0bef81b9b5eecfb3775695bd6ad": {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  bf1de9fa1b825fa875d27fa08821a6d1: {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  f187ac2dc35425cb0ef48f328cc7e435: {
    reason:
      "test uses username in path, but client sends it in the body as well, which is valid",
    formats: ["javascript"],
  },
  "31bc93e429ad0de11dd2dd231e8f2c5e": {
    reason: "endpoint does not exist in schema",
  },
  "3f1fe5f5f99b98d0891f38003e10b636": {
    reason: "test uses `wait_for_completion_timeout` nonexistant argument",
    formats: ["python"],
  },
  "2a1eece9a59ac1773edcf0a932c26de0": {
    reason: "test uses `token` nonexistant argument",
    formats: ["python"],
  },
  "4b91ad7c9b44e07db4a4e81390f19ad3": {
    reason: "test uses `stream_inference` which Python does not implement",
    formats: ["python", "php", "ruby"],
  },
  "120fcf9f55128d6a81d5e87a9c235bbd": {
    reason: "test uses `stream_inference` which Python does not implement",
    formats: ["python", "php", "ruby"],
  },
  "82bb6c61dab959f4446dc5ecab7ecbdf": {
    reason: "test uses `stream_inference` which Python does not implement",
    formats: ["python", "php", "ruby"],
  },
  "45954b8aaedfed57012be8b6538b0a24": {
    reason: "test uses `stream_inference` which Python does not implement",
    formats: ["python", "php", "ruby"],
  },
  "114d470e752efa9672ca68d7290fada8": {
    reason: "the client does not implement this endpoint variant",
    formats: ["ruby"],
  },
  f5140f08f56c64b5789357539f8b9ba8: {
    reason: "the client does not implement this endpoint variant",
    formats: ["ruby"],
  },
  "66915e95b723ee2f6e5164a94b8f98c1": {
    reason: "the client does not implement this endpoint variant",
    formats: ["python", "ruby"],
  },
  e095fc96504efecc588f97673912e3d3: {
    reason: "the client sends path parameter in the body",
    formats: ["javascript"],
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
