import process from 'process';
import { dotnet } from './_framework/dotnet.js';

const init = async () => {
  // Get exported methods from the .NET assembly
  const { getAssemblyExports, getConfig } = await dotnet
      .withDiagnosticTracing(false)
      .create();

  const config = getConfig();
  if (config && config.mainAssemblyName) {
    const _exports = await getAssemblyExports(config.mainAssemblyName);

    // declare the two request converter entry points
    return {
      check: _exports.RequestConverter.Check,
      convert: _exports.RequestConverter.Convert,
    }
  }
};

const f = await init();
console.log(f[process.argv.slice(-2)[0]](process.argv.slice(-1)[0]));
process.exit(0);
