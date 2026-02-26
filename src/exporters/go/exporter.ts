import { FormatExporter, ConvertOptions } from "../../convert";
import { ParsedRequest } from "../../parse";
import { InstanceOf, Property } from "../../metamodel";
import { UNSUPPORTED_APIS } from "./constants";
import { toPascalCase, apiToGoMethod, indent } from "./naming";
import { TypeResolver } from "./schema";
import { ImportTracker } from "./imports";
import { RenderContext } from "./context";
import { GoValueRenderer } from "./renderer";

export class GoExporter implements FormatExporter {
  async check(requests: ParsedRequest[]): Promise<boolean> {
    return requests
      .map((req) => req.service === "es")
      .reduce((prev, curr) => prev && curr, true);
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    if (!(await this.check(requests))) {
      throw new Error("Cannot perform conversion");
    }
    const resolver = await TypeResolver.load();
    const imports = new ImportTracker();
    imports.addContext();
    const renderer = new GoValueRenderer();

    const snippets: string[] = [];
    for (let i = 0; i < requests.length; i++) {
      const ctx = new RenderContext(resolver, imports, 2);
      snippets.push(
        this.renderRequest(requests[i], i, imports, ctx, renderer, options),
      );
    }

    let output = snippets.join("\n");

    if (options.complete) {
      imports.addElasticsearch();
      imports.addLog();
      const esUrl = options.elasticsearchUrl
        ? `"${options.elasticsearchUrl}"`
        : `os.Getenv("ELASTICSEARCH_URL")`;
      if (!options.elasticsearchUrl) {
        imports.add("os");
      }
      const header = `package main

${imports.render()}

func main() {
    cfg := elasticsearch.Config{
        Addresses: []string{${esUrl}},
    }
    es, err := elasticsearch.NewTypedClient(cfg)
    if err != nil {
        log.Fatalf("Error creating client: %s", err)
    }

`;
      const footer = `}
`;
      output =
        header +
        output
          .split("\n")
          .map((line) => (line ? "    " + line : line))
          .join("\n") +
        footer;
    }

    return output;
  }

  private renderRequest(
    req: ParsedRequest,
    index: number,
    imports: ImportTracker,
    ctx: RenderContext,
    renderer: GoValueRenderer,
    options: ConvertOptions,
  ): string {
    const varName = index === 0 ? "res" : `res${index}`;

    if (!req.api || UNSUPPORTED_APIS.test(req.api) || !req.request) {
      return this.renderUnsupportedRequest(req, varName, imports);
    }

    const { subclient, method } = apiToGoMethod(req.api);
    const caller = subclient ? `es.${subclient}.${method}` : `es.${method}`;

    const parts: string[] = [];

    const requiredPathParams = this.getRequiredPathArgs(req);
    parts.push(`${varName}, err := ${caller}(${requiredPathParams}).`);

    this.renderPathParams(req, parts);
    this.renderQueryParams(req, parts, ctx);
    this.renderBody(req, parts, ctx, renderer, imports);

    parts.push(`${indent(1)}Do(context.Background())`);

    let result = parts.join("\n");

    if (options.printResponse) {
      imports.addFmt();
      result += `\nfmt.Println(${varName})`;
    }

    return result + "\n";
  }

  private renderUnsupportedRequest(
    req: ParsedRequest,
    varName: string,
    imports: ImportTracker,
  ): string {
    let body = "nil";
    if (req.body) {
      body = `strings.NewReader(\`${JSON.stringify(req.body)}\`)`;
      imports.add("strings");
    }
    return `${varName}, err := es.Transport.Perform(&http.Request{
    Method: "${req.method}",
    URL:    &url.URL{Path: "${req.path}"},
    Body:   ${body},
})
`;
  }

  private getRequiredPathArgs(req: ParsedRequest): string {
    if (!req.request?.path || Object.keys(req.params).length === 0) {
      return "";
    }
    const required = req.request.path.filter((p) => p.required);
    const args: string[] = [];
    for (const param of required) {
      const value = req.params[param.name];
      if (value !== undefined) {
        args.push(`"${value}"`);
      }
    }
    return args.join(", ");
  }

  private renderPathParams(req: ParsedRequest, parts: string[]): void {
    if (!req.request?.path) return;
    const required = new Set(
      req.request.path.filter((p) => p.required).map((p) => p.name),
    );
    for (const [name, value] of Object.entries(req.params)) {
      if (value === undefined || required.has(name)) continue;
      const methodName = toPascalCase(name);
      parts.push(`${indent(1)}${methodName}("${value}").`);
    }
  }

  private renderQueryParams(
    req: ParsedRequest,
    parts: string[],
    ctx: RenderContext,
  ): void {
    if (!req.query) return;
    for (const [name, value] of Object.entries(req.query)) {
      let specParam = req.request?.query?.find((q) => q.name === name);
      if (!specParam && req.request?.attachedBehaviors) {
        const behaviorProps = ctx.resolver.getBehaviorProperties(
          req.request.attachedBehaviors,
        );
        specParam = behaviorProps.find((p) => p.name === name);
      }
      const methodName = toPascalCase(name);
      if (specParam) {
        const typeInfo = specParam.type;
        if (typeInfo.kind === "instance_of") {
          const inst = typeInfo as InstanceOf;
          if (ctx.resolver.isNumericType(inst.type)) {
            parts.push(`${indent(1)}${methodName}(${parseInt(value, 10)}).`);
            continue;
          }
          if (ctx.resolver.isBooleanType(inst.type)) {
            parts.push(`${indent(1)}${methodName}(${value === "true"}).`);
            continue;
          }
          const enumType = ctx.resolver.isEnumType(inst.type);
          if (enumType) {
            const enumPkg = inst.type.name.toLowerCase();
            const member = enumType.members.find(
              (m) =>
                m.name === value ||
                m.aliases?.includes(value) ||
                m.name.toLowerCase() === value.toLowerCase(),
            );
            if (member) {
              ctx.imports.addEnumPackage(inst.type);
              parts.push(
                `${indent(1)}${methodName}(${enumPkg}.${toPascalCase(
                  member.name,
                )}).`,
              );
              continue;
            }
          }
        }
      }
      parts.push(`${indent(1)}${methodName}("${value}").`);
    }
  }

  private renderBody(
    req: ParsedRequest,
    parts: string[],
    ctx: RenderContext,
    renderer: GoValueRenderer,
    imports: ImportTracker,
  ): void {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return;
    }
    if (!req.request?.body || req.request.body.kind === "no_body") {
      return;
    }

    const body = req.body as Record<string, unknown>;
    if (Object.keys(body).length === 0) return;

    const bodyDef = req.request.body;

    if (
      bodyDef.kind === "value" &&
      bodyDef.value.kind === "instance_of" &&
      ctx.resolver.isUserDefinedValueBody(
        req.request.name.name,
        req.request.name.namespace,
      )
    ) {
      const lines: string[] = [];
      for (const [key, value] of Object.entries(body)) {
        lines.push(
          `${ctx.indent()}"${renderer.escapeGoString(key)}": ${renderer.renderLiteralValue(value, ctx)},`,
        );
      }
      parts.push(`${indent(1)}Request(map[string]interface{}{`);
      parts.push(lines.join("\n"));
      parts.push(`${indent(1)}}).`);
      return;
    }

    let properties: Property[];
    if (bodyDef.kind === "properties") {
      properties = bodyDef.properties;
    } else if (
      bodyDef.kind === "value" &&
      bodyDef.value.kind === "instance_of"
    ) {
      const inst = bodyDef.value as InstanceOf;
      properties = ctx.resolver.getInterfaceProperties(
        inst.type.name,
        inst.type.namespace,
      );
    } else {
      return;
    }

    if (req.request.inherits) {
      const parentProps = ctx.resolver.getInterfaceProperties(
        req.request.inherits.type.name,
        req.request.inherits.type.namespace,
      );
      properties = [...properties, ...parentProps];
    }

    const apiPkg = this.getApiPackageName(req.api!);
    imports.addApiPackage(req.api!);
    imports.addTypes();

    const bodyLines = renderer.renderStructFields(body, properties, ctx);
    parts.push(`${indent(1)}Request(&${apiPkg}.Request{`);
    parts.push(bodyLines);
    parts.push(`${indent(1)}}).`);
  }

  private getApiPackageName(api: string): string {
    const parts = api.split(".");
    return parts[parts.length - 1];
  }
}
