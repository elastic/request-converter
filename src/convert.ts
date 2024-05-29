import { parseRequests, ParsedRequest } from "./parse";
import { PythonExporter } from "./exporters/python";
import { JavaScriptExporter } from "./exporters/javascript";

export type ConvertOptions = {
  checkOnly?: boolean;
  [x: string]: unknown; // exporter specific options
};

export interface FormatExporter {
  check(): Promise<boolean>;
  convert(requests: ParsedRequest[], options: ConvertOptions): Promise<string>;
}

const EXPORTERS: Record<string, FormatExporter> = {
  python: new PythonExporter(),
  javascript: new JavaScriptExporter(),
};

export async function convertRequests(
  source: string,
  outputFormat: string,
  options: ConvertOptions,
): Promise<boolean | string> {
  const requests = await parseRequests(source);
  const exporter = EXPORTERS[outputFormat];
  if (options.checkOnly) {
    return await exporter.check();
  }
  return await exporter.convert(requests, options);
}
