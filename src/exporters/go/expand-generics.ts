/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Ported from elasticsearch-specification/compiler/src/transform/expand-generics.ts
 *
 * Expands all generics by creating new concrete types for every instantiation
 * of a generic type. The resulting model has no generics. Top-level generic
 * parameters (e.g. SearchRequest's TDocument) are replaced by
 * user_defined_value.
 *
 * The Go exporter needs this expanded schema because the go-elasticsearch typed
 * API is generated from the post-expansion spec via elastic-client-generator-go.
 *
 * This runs at runtime (Node and browser) on whatever schema was loaded via
 * `loadSchema()`, so it must stay filesystem-free.
 */
import { Model } from "../../metamodel";

export interface ExpandGenericsConfig {
  unwrappedTypes?: (string | { namespace: string; name: string })[];
  inlinedTypes?: (string | { namespace: string; name: string })[];
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function nameKey(t: any): string {
  if (t.kind !== undefined) {
    return nameKey(t.name);
  }
  return t.namespace + ":" + t.name;
}

function genericParamMapping(generics: any, params: any): Map<string, any> {
  const mapping = new Map<string, any>();
  (generics ?? []).forEach((name: any, i: number) => {
    mapping.set(nameKey(name), params[i]);
  });
  return mapping;
}

function valueTypeName(value: any): string {
  switch (value.kind) {
    case "literal_value":
      return value.value.toString();
    case "user_defined_value":
      return "UserDefined";
    case "array_of":
      return "Array" + valueTypeName(value.value);
    case "dictionary_of":
      return "Dict" + valueTypeName(value.value);
    case "union_of":
      return "Union" + value.items.map((v: any) => valueTypeName(v)).join();
    case "instance_of":
      return value.type.name;
  }
  return "";
}

function sortTypeDefinitions(types: any[]): void {
  types.sort((a, b) => {
    if (a.name.namespace === b.name.namespace) {
      if (a.name.name > b.name.name) return 1;
      if (a.name.name < b.name.name) return -1;
      return 0;
    }
    if (a.name.namespace > b.name.namespace) return 1;
    if (a.name.namespace < b.name.namespace) return -1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Core expansion
// ---------------------------------------------------------------------------

export function expandGenerics(
  inputModel: Model,
  config?: ExpandGenericsConfig,
): Model {
  const typesToUnwrap = new Set<string>();
  const typesToInline = new Set<string>();

  for (const name of config?.unwrappedTypes ?? []) {
    typesToUnwrap.add(typeof name === "string" ? name : nameKey(name));
  }
  for (const name of config?.inlinedTypes ?? []) {
    typesToInline.add(typeof name === "string" ? name : nameKey(name));
  }

  const typesSeen = new Set<string>();
  const types: any[] = [];
  const inputTypeByName = new Map<string, any>();

  for (const type of inputModel.types) {
    inputTypeByName.set(nameKey(type), type);
  }

  function addIfNotSeen(name: any, build: () => any): any {
    const key = nameKey(name);
    if (!typesSeen.has(key)) {
      typesSeen.add(key);
      const type = build();
      type.name = name;
      types.push(type);
    }
    return name;
  }

  function getType(name: any): any {
    const result = inputTypeByName.get(nameKey(name));
    if (result === undefined) {
      throw Error(`Type ${nameKey(name)} does not exist.`);
    }
    return result;
  }

  function expandRootType(name: any): void {
    if (name == null) return;
    const type = getType(name);
    if (type.kind !== "request" && type.kind !== "response") {
      throw Error(`${nameKey(name)} should be a request or a response`);
    }
    const userDefined = { kind: "user_defined_value" };
    const typeParams = (type.generics ?? []).map(() => userDefined);
    expandType(type.name, typeParams);
  }

  function expandType(name: any, params: any): any {
    if (name.namespace === "_builtins") return name;
    const type = getType(name);
    switch (type.kind) {
      case "enum":
        return addIfNotSeen(type.name, () => type);
      case "type_alias":
        return expandTypeAlias(type, params);
      case "request":
        return expandRequest(type, params);
      case "response":
        return expandResponse(type, params);
      case "interface":
        return expandInterface(type, params);
    }
  }

  function addDanglingTypeIfNotSeen(type: any): void {
    switch (type.kind) {
      case "type_alias":
        if (type.generics !== undefined && type.generics.length > 0) return;
        break;
      case "interface":
        if (type.generics !== undefined && type.generics.length > 0) return;
        break;
    }
    addIfNotSeen(type.name, () => type);
  }

  function expandInterface(type: any, params: any): any {
    return addIfNotSeen(expandedName(type, params), () => {
      const result = { ...type };
      const mappings = genericParamMapping(type.generics, params);
      result.inherits = expandInherits(result.inherits, mappings);

      if (result.behaviors != null) {
        result.behaviors.forEach((b: any) => {
          if (b.generics == null) {
            const type = getType(b.type);
            addIfNotSeen(b.type, () => type);
          }
        });
        result.behaviors = result.behaviors.map((b: any) => ({
          type: b.type,
          generics: (b.generics ?? []).map((g: any) =>
            expandValueOf(g, mappings),
          ),
        }));
      }

      result.properties = expandProperties(result.properties, mappings);
      result.generics = undefined;
      return result;
    });
  }

  function expandInherits(inherits: any, mappings: any): any {
    if (inherits == null) return undefined;
    const expanded = expandValueOf(
      {
        kind: "instance_of",
        type: inherits.type,
        generics: inherits.generics,
      },
      mappings,
    );
    return { type: expanded.type, generics: undefined };
  }

  function expandTypeAlias(alias: any, params: any): any {
    return addIfNotSeen(expandedName(alias, params), () => {
      const result = { ...alias };
      result.type = expandValueOf(
        alias.type,
        genericParamMapping(alias.generics, params),
      );
      result.generics = undefined;
      return result;
    });
  }

  function expandRequest(req: any, params: any): any {
    return addIfNotSeen(req.name, () => {
      const mappings = genericParamMapping(req.generics, params);
      const result = { ...req };
      result.inherits = expandInherits(result.inherits, mappings);
      result.path = expandProperties(result.path, mappings);
      result.query = expandProperties(result.query, mappings);
      result.body = expandBody(
        req.body,
        genericParamMapping(req.generics, params),
      );
      result.generics = undefined;
      return result;
    });
  }

  function expandResponse(resp: any, params: any): any {
    return addIfNotSeen(resp.name, () => {
      const result = { ...resp };
      result.body = expandBody(
        resp.body,
        genericParamMapping(resp.generics, params),
      );
      if (resp.exceptions != null) {
        result.exceptions = resp.exceptions.map((exception: any) => ({
          description: exception.description,
          statusCodes: exception.statusCodes,
          body: expandBody(
            exception.body,
            genericParamMapping(resp.generics, params),
          ),
        }));
      }
      result.generics = undefined;
      return result;
    });
  }

  function expandProperties(properties: any, mappings: any): any {
    return properties.map((prop: any) => ({
      ...prop,
      type: expandValueOf(prop.type, mappings),
    }));
  }

  function expandBody(body: any, mappings: any): any {
    switch (body.kind) {
      case "no_body":
        return body;
      case "properties":
        return {
          kind: "properties",
          properties: expandProperties(body.properties, mappings),
        };
      case "value":
        return {
          kind: "value",
          value: expandValueOf(body.value, mappings),
          codegenName: body.codegenName,
        };
    }
  }

  function expandValueOf(value: any, mappings: any): any {
    switch (value.kind) {
      case "array_of":
        return {
          kind: "array_of",
          value: expandValueOf(value.value, mappings),
        };

      case "dictionary_of":
        return {
          kind: "dictionary_of",
          key: expandValueOf(value.key, mappings),
          value: expandValueOf(value.value, mappings),
          singleKey: value.singleKey,
        };

      case "instance_of": {
        const valueOfType = nameKey(value.type);

        if (typesToUnwrap.has(valueOfType)) {
          return expandValueOf(value.generics[0], mappings);
        }

        if (typesToInline.has(valueOfType)) {
          const inlinedTypeDef = inputTypeByName.get(valueOfType);
          if (inlinedTypeDef?.kind !== "type_alias") {
            throw Error(
              `Inlined type ${valueOfType} should be an alias definition`,
            );
          }
          const inlineMappings = new Map<string, any>();
          for (let i = 0; i < (inlinedTypeDef.generics?.length ?? 0); i++) {
            inlineMappings.set(
              nameKey(inlinedTypeDef.generics[i]),
              value.generics[i],
            );
          }
          return expandValueOf(inlinedTypeDef.type, inlineMappings);
        }

        const mapping = mappings.get(nameKey(value.type));
        if (mapping !== undefined) return mapping;

        const params = (value.generics ?? []).map((g: any) =>
          expandValueOf(g, mappings),
        );
        return {
          kind: "instance_of",
          type: expandType(value.type, params),
          generics: undefined,
        };
      }

      case "literal_value":
        return value;

      case "union_of":
        return {
          kind: "union_of",
          items: value.items.map((item: any) => expandValueOf(item, mappings)),
        };

      case "user_defined_value":
        return value;
    }
  }

  function expandedName(type: any, params: any): any {
    let localName = type.name.name;
    type.generics?.forEach((_paramName: any, i: number) => {
      const param = params[i];
      if (param.kind === "user_defined_value") return;
      localName = localName + valueTypeName(params[i]);
    });
    return { namespace: type.name.namespace, name: localName };
  }

  // --- Main expansion loop ---

  for (const endpoint of inputModel.endpoints) {
    expandRootType(endpoint.request);
    expandRootType(endpoint.response);
  }

  for (const type of inputModel.types) {
    addDanglingTypeIfNotSeen(type);
  }

  sortTypeDefinitions(types);

  return {
    _info: inputModel._info,
    endpoints: inputModel.endpoints,
    types: types,
  } as Model;
}
