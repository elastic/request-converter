import { readFile } from "fs/promises";
import path from "path";
import {
  Model,
  TypeDefinition,
  Interface,
  Property,
  ValueOf,
  InstanceOf,
  TypeAlias,
  Enum,
  TypeName,
} from "../../metamodel";
import { NUMERIC_TYPES, STRING_ALIAS_TYPES } from "./constants";

const isBrowser = typeof window !== "undefined";

let cachedResolver: TypeResolver | undefined;

export class TypeResolver {
  constructor(private readonly schema: Model) {}

  static async load(): Promise<TypeResolver> {
    if (cachedResolver) return cachedResolver;
    if (isBrowser) {
      throw new Error("Go expanded specification is not available in browser");
    }
    const schemaPath = path.join(__dirname, "../../schema-no-generics.json");
    const schema = JSON.parse(
      await readFile(schemaPath, { encoding: "utf-8" }),
    ) as Model;
    cachedResolver = new TypeResolver(schema);
    return cachedResolver;
  }

  getType(name: string, namespace: string): TypeDefinition | undefined {
    for (const type of this.schema.types) {
      if (type.name.name === name && type.name.namespace === namespace) {
        return type;
      }
    }
    return undefined;
  }

  getInterfaceProperties(name: string, namespace: string): Property[] {
    let props: Property[] = [];
    const type = this.getType(name, namespace);
    if (type?.kind === "interface") {
      let i = type as Interface;
      props = [...i.properties];
      while (i.inherits) {
        const parent = this.getType(
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

  isNumericType(typeName: TypeName): boolean {
    if (typeName.namespace === "_builtins" && typeName.name === "number") {
      return true;
    }
    if (typeName.namespace === "_types" && NUMERIC_TYPES.has(typeName.name)) {
      return true;
    }
    return false;
  }

  isBooleanType(typeName: TypeName): boolean {
    return typeName.namespace === "_builtins" && typeName.name === "boolean";
  }

  isStringType(typeName: TypeName): boolean {
    if (typeName.namespace === "_builtins" && typeName.name === "string") {
      return true;
    }
    if (
      typeName.namespace === "_types" &&
      STRING_ALIAS_TYPES.has(typeName.name)
    ) {
      return true;
    }
    const type = this.getType(typeName.name, typeName.namespace);
    if (type?.kind === "type_alias") {
      const alias = type as TypeAlias;
      if (alias.type.kind === "instance_of") {
        return this.isStringType((alias.type as InstanceOf).type);
      }
    }
    return false;
  }

  isEnumType(typeName: TypeName): Enum | undefined {
    const type = this.getType(typeName.name, typeName.namespace);
    if (type?.kind === "enum") {
      return type as Enum;
    }
    if (type?.kind === "type_alias") {
      const alias = type as TypeAlias;
      if (alias.type.kind === "instance_of") {
        return this.isEnumType((alias.type as InstanceOf).type);
      }
    }
    return undefined;
  }

  resolveTypeAlias(typeInfo: ValueOf): ValueOf {
    if (typeInfo.kind === "instance_of") {
      const inst = typeInfo as InstanceOf;
      const type = this.getType(inst.type.name, inst.type.namespace);
      if (type?.kind === "type_alias") {
        return (type as TypeAlias).type;
      }
    }
    return typeInfo;
  }
}
