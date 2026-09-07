import { FormatExporter, ConvertOptions } from "../../convert";
import { ParsedRequest } from "../../parse";
import {
  InstanceOf,
  Property,
  ValueOf,
  UnionOf,
  ArrayOf,
  TypeName,
} from "../../metamodel";
import { UNSUPPORTED_APIS, STRING_QUERY_PARAMS } from "./constants";
import { toPascalCase, apiToGoMethod, indent, enumMemberName } from "./naming";
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

    let statement: string;
    if (!req.api || UNSUPPORTED_APIS.test(req.api) || !req.request) {
      statement = this.renderUnsupportedRequest(req, varName, imports);
    } else {
      const { subclient, method } = apiToGoMethod(req.api);
      const caller = subclient ? `es.${subclient}.${method}` : `es.${method}`;

      const parts: string[] = [];

      const requiredPathParams = this.getRequiredPathArgs(req, ctx);
      parts.push(`${varName}, err := ${caller}(${requiredPathParams}).`);

      this.renderPathParams(req, parts);
      this.renderQueryParams(req, parts, ctx);
      this.renderBody(req, parts, ctx, renderer, imports);

      parts.push(`${indent(1)}Do(context.Background())`);
      statement = parts.join("\n");
    }

    return (
      statement + this.renderResultHandling(varName, options, imports) + "\n"
    );
  }

  private renderResultHandling(
    varName: string,
    options: ConvertOptions,
    imports: ImportTracker,
  ): string {
    let suffix = "";
    if (options.complete) {
      suffix += `\nif err != nil {\n${indent(
        1,
      )}log.Fatalf("Error: %s", err)\n}`;
    }
    if (options.printResponse) {
      imports.addFmt();
      suffix += `\nfmt.Println(${varName})`;
    } else if (options.complete) {
      suffix += `\n_ = ${varName}`;
    }
    return suffix;
  }

  private renderUnsupportedRequest(
    req: ParsedRequest,
    varName: string,
    imports: ImportTracker,
  ): string {
    imports.add("net/http");
    imports.add("net/url");
    let body = "nil";
    if (req.body) {
      body = `strings.NewReader(\`${JSON.stringify(req.body)}\`)`;
      imports.add("strings");
    }
    return `${varName}, err := es.Transport.Perform(&http.Request{
    Method: "${req.method}",
    URL:    &url.URL{Path: "${req.path}"},
    Body:   ${body},
})`;
  }

  private getRequiredPathArgs(req: ParsedRequest, ctx: RenderContext): string {
    if (!req.request?.path || Object.keys(req.params).length === 0) {
      return "";
    }
    const required = req.request.path.filter((p) => p.required);
    const order = req.api ? ctx.resolver.getPathParamOrder(req.api) : [];
    const ordered =
      order.length > 0
        ? [...required].sort((a, b) => {
            const ia = order.indexOf(a.name);
            const ib = order.indexOf(b.name);
            return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib);
          })
        : required;
    const args: string[] = [];
    for (const param of ordered) {
      const value = req.params[param.name];
      if (value !== undefined) {
        args.push(`"${this.escapeGoString(value)}"`);
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
      parts.push(`${indent(1)}${methodName}("${this.escapeGoString(value)}").`);
    }
  }

  // The enum type name for a query param, whose type may be `T` or `T | T[]`.
  private queryParamEnumType(typeInfo: ValueOf): TypeName | undefined {
    if (typeInfo.kind === "instance_of") return (typeInfo as InstanceOf).type;
    if (typeInfo.kind === "union_of") {
      for (const item of (typeInfo as UnionOf).items) {
        if (item.kind === "instance_of") return (item as InstanceOf).type;
        if (
          item.kind === "array_of" &&
          (item as ArrayOf).value.kind === "instance_of"
        ) {
          return ((item as ArrayOf).value as InstanceOf).type;
        }
      }
    }
    return undefined;
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
      if (specParam && !STRING_QUERY_PARAMS.has(name)) {
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
        }
        // Resolve the enum from the param type, which may be `T` or `T | T[]`.
        const enumName = this.queryParamEnumType(typeInfo);
        const resolvedEnum = enumName
          ? ctx.resolver.resolveEnum(enumName)
          : undefined;
        if (resolvedEnum) {
          const enumPkg = resolvedEnum.typeName.name.toLowerCase();
          const members = value.split(",").map((v) => {
            const m = resolvedEnum.enum.members.find(
              (mm) =>
                mm.name === v ||
                mm.aliases?.includes(v) ||
                mm.name.toLowerCase() === v.toLowerCase(),
            );
            return m ? `${enumPkg}.${enumMemberName(m.name)}` : undefined;
          });
          if (members.every((m) => m !== undefined)) {
            ctx.imports.addEnumPackage(resolvedEnum.typeName);
            parts.push(`${indent(1)}${methodName}(${members.join(", ")}).`);
            continue;
          }
        }
      }
      parts.push(`${indent(1)}${methodName}("${this.escapeGoString(value)}").`);
    }
  }

  // Escape a string for use inside a Go double-quoted literal.
  private escapeGoString(s: string): string {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
  }

  private renderBody(
    req: ParsedRequest,
    parts: string[],
    ctx: RenderContext,
    renderer: GoValueRenderer,
    imports: ImportTracker,
  ): void {
    if (!req.body || typeof req.body !== "object") {
      return;
    }
    if (Array.isArray(req.body)) {
      const lines = (req.body as unknown[])
        .map((item) => JSON.stringify(item))
        .join("\n");
      imports.add("strings");
      parts.push(`${indent(1)}Raw(strings.NewReader(\`${lines}\`)).`);
      return;
    }
    if (!req.request?.body || req.request.body.kind === "no_body") {
      return;
    }

    const body = req.body as Record<string, unknown>;
    if (Object.keys(body).length === 0) return;

    // Use the expanded schema so top-level generics resolve to json.RawMessage.
    const expandedReq = ctx.resolver.getRequest(
      req.request.name.name,
      req.request.name.namespace,
    );
    const bodyDef = expandedReq?.body ?? req.request.body;
    const inherits = expandedReq?.inherits ?? req.request.inherits;

    // Whole-body user_defined_value (e.g. index/create) renders as an untyped map.
    if (
      bodyDef.kind === "value" &&
      (bodyDef.value.kind === "user_defined_value" ||
        (bodyDef.value.kind === "instance_of" &&
          ctx.resolver.isUserDefinedValueBody(
            req.request.name.name,
            req.request.name.namespace,
          )))
    ) {
      this.renderUntypedBody(body, parts, ctx, renderer);
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

    if (inherits) {
      const parentProps = ctx.resolver.getInterfaceProperties(
        inherits.type.name,
        inherits.type.namespace,
      );
      properties = [...properties, ...parentProps];
    }

    if (properties.length === 0) {
      imports.add("strings");
      parts.push(
        `${indent(1)}Raw(strings.NewReader(\`${JSON.stringify(body)}\`)).`,
      );
      return;
    }

    const apiPkg = this.getApiPackageName(req.api!);
    imports.addApiPackage(req.api!);

    const bodyLines = renderer.renderStructFields(body, properties, ctx);
    parts.push(`${indent(1)}Request(&${apiPkg}.Request{`);
    parts.push(bodyLines);
    parts.push(`${indent(1)}}).`);
  }

  private renderUntypedBody(
    body: Record<string, unknown>,
    parts: string[],
    ctx: RenderContext,
    renderer: GoValueRenderer,
  ): void {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      lines.push(
        `${ctx.indent()}"${renderer.escapeGoString(
          key,
        )}": ${renderer.renderLiteralValue(value, ctx)},`,
      );
    }
    parts.push(`${indent(1)}Request(map[string]interface{}{`);
    parts.push(lines.join("\n"));
    parts.push(`${indent(1)}}).`);
  }

  private getApiPackageName(api: string): string {
    const parts = api.split(".");
    return parts[parts.length - 1].replace(/_/g, "");
  }
}
