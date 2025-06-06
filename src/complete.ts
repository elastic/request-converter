import { httpMethods, spec, getAPI } from "./parse";
import { Interface, InstanceOf, Property, TypeDefinition } from "./metamodel";
import { parse } from "./es_parser";

/**
 * @ignore
 */
export type Completion = {
  replace: string;
  insert: string;
  extraBeforeCursor?: string;
  extraAfterCursor?: string;
};

/**
 * @ignore
 * This function is not part of the official API of this library and can change
 * or disappear at any time. Use at your own risk!
 */
export async function getCompletions(source: string): Promise<Completion[]> {
  if (source.trim() === "") {
    return [];
  }
  source = source.replace(/^#.*$/gm, "\n"); // remove comments

  let parsed;
  try {
    parsed = parse(source);
  } catch {
    return [];
  }
  const [parsedMethod, parsedUrl, parsedBody] = parsed.slice(-1)[0];
  let matches: Completion[] = [];

  if (parsedUrl === undefined && parsedBody === undefined) {
    // complete HTTP method
    const partialMethod = parsedMethod.toUpperCase();
    matches = httpMethods
      .filter((method) => method.startsWith(partialMethod))
      .map((method) => ({
        replace: partialMethod,
        insert: method.slice(partialMethod.length) + " ",
      }));
  } else if (!!parsedUrl && parsedBody === undefined) {
    // complete the URL
    const urlParts = parsedUrl.split("?");
    if (urlParts.length === 1) {
      // complete the URL path
      const method = parsedMethod.toUpperCase();
      for (const endpoint of spec.endpoints) {
        for (const url of endpoint.urls) {
          const { path, methods } = url;
          if (methods.includes(method)) {
            const typedSegments = parsedUrl.split("/");
            const segments = path.split("/");
            if (segments.length >= typedSegments.length) {
              let match = true;
              // compare all path segments except the last one
              let i = 0;
              for (; i < typedSegments.length - 1; i++) {
                if (segments[i].startsWith("{")) {
                  if (!typedSegments[i].startsWith("_")) {
                    continue;
                  }
                  match = false;
                  break;
                } else if (segments[i] !== typedSegments[i]) {
                  match = false;
                  break;
                }
              }
              if (match) {
                // compare the last path segment
                if (segments[i].startsWith("{")) {
                  if (!typedSegments[i].startsWith("_")) {
                    if (typedSegments[i] !== "") {
                      matches.push({
                        replace: parsedUrl,
                        insert:
                          "/" + segments.slice(typedSegments.length).join("/"),
                      });
                    } else {
                      matches.push({
                        replace: parsedUrl,
                        insert:
                          segments[i] +
                          "/" +
                          segments.slice(typedSegments.length).join("/"),
                      });
                    }
                  }
                } else {
                  if (segments[i].startsWith(typedSegments[i])) {
                    matches.push({
                      replace: parsedUrl,
                      insert:
                        segments[i].slice(typedSegments[i].length) +
                        (segments.length > typedSegments.length
                          ? "/" + segments.slice(typedSegments.length).join("/")
                          : ""),
                    });
                  }
                }
              }
            }
          }
        }
      }
    } else if (urlParts.length === 2) {
      // complete the URL query string
      const api = await getAPI(parsedMethod.toUpperCase(), urlParts[0]);
      if (api) {
        const req = api.handler.request;
        const props = api.handler.request.query.map((q) => {
          return { name: q.name, values: ["true", "false"] };
        });
        if (req.attachedBehaviors) {
          // handle attached behaviors manually as a special case
          for (const behavior of req.attachedBehaviors) {
            if (behavior === "CommonQueryParameters") {
              props.push({ name: "error_trace", values: ["true", "false"] });
              props.push({ name: "filter_path", values: [] });
              props.push({ name: "human", values: ["true", "false"] });
              props.push({ name: "pretty", values: ["true", "false"] });
            } else if (behavior === "CommonCatQueryParameters") {
              props.push({
                name: "format",
                values: ["text", "json", "cbor", "yaml", "smile"],
              });
              props.push({ name: "help", values: ["true", "false"] });
              props.push({ name: "v", values: ["true", "false"] });
            }
          }
        }

        const queryParts = urlParts[1].split("&").map((q) => q.split("="));
        const lastQuery = queryParts[queryParts.length - 1][0];
        if (queryParts[queryParts.length - 1].length == 1) {
          // complete a query string property name
          matches = props
            .map((p) => p.name)
            .filter((p) => p.startsWith(lastQuery))
            .map((p) => {
              return {
                replace: lastQuery,
                insert: p.slice(lastQuery.length),
              };
            });
          // remove any query parameters already used from the matches
          const previousQueries = queryParts.slice(0, -1).map((p) => p[0]);
          matches = matches.filter(
            (m) => !previousQueries.includes(m.replace + m.insert),
          );
        } else {
          // complete a query string property value
          const lastValue = queryParts[queryParts.length - 1][1];
          let values: string[] = [];
          for (const p of props) {
            if (p.name === lastQuery) {
              values = p.values;
              break;
            }
          }
          matches = values
            .filter((v) => v.startsWith(lastValue))
            .map((v) => {
              return {
                replace: lastValue,
                insert: v.slice(lastValue.length),
              };
            });
        }
      }
    }
  } else if (!!parsedUrl && !!parsedBody) {
    // complete the request body
    const api = await getAPI(parsedMethod.toUpperCase(), parsedUrl);

    // traverse the parsed body to figure out what needs to be completed
    const parents: string[] = []; // the parents of the item to be completed
    let siblings: string[] = []; // the previous siblings of the item to be completed
    let lastToken: string = "{";
    let inArray = false;
    let complete: "key" | "value" = "key";
    let tokens: any[] = parsedBody; // eslint-disable-line @typescript-eslint/no-explicit-any
    let i = 1;
    while (i < tokens.length) {
      if (Array.isArray(tokens[i])) {
        if (tokens[i][0] === "{") {
          // this is an object
          if (i === tokens.length - 1) {
            // if this is the last item at this level then the item that needs
            // completion is inside, which means we have to descend into it.
            // (we skip objects that are not at the end of the parsing)
            if (siblings.length) {
              parents.push(siblings.slice(-1)[0]);
            }
            siblings = [];
            tokens = tokens[i];
            i = 0;
            complete = "key";
            inArray = false;
          }
        } else if (tokens[i][0] === "[") {
          // this is an array
          if (i === tokens.length - 1) {
            // if this is the last item at this level then the item that needs
            // completion is inside, which means we have to descend into it.
            // (we skip arrays that are not at the end of the parsing)
            if (siblings.length) {
              parents.push(siblings.slice(-1)[0] + "[]");
            }
            siblings = [];
            tokens = tokens[i];
            i = 0;
            complete = "value";
            inArray = true;
          }
        }
      } else if (tokens[i] === ":") {
        siblings.push(lastToken.slice(1, -1));
        complete = "value";
      } else if (tokens[i] === ",") {
        if (inArray) {
          complete = "value";
        } else {
          complete = "key";
        }
      }
      lastToken = tokens[i];
      if (lastToken === "," || lastToken === ":") {
        lastToken = "";
      }
      i += 1;
    }

    // helper function that returns a type from the spec
    const getType = (
      name: string,
      namespace: string,
    ): TypeDefinition | undefined => {
      for (const type of spec.types) {
        if (type.name.name === name && type.name.namespace === namespace) {
          return type;
        }
      }
    };

    // helper function that returns the properties of an interface
    const getInterfaceProperties = (
      name: string,
      namespace: string,
    ): Property[] => {
      let props: Property[] = [];
      const type = getType(name, namespace);
      if (type?.kind === "interface") {
        let i = type as Interface;
        props = [...i.properties];
        while (i.inherits) {
          i = getType(
            i.inherits.type.name,
            i.inherits.type.namespace,
          ) as Interface;
          props = [...props, ...i.properties];
        }
      }
      // TODO current unsupported
      // - type_alias
      return props;
    };

    // figure out the type that we need to autocomplete
    // first we determine the top-level list of properties for the request body
    const type = api.handler.request.body;
    let properties: Property[] = [];
    if (type.kind === "value" && type.value.kind === "instance_of") {
      properties = getInterfaceProperties(
        (type.value as InstanceOf).type.name,
        (type.value as InstanceOf).type.namespace,
      );
    } else if (type.kind === "properties") {
      properties = type.properties;
    }
    // then we traverse the list of parent properties while keeping track of
    // the types
    let skipNext = false; // true while parsing "dictionary_of" entries with keys that are arbitrary names
    for (const parent of parents) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      let prop = undefined;
      const parentName = parent.split("[]")[0];
      const isArray = parent.endsWith("[]");
      for (const p of properties) {
        if (p.name === parentName) {
          prop = p;
          break;
        }
      }
      if (prop) {
        properties = [];
        if (prop.type.kind === "instance_of") {
          properties = getInterfaceProperties(
            prop.type.type.name,
            prop.type.type.namespace,
          );
        } else if (prop.type.kind === "array_of" && isArray) {
          if (prop.type.value.kind === "instance_of") {
            properties = getInterfaceProperties(
              prop.type.value.type.name,
              prop.type.value.type.namespace,
            );
          }
        } else if (prop.type.kind === "dictionary_of") {
          if (prop.type.value.kind === "instance_of") {
            // this is a dictionary
            // we skip the next parent, since it is a key that represents an arbitrary name
            // and we calculate the properties of the value associated with this name
            skipNext = true;
            properties = getInterfaceProperties(
              (prop.type.value as InstanceOf).type.name,
              (prop.type.value as InstanceOf).type.namespace,
            );
          }
        } else if (prop.type.kind === "union_of") {
          // the only case of unions that is currently supported is when the
          // union is in the form "type | type[]"
          if (
            prop.type.items.length === 2 &&
            prop.type.items[0].kind === "instance_of" &&
            prop.type.items[1].kind === "array_of" &&
            prop.type.items[1].value.kind === "instance_of" &&
            prop.type.items[0].type.name ===
              prop.type.items[1].value.type.name &&
            prop.type.items[0].type.namespace ===
              prop.type.items[1].value.type.namespace
          ) {
            properties = getInterfaceProperties(
              prop.type.items[0].type.name,
              prop.type.items[0].type.namespace,
            );
          }
        }
        // TODO currently unsupported:
        // - union_of
      }
    }

    // parse the term that needs to be completed
    if (complete === "key" && lastToken.startsWith('"') && !skipNext) {
      // complete a property name (left side)
      for (const prop of properties) {
        if (
          !siblings.includes(prop.name) &&
          ('"' + prop.name).startsWith(lastToken)
        ) {
          let extraBefore = "";
          let extraAfter = "";
          if (prop.type.kind === "instance_of") {
            // if this is a valid instance with properties, then we add a "{}"
            // value at the end
            const p = getInterfaceProperties(
              prop.type.type.name,
              prop.type.type.namespace,
            );
            if (p.length) {
              extraBefore = "{";
              extraAfter = "}";
            }
          } else if (prop.type.kind === "dictionary_of") {
            // for a dictionary value we add "{}" at the end
            extraBefore = "{";
            extraAfter = "}";
          } else if (prop.type.kind === "array_of") {
            // for an array we add "[]" at the end
            extraBefore = "[";
            extraAfter = "]";
          } else if (prop.type.kind === "union_of") {
            if (
              prop.type.items.length === 2 &&
              prop.type.items[0].kind === "instance_of" &&
              prop.type.items[1].kind === "array_of" &&
              prop.type.items[1].value.kind === "instance_of" &&
              prop.type.items[0].type.name ===
                prop.type.items[1].value.type.name &&
              prop.type.items[0].type.namespace ===
                prop.type.items[1].value.type.namespace
            ) {
              // for a union of type | type[] we prefer the array form
              extraBefore = "[{";
              extraAfter = "}]";
            }
          }
          matches.push({
            replace: lastToken, // skip the starting quote
            insert: prop.name.slice(lastToken.length - 1) + '"',
            extraBeforeCursor: ": " + extraBefore,
            extraAfterCursor: extraAfter,
          });
        }
      }
    } else if (complete === "value") {
      // complete a property value (right side of object or array element)
      const prop = properties.filter(
        (p) => siblings[siblings.length - 1] === p.name,
      )[0];
      const values = [];
      if (prop && prop.type.kind === "instance_of") {
        if (
          prop.type.type.name === "boolean" &&
          prop.type.type.namespace === "_builtins"
        ) {
          values.push("true");
          values.push("false");
        } else {
          const type = getType(prop.type.type.name, prop.type.type.namespace);
          if (type && type.kind === "enum") {
            for (const m of type.members) {
              values.push('"' + m.name + '"');
            }
          }
        }
      }
      // TODO currently unsupported:
      // - instance_of string
      // - literal_value
      matches = values
        .filter((v) => v.startsWith(lastToken))
        .map((v) => {
          return {
            replace: lastToken,
            insert: v.slice(lastToken.length),
          };
        });
    }
  }

  return matches
    .filter((m) => m.insert !== "")
    .sort((a, b) => (a.replace + a.insert <= b.replace + b.insert ? -1 : 1));
}
