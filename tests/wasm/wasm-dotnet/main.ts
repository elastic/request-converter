import { dotnet } from './_framework/dotnet';

const wasm: Record<string, any> = {
  init: async () => {
    // Get exported methods from the .NET assembly
    const { getAssemblyExports, getConfig } = await dotnet
        .withDiagnosticTracing(false)
        .create();

    const config = getConfig();
    if (config && config.mainAssemblyName) {
      const _exports = await getAssemblyExports(config.mainAssemblyName);

      // declare the two request converter entry points
      wasm.check =_exports.RequestConverter.Check;
      wasm.convert = _exports.RequestConverter.Convert;
    }
  },

  // these will be defined once init() runs
  check: undefined,
  convert: undefined,
};

export default wasm;
