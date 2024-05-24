type ConvertOptions = {
  source: string;
  outputFormat: string;
  checkOnly?: string;
};

export function convertRequest(options: ConvertOptions): boolean | string {
  if (options.checkOnly) {
    return true;
  }

  return "converted request";
}
