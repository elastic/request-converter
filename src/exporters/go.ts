import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest, spec } from "../parse";
import {
  TypeDefinition,
  Interface,
  Property,
  ValueOf,
  InstanceOf,
  ArrayOf,
  DictionaryOf,
  UnionOf,
  Enum,
  TypeAlias,
  TypeName,
} from "../metamodel";

const UNSUPPORTED_APIS = new RegExp("^_internal.*$");

const GO_BASE_IMPORT = "github.com/elastic/go-elasticsearch/v9";

const NUMERIC_TYPES = new Set([
  "integer",
  "long",
  "float",
  "double",
  "number",
  "uint",
  "short",
  "byte",
  "ulong",
]);

const STRING_ALIAS_TYPES = new Set([
  "Id",
  "IndexName",
  "Name",
  "Field",
  "Routing",
  "NodeId",
  "ScrollId",
  "IndexAlias",
  "TaskId",
  "Namespace",
  "NodeName",
  "Percentage",
  "Duration",
  "DurationLarge",
  "TimeUnit",
  "EpochTime",
  "DateTime",
  "DateString",
  "DateMath",
  "MinimumShouldMatch",
  "VersionString",
  "PipelineName",
  "DataStreamName",
  "Ip",
  "Host",
  "Password",
  "Username",
  "Metadata",
  "Uri",
  "Uuid",
  "SequenceNumber",
  "ByteSize",
  "HumanReadableByteCount",
  "WaitForActiveShards",
  "Fuzziness",
  "MultiTermQueryRewrite",
  "GeoHash",
  "GeoTilePrecision",
  "Script",
  "ScriptLanguage",
]);

function toPascalCase(name: string): string {
  return name
    .split("_")
    .map((part) => {
      if (part.length === 0) return "";
      if (part.toLowerCase() === "id") return "ID";
      if (part.toLowerCase() === "ip") return "IP";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function apiToGoMethod(api: string): { subclient: string; method: string } {
  const parts = api.split(".");
  if (parts.length === 1) {
    return { subclient: "", method: toPascalCase(parts[0]) };
  }
  const method = toPascalCase(parts[parts.length - 1]);
  const subclient = parts
    .slice(0, -1)
    .map((p) => toPascalCase(p))
    .join(".");
  return { subclient, method };
}

function resolveGoFieldName(name: string, props?: Property[]): string {
  if (props) {
    for (const prop of props) {
      if (prop.name === name && prop.codegenName != undefined) {
        return toPascalCase(prop.codegenName);
      }
    }
  }
  if (name.startsWith("_")) {
    return toPascalCase(name.slice(1)) + "_";
  }
  return toPascalCase(name);
}

function indent(depth: number): string {
  return "    ".repeat(depth);
}

function getType(
  name: string,
  namespace: string,
): TypeDefinition | undefined {
  for (const type of spec.types) {
    if (type.name.name === name && type.name.namespace === namespace) {
      return type;
    }
  }
  return undefined;
}

function getInterfaceProperties(
  name: string,
  namespace: string,
): Property[] {
  let props: Property[] = [];
  const type = getType(name, namespace);
  if (type?.kind === "interface") {
    let i = type as Interface;
    props = [...i.properties];
    while (i.inherits) {
      const parent = getType(
        i.inherits.type.name,
        i.inherits.type.namespace,
      ) as Interface | undefined;
      if (!parent) break;
      i = parent;
      props = [...props, ...i.properties];
    }
  }
  return props;
}

function isNumericType(typeName: TypeName): boolean {
  if (typeName.namespace === "_builtins" && typeName.name === "number") {
    return true;
  }
  if (typeName.namespace === "_types" && NUMERIC_TYPES.has(typeName.name)) {
    return true;
  }
  return false;
}

function isBooleanType(typeName: TypeName): boolean {
  return (
    typeName.namespace === "_builtins" && typeName.name === "boolean"
  );
}

function isStringType(typeName: TypeName): boolean {
  if (typeName.namespace === "_builtins" && typeName.name === "string") {
    return true;
  }
  if (typeName.namespace === "_types" && STRING_ALIAS_TYPES.has(typeName.name)) {
    return true;
  }
  const type = getType(typeName.name, typeName.namespace);
  if (type?.kind === "type_alias") {
    const alias = type as TypeAlias;
    if (alias.type.kind === "instance_of") {
      return isStringType((alias.type as InstanceOf).type);
    }
  }
  return false;
}

function isEnumType(typeName: TypeName): Enum | undefined {
  const type = getType(typeName.name, typeName.namespace);
  if (type?.kind === "enum") {
    return type as Enum;
  }
  if (type?.kind === "type_alias") {
    const alias = type as TypeAlias;
    if (alias.type.kind === "instance_of") {
      return isEnumType((alias.type as InstanceOf).type);
    }
  }
  return undefined;
}

function resolveTypeAlias(typeInfo: ValueOf): ValueOf {
  if (typeInfo.kind === "instance_of") {
    const inst = typeInfo as InstanceOf;
    const type = getType(inst.type.name, inst.type.namespace);
    if (type?.kind === "type_alias") {
      return (type as TypeAlias).type;
    }
  }
  return typeInfo;
}

function goTypeName(typeName: TypeName): string {
  let name = toPascalCase(typeName.name);
  if (name.endsWith("Container")) {
    name = name.slice(0, -"Container".length);
  }
  return name;
}

class ImportTracker {
  private imports = new Set<string>();

  add(pkg: string): void {
    this.imports.add(pkg);
  }

  addContext(): void {
    this.imports.add("context");
  }

  addFmt(): void {
    this.imports.add("fmt");
  }

  addLog(): void {
    this.imports.add("log");
  }

  addTypes(): void {
    this.imports.add(`${GO_BASE_IMPORT}/typedapi/types`);
  }

  addSome(): void {
    this.imports.add(`${GO_BASE_IMPORT}/typedapi/some`);
  }

  addElasticsearch(): void {
    this.imports.add(GO_BASE_IMPORT);
  }

  addApiPackage(api: string): void {
    const parts = api.split(".");
    let pkgPath: string;
    if (parts.length === 1) {
      pkgPath = `${GO_BASE_IMPORT}/typedapi/core/${parts[0]}`;
    } else {
      pkgPath = `${GO_BASE_IMPORT}/typedapi/${parts.join("/")}`;
    }
    this.imports.add(pkgPath);
  }

  addEnumPackage(typeName: TypeName): void {
    const enumPkgName = typeName.name.toLowerCase();
    const nsParts = typeName.namespace.split(".");
    if (nsParts[0] === "_types") {
      this.imports.add(
        `${GO_BASE_IMPORT}/typedapi/types/enums/${enumPkgName}`,
      );
    } else {
      this.imports.add(
        `${GO_BASE_IMPORT}/typedapi/types/enums/${enumPkgName}`,
      );
    }
  }

  render(): string {
    if (this.imports.size === 0) return "";
    const sorted = [...this.imports].sort();
    const stdLib = sorted.filter((i) => !i.includes("/"));
    const external = sorted.filter((i) => i.includes("/"));
    const parts: string[] = [];
    if (stdLib.length > 0) {
      parts.push(stdLib.map((i) => `    "${i}"`).join("\n"));
    }
    if (external.length > 0) {
      parts.push(external.map((i) => `    "${i}"`).join("\n"));
    }
    return `import (\n${parts.join("\n\n")}\n)`;
  }
}

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
    const imports = new ImportTracker();
    imports.addContext();

    const snippets: string[] = [];
    for (let i = 0; i < requests.length; i++) {
      snippets.push(this.renderRequest(requests[i], i, imports, options));
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
      output = header + output
        .split("\n")
        .map((line) => (line ? "    " + line : line))
        .join("\n") + footer;
    }

    return output;
  }

  private renderRequest(
    req: ParsedRequest,
    index: number,
    imports: ImportTracker,
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
    this.renderQueryParams(req, parts, imports);
    this.renderBody(req, parts, imports);

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

  private renderPathParams(
    req: ParsedRequest,
    parts: string[],
  ): void {
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
    imports: ImportTracker,
  ): void {
    if (!req.query) return;
    for (const [name, value] of Object.entries(req.query)) {
      const specParam = req.request?.query?.find((q) => q.name === name);
      const methodName = toPascalCase(name);
      if (specParam) {
        const typeInfo = specParam.type;
        if (typeInfo.kind === "instance_of") {
          const inst = typeInfo as InstanceOf;
          if (isNumericType(inst.type)) {
            parts.push(`${indent(1)}${methodName}(${parseInt(value, 10)}).`);
            continue;
          }
          if (isBooleanType(inst.type)) {
            parts.push(`${indent(1)}${methodName}(${value === "true"}).`);
            continue;
          }
          const enumType = isEnumType(inst.type);
          if (enumType) {
            const enumPkg = inst.type.name.toLowerCase();
            const member = enumType.members.find(
              (m) =>
                m.name === value ||
                m.aliases?.includes(value) ||
                m.name.toLowerCase() === value.toLowerCase(),
            );
            if (member) {
              imports.addEnumPackage(inst.type);
              parts.push(
                `${indent(1)}${methodName}(${enumPkg}.${toPascalCase(member.name)}).`,
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
    let properties: Property[];
    if (bodyDef.kind === "properties") {
      properties = bodyDef.properties;
    } else if (bodyDef.kind === "value" && bodyDef.value.kind === "instance_of") {
      const inst = bodyDef.value as InstanceOf;
      properties = getInterfaceProperties(inst.type.name, inst.type.namespace);
    } else {
      return;
    }

    if (req.request.inherits) {
      const parentProps = getInterfaceProperties(
        req.request.inherits.type.name,
        req.request.inherits.type.namespace,
      );
      properties = [...properties, ...parentProps];
    }

    const apiPkg = this.getApiPackageName(req.api!);
    imports.addApiPackage(req.api!);
    imports.addTypes();

    const bodyLines = this.renderStructFields(body, properties, 2, imports);
    parts.push(`${indent(1)}Request(&${apiPkg}.Request{`);
    parts.push(bodyLines);
    parts.push(`${indent(1)}}).`);
  }

  private getApiPackageName(api: string): string {
    const parts = api.split(".");
    return parts[parts.length - 1];
  }

  private renderStructFields(
    obj: Record<string, unknown>,
    properties: Property[],
    depth: number,
    imports: ImportTracker,
  ): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const prop = properties.find((p) => p.name === key);
      if (!prop) {
        const fieldName = resolveGoFieldName(key, properties);
        lines.push(
          `${indent(depth)}${fieldName}: ${this.renderLiteralValue(value, depth, imports)},`,
        );
        continue;
      }
      const fieldName = resolveGoFieldName(key, properties);
      lines.push(
        `${indent(depth)}${fieldName}: ${this.renderGoValue(value, prop.type, depth, imports, prop)},`,
      );
    }
    return lines.join("\n");
  }

  renderGoValue(
    value: unknown,
    typeInfo: ValueOf,
    depth: number,
    imports: ImportTracker,
    prop?: Property,
  ): string {
    if (value === null) {
      return "nil";
    }

    switch (typeInfo.kind) {
      case "instance_of":
        return this.renderInstanceOf(
          value,
          typeInfo as InstanceOf,
          depth,
          imports,
          prop,
        );
      case "dictionary_of":
        return this.renderDictionaryOf(
          value,
          typeInfo as DictionaryOf,
          depth,
          imports,
        );
      case "array_of":
        return this.renderArrayOf(
          value,
          typeInfo as ArrayOf,
          depth,
          imports,
        );
      case "union_of":
        return this.renderUnionOf(
          value,
          typeInfo as UnionOf,
          depth,
          imports,
          prop,
        );
      case "user_defined_value":
        return this.renderLiteralValue(value, depth, imports);
      case "literal_value":
        return JSON.stringify(value);
      default:
        return this.renderLiteralValue(value, depth, imports);
    }
  }

  private renderInstanceOf(
    value: unknown,
    typeInfo: InstanceOf,
    depth: number,
    imports: ImportTracker,
    prop?: Property,
  ): string {
    const { name, namespace } = typeInfo.type;

    if (namespace === "_builtins") {
      return this.renderBuiltin(value, name, depth, imports);
    }

    if (isNumericType(typeInfo.type)) {
      if (prop && !prop.required) {
        imports.addSome();
        return `some.Int(${this.toGoNumber(value)})`;
      }
      return String(this.toGoNumber(value));
    }

    if (isStringType(typeInfo.type)) {
      if (typeof value === "string") {
        return `"${this.escapeGoString(value)}"`;
      }
      return `"${value}"`;
    }

    const enumType = isEnumType(typeInfo.type);
    if (enumType) {
      return this.renderEnumValue(value, typeInfo.type, enumType, imports);
    }

    const resolved = resolveTypeAlias(typeInfo);
    if (resolved !== typeInfo) {
      return this.renderGoValue(value, resolved, depth, imports, prop);
    }

    const typeDef = getType(name, namespace);
    if (!typeDef) {
      return this.renderLiteralValue(value, depth, imports);
    }

    if (typeDef.kind === "interface") {
      const iface = typeDef as Interface;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        if (iface.variants?.kind === "container") {
          return this.renderContainerVariant(
            value as Record<string, unknown>,
            iface,
            depth,
            imports,
          );
        }
        const props = getInterfaceProperties(name, namespace);
        const goName = goTypeName(typeInfo.type);
        imports.addTypes();
        const fields = this.renderStructFields(
          value as Record<string, unknown>,
          props,
          depth + 1,
          imports,
        );
        if (!fields.trim()) {
          return `&types.${goName}{}`;
        }
        return `&types.${goName}{\n${fields}\n${indent(depth)}}`;
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        if (iface.shortcutProperty) {
          const shortcutProp = getInterfaceProperties(name, namespace).find(
            (p) => p.name === iface.shortcutProperty,
          );
          if (shortcutProp) {
            const goName = goTypeName(typeInfo.type);
            const fieldName = resolveGoFieldName(iface.shortcutProperty, getInterfaceProperties(name, namespace));
            const renderedVal = this.renderGoValue(value, shortcutProp.type, depth + 1, imports);
            imports.addTypes();
            return `types.${goName}{${fieldName}: ${renderedVal}}`;
          }
        }
        return this.renderLiteralValue(value, depth, imports);
      }
    }

    return this.renderLiteralValue(value, depth, imports);
  }

  private renderBuiltin(
    value: unknown,
    name: string,
    depth: number,
    imports: ImportTracker,
  ): string {
    switch (name) {
      case "string":
        if (typeof value === "string") {
          return `"${this.escapeGoString(value)}"`;
        }
        return `"${value}"`;
      case "boolean":
        return String(!!value);
      case "number":
        return String(value);
      case "null":
        return "nil";
      default:
        return this.renderLiteralValue(value, depth, imports);
    }
  }

  private renderContainerVariant(
    obj: Record<string, unknown>,
    iface: Interface,
    depth: number,
    imports: ImportTracker,
  ): string {
    const props = getInterfaceProperties(iface.name.name, iface.name.namespace);
    const goName = goTypeName(iface.name);
    imports.addTypes();

    const fields = this.renderStructFields(obj, props, depth + 1, imports);
    if (!fields.trim()) {
      return `&types.${goName}{}`;
    }
    return `&types.${goName}{\n${fields}\n${indent(depth)}}`;
  }

  private renderDictionaryOf(
    value: unknown,
    typeInfo: DictionaryOf,
    depth: number,
    imports: ImportTracker,
  ): string {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return this.renderLiteralValue(value, depth, imports);
    }

    const obj = value as Record<string, unknown>;
    const keyType = this.goTypeString(typeInfo.key, imports);
    const valueType = this.goTypeString(typeInfo.value, imports);

    const entries: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const renderedValue = this.renderGoValue(
        v,
        typeInfo.value,
        depth + 1,
        imports,
      );
      entries.push(`${indent(depth + 1)}"${this.escapeGoString(k)}": ${renderedValue},`);
    }

    if (entries.length === 0) {
      return `map[${keyType}]${valueType}{}`;
    }
    return `map[${keyType}]${valueType}{\n${entries.join("\n")}\n${indent(depth)}}`;
  }

  private renderArrayOf(
    value: unknown,
    typeInfo: ArrayOf,
    depth: number,
    imports: ImportTracker,
  ): string {
    if (!Array.isArray(value)) {
      return this.renderGoValue(value, typeInfo.value, depth, imports);
    }

    const elemType = this.goTypeString(typeInfo.value, imports);
    const elements: string[] = [];
    for (const item of value) {
      elements.push(
        `${indent(depth + 1)}${this.renderGoValue(item, typeInfo.value, depth + 1, imports)},`,
      );
    }

    if (elements.length === 0) {
      return `[]${elemType}{}`;
    }
    return `[]${elemType}{\n${elements.join("\n")}\n${indent(depth)}}`;
  }

  private renderUnionOf(
    value: unknown,
    typeInfo: UnionOf,
    depth: number,
    imports: ImportTracker,
    prop?: Property,
  ): string {
    if (typeInfo.items.length === 2) {
      const [a, b] = typeInfo.items;
      if (
        a.kind === "instance_of" &&
        b.kind === "array_of" &&
        b.value.kind === "instance_of" &&
        (a as InstanceOf).type.name === ((b as ArrayOf).value as InstanceOf).type.name
      ) {
        if (Array.isArray(value)) {
          return this.renderArrayOf(value, b as ArrayOf, depth, imports);
        }
        return this.renderGoValue(value, a, depth, imports, prop);
      }
    }

    for (const item of typeInfo.items) {
      if (item.kind === "instance_of") {
        const inst = item as InstanceOf;
        if (typeof value === "string" && isStringType(inst.type)) {
          return this.renderGoValue(value, item, depth, imports);
        }
        if (typeof value === "number" && isNumericType(inst.type)) {
          return this.renderGoValue(value, item, depth, imports);
        }
        if (typeof value === "boolean" && isBooleanType(inst.type)) {
          return this.renderGoValue(value, item, depth, imports);
        }
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          const typeDef = getType(inst.type.name, inst.type.namespace);
          if (typeDef?.kind === "interface") {
            return this.renderGoValue(value, item, depth, imports);
          }
        }
      }
      if (item.kind === "array_of" && Array.isArray(value)) {
        return this.renderArrayOf(value, item as ArrayOf, depth, imports);
      }
    }

    return this.renderLiteralValue(value, depth, imports);
  }

  private renderEnumValue(
    value: unknown,
    typeName: TypeName,
    enumType: Enum,
    imports: ImportTracker,
  ): string {
    const strValue = String(value);
    const member = enumType.members.find(
      (m) =>
        m.name === strValue ||
        m.aliases?.includes(strValue) ||
        m.name.toLowerCase() === strValue.toLowerCase(),
    );
    if (member) {
      imports.addEnumPackage(typeName);
      const enumPkg = typeName.name.toLowerCase();
      return `${enumPkg}.${toPascalCase(member.name)}`;
    }
    return `"${this.escapeGoString(strValue)}"`;
  }

  private goTypeString(typeInfo: ValueOf, imports: ImportTracker): string {
    switch (typeInfo.kind) {
      case "instance_of": {
        const inst = typeInfo as InstanceOf;
        if (inst.type.namespace === "_builtins") {
          switch (inst.type.name) {
            case "string":
              return "string";
            case "boolean":
              return "bool";
            case "number":
              return "int";
            case "null":
              return "interface{}";
          }
        }
        if (isNumericType(inst.type)) return "int";
        if (isStringType(inst.type)) return "string";
        const enumType = isEnumType(inst.type);
        if (enumType) {
          const enumPkg = inst.type.name.toLowerCase();
          imports.addEnumPackage(inst.type);
          return `${enumPkg}.${toPascalCase(inst.type.name)}`;
        }
        const typeDef = getType(inst.type.name, inst.type.namespace);
        if (typeDef?.kind === "interface") {
          imports.addTypes();
          return `types.${goTypeName(inst.type)}`;
        }
        const resolved = resolveTypeAlias(typeInfo);
        if (resolved !== typeInfo) {
          return this.goTypeString(resolved, imports);
        }
        imports.addTypes();
        return `types.${goTypeName(inst.type)}`;
      }
      case "dictionary_of": {
        const dict = typeInfo as DictionaryOf;
        const keyType = this.goTypeString(dict.key, imports);
        const valueType = this.goTypeString(dict.value, imports);
        return `map[${keyType}]${valueType}`;
      }
      case "array_of": {
        const arr = typeInfo as ArrayOf;
        const elemType = this.goTypeString(arr.value, imports);
        return `[]${elemType}`;
      }
      case "union_of": {
        const union = typeInfo as UnionOf;
        if (union.items.length > 0) {
          return this.goTypeString(union.items[0], imports);
        }
        return "interface{}";
      }
      case "user_defined_value":
        return "interface{}";
      default:
        return "interface{}";
    }
  }

  private renderLiteralValue(
    value: unknown,
    depth: number,
    imports: ImportTracker,
  ): string {
    if (value === null) return "nil";
    if (typeof value === "string") return `"${this.escapeGoString(value)}"`;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]interface{}{}";
      const elements = value.map(
        (item) =>
          `${indent(depth + 1)}${this.renderLiteralValue(item, depth + 1, imports)},`,
      );
      return `[]interface{}{\n${elements.join("\n")}\n${indent(depth)}}`;
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj);
      if (entries.length === 0) return `map[string]interface{}{}`;
      const lines = entries.map(
        ([k, v]) =>
          `${indent(depth + 1)}"${this.escapeGoString(k)}": ${this.renderLiteralValue(v, depth + 1, imports)},`,
      );
      return `map[string]interface{}{\n${lines.join("\n")}\n${indent(depth)}}`;
    }
    return String(value);
  }

  private toGoNumber(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseInt(value, 10) || 0;
    return 0;
  }

  private escapeGoString(s: string): string {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
  }
}
