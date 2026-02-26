import {
  ValueOf,
  InstanceOf,
  ArrayOf,
  DictionaryOf,
  UnionOf,
  Interface,
  Property,
  Enum,
  TypeAlias,
  TypeName,
} from "../../metamodel";
import { RenderContext } from "./context";
import { toPascalCase, resolveGoFieldName, goTypeName } from "./naming";

export class GoValueRenderer {
  renderGoValue(
    value: unknown,
    typeInfo: ValueOf,
    ctx: RenderContext,
    prop?: Property,
  ): string {
    if (value === null) {
      return "nil";
    }

    switch (typeInfo.kind) {
      case "instance_of":
        return this.renderInstanceOf(value, typeInfo as InstanceOf, ctx, prop);
      case "dictionary_of":
        return this.renderDictionaryOf(value, typeInfo as DictionaryOf, ctx);
      case "array_of":
        return this.renderArrayOf(value, typeInfo as ArrayOf, ctx);
      case "union_of":
        return this.renderUnionOf(value, typeInfo as UnionOf, ctx, prop);
      case "user_defined_value":
        return this.renderLiteralValue(value, ctx);
      case "literal_value":
        return JSON.stringify(value);
      default:
        return this.renderLiteralValue(value, ctx);
    }
  }

  renderStructFields(
    obj: Record<string, unknown>,
    properties: Property[],
    ctx: RenderContext,
  ): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const prop = properties.find(
        (p) => p.name === key || p.aliases?.includes(key),
      );
      const fieldName = resolveGoFieldName(key, properties);
      if (!prop) {
        lines.push(
          `${ctx.indent()}${fieldName}: ${this.renderLiteralValue(
            value,
            ctx,
          )},`,
        );
        continue;
      }
      lines.push(
        `${ctx.indent()}${fieldName}: ${this.renderGoValue(
          value,
          prop.type,
          ctx,
          prop,
        )},`,
      );
    }
    return lines.join("\n");
  }

  renderLiteralValue(value: unknown, ctx: RenderContext): string {
    if (value === null) return "nil";
    if (typeof value === "string") return `"${this.escapeGoString(value)}"`;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]interface{}{}";
      const nested = ctx.nested();
      const elements = value.map(
        (item) => `${nested.indent()}${this.renderLiteralValue(item, nested)},`,
      );
      return `[]interface{}{\n${elements.join("\n")}\n${ctx.indent()}}`;
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj);
      if (entries.length === 0) return `map[string]interface{}{}`;
      const nested = ctx.nested();
      const lines = entries.map(
        ([k, v]) =>
          `${nested.indent()}"${this.escapeGoString(
            k,
          )}": ${this.renderLiteralValue(v, nested)},`,
      );
      return `map[string]interface{}{\n${lines.join("\n")}\n${ctx.indent()}}`;
    }
    return String(value);
  }

  goTypeString(typeInfo: ValueOf, ctx: RenderContext): string {
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
        if (ctx.resolver.isNumericType(inst.type)) return "int";
        if (ctx.resolver.isStringType(inst.type)) return "string";
        const enumType = ctx.resolver.isEnumType(inst.type);
        if (enumType) {
          const enumPkg = inst.type.name.toLowerCase();
          ctx.imports.addEnumPackage(inst.type);
          return `${enumPkg}.${toPascalCase(inst.type.name)}`;
        }
        const typeDef = ctx.resolver.getType(
          inst.type.name,
          inst.type.namespace,
        );
        if (typeDef?.kind === "interface") {
          ctx.imports.addTypes();
          return `types.${goTypeName(inst.type)}`;
        }
        if (typeDef?.kind === "type_alias") {
          const alias = typeDef as TypeAlias;
          if (alias.type.kind === "union_of") {
            const classification = ctx.resolver.classifyUnion(
              alias.type as UnionOf,
            );
            if (classification === "any") {
              ctx.imports.addTypes();
              return `types.${goTypeName(inst.type)}`;
            }
            if (classification === "integer_string") {
              return "string";
            }
          }
        }
        const resolved = ctx.resolver.resolveTypeAlias(typeInfo);
        if (resolved !== typeInfo) {
          return this.goTypeString(resolved, ctx);
        }
        ctx.imports.addTypes();
        return `types.${goTypeName(inst.type)}`;
      }
      case "dictionary_of": {
        const dict = typeInfo as DictionaryOf;
        const keyType = this.goTypeString(dict.key, ctx);
        const valueType = this.goTypeString(dict.value, ctx);
        return `map[${keyType}]${valueType}`;
      }
      case "array_of": {
        const arr = typeInfo as ArrayOf;
        const elemType = this.goTypeString(arr.value, ctx);
        return `[]${elemType}`;
      }
      case "union_of": {
        const union = typeInfo as UnionOf;
        if (union.items.length === 0) return "interface{}";
        const classification = ctx.resolver.classifyUnion(union);
        if (classification === "integer_string") return "string";
        if (classification === "any") return "interface{}";
        return this.goTypeString(union.items[0], ctx);
      }
      case "user_defined_value":
        return "interface{}";
      default:
        return "interface{}";
    }
  }

  toGoNumber(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseInt(value, 10) || 0;
    return 0;
  }

  escapeGoString(s: string): string {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
  }

  private renderInstanceOf(
    value: unknown,
    typeInfo: InstanceOf,
    ctx: RenderContext,
    prop?: Property,
  ): string {
    const { name, namespace } = typeInfo.type;

    if (namespace === "_builtins") {
      return this.renderBuiltin(value, name, ctx);
    }

    if (ctx.resolver.isNumericType(typeInfo.type)) {
      if (prop && !prop.required) {
        ctx.imports.addSome();
        return `some.Int(${this.toGoNumber(value)})`;
      }
      return String(this.toGoNumber(value));
    }

    if (ctx.resolver.isStringType(typeInfo.type)) {
      if (typeof value === "string") {
        return `"${this.escapeGoString(value)}"`;
      }
      return `"${value}"`;
    }

    const enumType = ctx.resolver.isEnumType(typeInfo.type);
    if (enumType) {
      return this.renderEnumValue(value, typeInfo.type, enumType, ctx);
    }

    const resolved = ctx.resolver.resolveTypeAlias(typeInfo);
    if (resolved !== typeInfo) {
      if (resolved.kind === "union_of") {
        const classification = ctx.resolver.classifyUnion(
          resolved as UnionOf,
        );
        if (classification === "integer_string") {
          const strValue = String(value);
          if (prop && !prop.required) {
            ctx.imports.addSome();
            return `some.String("${this.escapeGoString(strValue)}")`;
          }
          return `"${this.escapeGoString(strValue)}"`;
        }
      }
      return this.renderGoValue(value, resolved, ctx, prop);
    }

    const typeDef = ctx.resolver.getType(name, namespace);
    if (!typeDef) {
      return this.renderLiteralValue(value, ctx);
    }

    if (typeDef.kind === "interface") {
      const iface = typeDef as Interface;
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const usePointer = prop && !prop.required;
        const prefix = usePointer ? "&" : "";
        if (iface.variants?.kind === "container") {
          return this.renderContainerVariant(
            value as Record<string, unknown>,
            iface,
            ctx,
            prefix,
          );
        }
        const props = ctx.resolver.getInterfaceProperties(name, namespace);
        const goName = goTypeName(typeInfo.type);
        ctx.imports.addTypes();
        const nested = ctx.nested();
        const fields = this.renderStructFields(
          value as Record<string, unknown>,
          props,
          nested,
        );
        if (!fields.trim()) {
          return `${prefix}types.${goName}{}`;
        }
        return `${prefix}types.${goName}{\n${fields}\n${ctx.indent()}}`;
      }
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        if (iface.shortcutProperty) {
          const shortcutProp = ctx.resolver
            .getInterfaceProperties(name, namespace)
            .find((p) => p.name === iface.shortcutProperty);
          if (shortcutProp) {
            const goName = goTypeName(typeInfo.type);
            const fieldName = resolveGoFieldName(
              iface.shortcutProperty,
              ctx.resolver.getInterfaceProperties(name, namespace),
            );
            const nested = ctx.nested();
            const renderedVal = this.renderGoValue(
              value,
              shortcutProp.type,
              nested,
            );
            ctx.imports.addTypes();
            return `types.${goName}{${fieldName}: ${renderedVal}}`;
          }
        }
        return this.renderLiteralValue(value, ctx);
      }
    }

    return this.renderLiteralValue(value, ctx);
  }

  private renderBuiltin(
    value: unknown,
    name: string,
    ctx: RenderContext,
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
        return this.renderLiteralValue(value, ctx);
    }
  }

  private renderContainerVariant(
    obj: Record<string, unknown>,
    iface: Interface,
    ctx: RenderContext,
    prefix: string,
  ): string {
    const props = ctx.resolver.getInterfaceProperties(
      iface.name.name,
      iface.name.namespace,
    );
    const goName = goTypeName(iface.name);
    ctx.imports.addTypes();

    const additionalProp = ctx.resolver.getAdditionalPropertyBehavior(iface);

    const knownEntries: Record<string, unknown> = {};
    const additionalEntries: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const isKnown = props.some(
        (p) => p.name === key || p.aliases?.includes(key),
      );
      if (isKnown) {
        knownEntries[key] = value;
      } else if (additionalProp) {
        additionalEntries[key] = value;
      } else {
        knownEntries[key] = value;
      }
    }

    const nested = ctx.nested();
    const lines: string[] = [];

    const knownFields = this.renderStructFields(knownEntries, props, nested);
    if (knownFields.trim()) {
      lines.push(knownFields);
    }

    if (
      additionalProp &&
      Object.keys(additionalEntries).length > 0
    ) {
      const keyType = this.goTypeString(additionalProp.key, ctx);
      const valueType = this.goTypeString(additionalProp.value, ctx);
      const mapNested = nested.nested();
      const mapEntries: string[] = [];
      for (const [k, v] of Object.entries(additionalEntries)) {
        const renderedValue = this.renderGoValue(
          v,
          additionalProp.value,
          mapNested,
        );
        mapEntries.push(
          `${mapNested.indent()}"${this.escapeGoString(k)}": ${renderedValue},`,
        );
      }
      const mapLiteral = `map[${keyType}]${valueType}{\n${mapEntries.join(
        "\n",
      )}\n${nested.indent()}}`;
      lines.push(`${nested.indent()}${goName}: ${mapLiteral},`);
    }

    if (lines.length === 0) {
      return `${prefix}types.${goName}{}`;
    }
    return `${prefix}types.${goName}{\n${lines.join("\n")}\n${ctx.indent()}}`;
  }

  private renderDictionaryOf(
    value: unknown,
    typeInfo: DictionaryOf,
    ctx: RenderContext,
  ): string {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return this.renderLiteralValue(value, ctx);
    }

    const obj = value as Record<string, unknown>;
    const keyType = this.goTypeString(typeInfo.key, ctx);
    const valueType = this.goTypeString(typeInfo.value, ctx);

    const nested = ctx.nested();
    const entries: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const renderedValue = this.renderGoValue(v, typeInfo.value, nested);
      entries.push(
        `${nested.indent()}"${this.escapeGoString(k)}": ${renderedValue},`,
      );
    }

    if (entries.length === 0) {
      return `map[${keyType}]${valueType}{}`;
    }
    return `map[${keyType}]${valueType}{\n${entries.join(
      "\n",
    )}\n${ctx.indent()}}`;
  }

  private renderArrayOf(
    value: unknown,
    typeInfo: ArrayOf,
    ctx: RenderContext,
  ): string {
    if (!Array.isArray(value)) {
      return this.renderGoValue(value, typeInfo.value, ctx);
    }

    const elemType = this.goTypeString(typeInfo.value, ctx);
    const nested = ctx.nested();
    const elements: string[] = [];
    for (const item of value) {
      elements.push(
        `${nested.indent()}${this.renderGoValue(
          item,
          typeInfo.value,
          nested,
        )},`,
      );
    }

    if (elements.length === 0) {
      return `[]${elemType}{}`;
    }
    return `[]${elemType}{\n${elements.join("\n")}\n${ctx.indent()}}`;
  }

  private renderUnionOf(
    value: unknown,
    typeInfo: UnionOf,
    ctx: RenderContext,
    prop?: Property,
  ): string {
    const classification = ctx.resolver.classifyUnion(typeInfo);
    if (classification === "integer_string") {
      const strValue = String(value);
      if (prop && !prop.required) {
        ctx.imports.addSome();
        return `some.String("${this.escapeGoString(strValue)}")`;
      }
      return `"${this.escapeGoString(strValue)}"`;
    }

    if (typeInfo.items.length === 2) {
      const [a, b] = typeInfo.items;
      if (
        a.kind === "instance_of" &&
        b.kind === "array_of" &&
        b.value.kind === "instance_of" &&
        (a as InstanceOf).type.name ===
          ((b as ArrayOf).value as InstanceOf).type.name
      ) {
        if (Array.isArray(value)) {
          return this.renderArrayOf(value, b as ArrayOf, ctx);
        }
        return this.renderGoValue(value, a, ctx, prop);
      }
    }

    for (const item of typeInfo.items) {
      if (item.kind === "instance_of") {
        const inst = item as InstanceOf;
        if (typeof value === "string" && ctx.resolver.isStringType(inst.type)) {
          return this.renderGoValue(value, item, ctx);
        }
        if (
          typeof value === "number" &&
          ctx.resolver.isNumericType(inst.type)
        ) {
          return this.renderGoValue(value, item, ctx);
        }
        if (
          typeof value === "boolean" &&
          ctx.resolver.isBooleanType(inst.type)
        ) {
          return this.renderGoValue(value, item, ctx);
        }
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          const typeDef = ctx.resolver.getType(
            inst.type.name,
            inst.type.namespace,
          );
          if (typeDef?.kind === "interface") {
            return this.renderGoValue(value, item, ctx);
          }
        }
      }
      if (item.kind === "array_of" && Array.isArray(value)) {
        return this.renderArrayOf(value, item as ArrayOf, ctx);
      }
    }

    return this.renderLiteralValue(value, ctx);
  }

  private renderEnumValue(
    value: unknown,
    typeName: TypeName,
    enumType: Enum,
    ctx: RenderContext,
  ): string {
    const strValue = String(value);
    const member = enumType.members.find(
      (m) =>
        m.name === strValue ||
        m.aliases?.includes(strValue) ||
        m.name.toLowerCase() === strValue.toLowerCase(),
    );
    if (member) {
      ctx.imports.addEnumPackage(typeName);
      const enumPkg = typeName.name.toLowerCase();
      return `${enumPkg}.${toPascalCase(member.name)}`;
    }
    return `"${this.escapeGoString(strValue)}"`;
  }
}
