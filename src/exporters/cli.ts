import { ConvertOptions, FormatExporter } from "../convert";
import { ParsedRequest } from "../parse";

const PACKAGE = "@elastic/request-converter-cli";

type ConvertFn = (request: ParsedRequest) => string;

type DynamicImport = (specifier: string) => Promise<{ convert?: ConvertFn }>;

let dynamicImport: DynamicImport | undefined;

// This package compiles to CommonJS, where tsc downlevels `import()` to
// `require()`, which cannot load the ES module. The indirection keeps a
// true dynamic import.
function getDynamicImport(): DynamicImport {
  dynamicImport ??= new Function(
    "specifier",
    "return import(specifier)",
  ) as DynamicImport;
  return dynamicImport;
}

/** Prints an `elastic` command for an Elasticsearch request. */
export class CliExporter implements FormatExporter {
  private convertFn?: Promise<ConvertFn>;

  constructor(private readonly specifier = PACKAGE) {}

  async check(requests: ParsedRequest[]): Promise<boolean> {
    return requests.every((request) => request.service === "es");
  }

  async convert(
    requests: ParsedRequest[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: ConvertOptions,
  ): Promise<string> {
    if (!(await this.check(requests))) {
      throw new Error("Cannot perform conversion");
    }
    const convert = await this.load();
    return requests.map((request) => convert(request)).join("\n");
  }

  private load(): Promise<ConvertFn> {
    this.convertFn ??= this.loadConvert();
    return this.convertFn;
  }

  private async loadConvert(): Promise<ConvertFn> {
    let module: { convert?: ConvertFn };
    try {
      module = await getDynamicImport()(this.specifier);
    } catch (error) {
      throw new Error(
        `The CLI exporter requires ${PACKAGE} ` +
          `(npm install ${PACKAGE}): ${(error as Error).message}`,
      );
    }
    if (typeof module.convert !== "function") {
      throw new Error(`${this.specifier} does not export convert().`);
    }
    return module.convert;
  }
}
