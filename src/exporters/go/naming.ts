import { Property, TypeName } from "../../metamodel";
import { GO_TYPE_RENAMES } from "./constants";

export function toPascalCase(name: string): string {
  return name
    .split("_")
    .map((part) => {
      if (part.length === 0) return "";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

export function apiToGoMethod(api: string): {
  subclient: string;
  method: string;
} {
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

export function resolveGoFieldName(name: string, props?: Property[]): string {
  if (props) {
    for (const prop of props) {
      if (prop.name === name || prop.aliases?.includes(name)) {
        if (prop.codegenName != undefined) {
          return toPascalCase(prop.codegenName);
        }
        const canonical = prop.name;
        if (canonical.startsWith("_")) {
          return toPascalCase(canonical.slice(1)) + "_";
        }
        return toPascalCase(canonical);
      }
    }
  }
  if (name.startsWith("_")) {
    return toPascalCase(name.slice(1)) + "_";
  }
  return toPascalCase(name);
}

export function goTypeName(typeName: TypeName): string {
  const nsMap = GO_TYPE_RENAMES[typeName.namespace];
  if (nsMap) {
    const renamed = nsMap[typeName.name];
    if (renamed) return renamed;
  }
  let name = toPascalCase(typeName.name);
  if (name.endsWith("Container")) {
    name = name.slice(0, -"Container".length);
  }
  return name;
}

export function indent(depth: number): string {
  return "    ".repeat(depth);
}
