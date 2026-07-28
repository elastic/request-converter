// Minimal stand-in for @elastic/request-converter-dotnet: echoes the options
// it received so tests can assert the exporter's defaults and overrides.
export async function boot() {
  return {
    check(input) {
      const { requests } = JSON.parse(input);
      return JSON.stringify({ return: requests.every((r) => Boolean(r.api)) });
    },
    convert(input) {
      const { options, requests } = JSON.parse(input);
      return JSON.stringify({
        return: `// apis: ${requests
          .map((r) => r.api)
          .join(",")}\n// options: ${JSON.stringify(options)}`,
      });
    },
  };
}
