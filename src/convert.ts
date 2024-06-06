import { parseRequests, ParsedRequest } from "./parse";
import { PythonExporter } from "./exporters/python";
import { CurlExporter } from "./exporters/curl";
//import { JavaScriptExporter } from "./exporters/javascript";

export type ConvertOptions = {
  /** When `true`, the converter will only check if the conversion can be carried
   * out or not. */
  checkOnly?: boolean;
  /** When `true`, the generated code will generate a complete script that includes
   * the instatiation of the Elasticsearch client. When `false`, only the
   * request(s) will be generated */
  complete?: boolean;
  /** When `complete` is `true`, this is the endpoint URL to connect to. */
  elasticsearchUrl?: string;
  /** When `true`, log information that is useful when debugging. */
  debug?: boolean;
  /** Converters may have their own custom options. */
  [x: string]: unknown; // exporter specific options
};

export interface FormatExporter {
  check(): Promise<boolean>;
  convert(requests: ParsedRequest[], options: ConvertOptions): Promise<string>;
}

const EXPORTERS: Record<string, FormatExporter> = {
  python: new PythonExporter(),
  curl: new CurlExporter(),
  //javascript: new JavaScriptExporter(),
};

/**
 * Return the list of available export formats.
 *
 * @returs An array of strings with the names of the formats that are available
 *   to use in the `convertRequests()` function.
 */
export function listFormats(): string[] {
  return Object.keys(EXPORTERS);
}

/**
 * Convert Elasticsearch requests in Dev Console syntax to other formats.
 *
 * @param source The source Dev Console code, given as a single string. Multiple
 *   requests can be separated with an empty line.
 * @param outputFormat The format to convert to, such as `"python"` or `"javascript"`.
 * @param options Conversion options.
 * @returns When `checkOnly` is set to `true` in `options`, the return value is a
 *   boolean that indicates if the given source code can be converted. A `false`
 *   return indicates that the requested conversion cannot be completed, for
 *   example due to unsupported features in the specified target format. If
 *   `checkOnly` is `false` or not given, the return value is a string with the
 *   converted code.
 */
export async function convertRequests(
  source: string,
  outputFormat: string,
  options: ConvertOptions,
): Promise<boolean | string> {
  const requests = await parseRequests(source);
  const exporter = EXPORTERS[outputFormat];
  if (options.debug) {
    /* istanbul ignore next */
    console.log(JSON.stringify(requests));
  }
  if (options.checkOnly) {
    return await exporter.check();
  }
  return await exporter.convert(requests, options);
}
