import { existsSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import {
  ConvertOptions,
  ExternalExporter,
  ExternalFormatExporter,
  FormatExporter,
} from "../convert";
import { ParsedRequest } from "../parse";

const BUNDLE_PACKAGE = "@elastic/request-converter-dotnet";

type DynamicImport = (
  specifier: string,
) => Promise<{ boot?: () => Promise<ExternalFormatExporter> }>;

let dynamicImport: DynamicImport | undefined;

// This package compiles to CommonJS, where tsc downlevels `import()` to
// `require()`, which cannot load the ES-module WASM bundle. The indirection
// keeps a true dynamic import. Built lazily, on first use, so that merely
// importing this module does not run an eval-family construct under a CSP
// that forbids it (e.g. a host embedding the converter for other languages).
function getDynamicImport(): DynamicImport {
  dynamicImport ??= new Function(
    "specifier",
    "return import(specifier)",
  ) as DynamicImport;
  return dynamicImport;
}

/** Converts requests to C# code for the .NET Elasticsearch client.
 *
 * Code generation runs inside the .NET WASM bundle shipped as the optional
 * `@elastic/request-converter-dotnet` package, which embeds the
 * `Elastic.Clients.Elasticsearch` client matching its own major.minor.
 */
export class CSharpExporter implements FormatExporter {
  private exporter?: Promise<ExternalExporter>;

  constructor(private readonly bundlePath?: string) {}

  async check(requests: ParsedRequest[]): Promise<boolean> {
    if (!requests.every((request) => request.service === "es")) {
      return false;
    }
    return (await this.getExporter()).check(requests);
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    if (!requests.every((request) => request.service === "es")) {
      throw new Error("Cannot perform conversion");
    }
    return (await this.getExporter()).convert(requests, {
      document_type_name: "MyDocument",
      syntax_mode: "descriptor",
      use_strongly_typed_document: true,
      ...options,
    });
  }

  private getExporter(): Promise<ExternalExporter> {
    this.exporter ??= this.loadExporter();
    return this.exporter;
  }

  private async loadExporter(): Promise<ExternalExporter> {
    const specifier =
      this.bundlePath ??
      process.env.CSHARP_REQUEST_CONVERTER_BUNDLE ??
      BUNDLE_PACKAGE;
    let module;
    try {
      // File-system specifiers need URL form on Windows (drive letters).
      const importSpecifier = existsSync(specifier)
        ? pathToFileURL(resolve(specifier)).href
        : specifier;
      module = await getDynamicImport()(importSpecifier);
    } catch (error) {
      throw new Error(
        `The C# exporter requires the optional ${BUNDLE_PACKAGE} package ` +
          `(npm install ${BUNDLE_PACKAGE}): ${(error as Error).message}`,
      );
    }
    if (typeof module.boot !== "function") {
      throw new Error(`${specifier} does not export a boot() function.`);
    }
    return new ExternalExporter(await module.boot());
  }
}
