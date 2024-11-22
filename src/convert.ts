import { parseRequests, ParsedRequest } from "./parse";
import { PythonExporter } from "./exporters/python";
import { CurlExporter } from "./exporters/curl";
import { JavaScriptExporter } from "./exporters/javascript";

export type ConvertOptions = {
  /** When `true`, the converter will only check if the conversion can be carried
   * out or not. */
  checkOnly?: boolean;
  /** When `true`, the generated code will generate a complete script that includes
   * the instatiation of the Elasticsearch client. When `false`, only the
   * request(s) will be generated. */
  complete?: boolean;
  /** When `complete` is `true`, this is the endpoint URL to connect to. */
  printResponse?: boolean;
  /** When `true`, the generated code will print the response. When `false`,
   * the response will not be printed. Note that not all formats may honor this
   * option. */
  elasticsearchUrl?: string;
  /** When `true`, log information that is useful when debugging. */
  debug?: boolean;
  /** Converters may have their own custom options. */
  [x: string]: unknown; // exporter specific options
};

/**
 * This interface defines the structure of a language exporter.
 */
export interface FormatExporter {
  check(requests: ParsedRequest[]): Promise<boolean>;
  convert(requests: ParsedRequest[], options: ConvertOptions): Promise<string>;
}

const EXPORTERS: Record<string, FormatExporter> = {
  python: new PythonExporter(),
  curl: new CurlExporter(),
  javascript: new JavaScriptExporter(),
};

/**
 * Return the list of available export formats.
 *
 * @returns An array of strings with the names of the formats that are available
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
  outputFormat: string | FormatExporter,
  options: ConvertOptions,
): Promise<boolean | string> {
  const requests = await parseRequests(source);
  const exporter =
    typeof outputFormat == "string" ? EXPORTERS[outputFormat] : outputFormat;
  if (!exporter) {
    throw new Error("Invalid output format");
  }
  /* istanbul ignore next */
  if (options.debug) {
    console.log(JSON.stringify(requests));
  }
  if (options.checkOnly) {
    return await exporter.check(requests);
  }
  return await exporter.convert(requests, options);
}

/**
 * This interface defines the structure of an externally hosted language
 * exporter.
 * @experimental
 */
export interface ExternalFormatExporter {
  check(input: string): string;
  convert(input: string): string;
}

/**
 * Base class for remotely hosted language exporters.
 *
 * This class is used to wrap exporters that are hosted externally,
 * for example as WASM modules.
 * @experimental
 */
export class ExternalExporter implements FormatExporter {
  private _check: (input: string) => string;
  private _convert: (input: string) => string;

  /**
   * Class constructor.
   *
   * `module` must have `check` and `convert` entry point functions. Both
   * functions must accept a JSON string with the input arguments. The
   * response must be a JSON string with the format `{"return": ..., "error": "..."}`.
   * If the `error` attribute is included, it is assumed that the function
   * failed and an error will be raised with the given error message.
   */
  constructor(module: ExternalFormatExporter) {
    this._check = module.check;
    this._convert = module.convert;
  }

  async check(requests: ParsedRequest[]): Promise<boolean> {
    const response = JSON.parse(this._check(JSON.stringify({ requests })));
    if (response.error) {
      throw new Error(response.error);
    }
    return response.return;
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    const response = JSON.parse(
      this._convert(JSON.stringify({ requests, options })),
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.return;
  }
}

/**
 * Base class for web hosted language exporters.
 *
 * This class is used to wrap exporters that are hosted externally as
 * web services.
 * @experimental
 */
export class WebExporter implements FormatExporter {
  private baseUrl: string;

  /**
   * Class constructor.
   *
   * `baseUrl` is the location where the web service is hosted. The required
   * endpoints are `/check` and `/convert`, appended to this URL. The
   * endpoints must accept a JSON string with the input arguments. The
   * response must be a JSON string with the format `{"return": ..., "error": "..."}`.
   * If the `error` attribute is included, it is assumed that the function
   * failed and an error will be raised with the given error message.
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async check(requests: ParsedRequest[]): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/check`, {
      method: "POST",
      body: JSON.stringify({ requests }),
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }
      return json.result;
    }
    throw new Error("Could not make web request");
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/check`, {
      method: "POST",
      body: JSON.stringify({ requests, options }),
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }
      return json.result;
    }
    throw new Error("Could not make web request");
  }
}
