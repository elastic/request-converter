import { httpMethods, spec, getAPI } from "./parse";
import { Interface, InstanceOf, Property } from "./metamodel";

export type Completion = {
  replace: string;
  insert: string;
};

export async function getCompletions(source: string): Promise<Completion[]> {
  let matches: Completion[] = [];

  if (source === "" || source[source.length - 1] === "\n") {
    // beginning of a line => reqturn all HTTP methods
    return httpMethods.map((method) => ({ replace: "", insert: method + " " }));
  }
  const reqLines = source.split("\n");

  // collapse all the lines of the last request into a single line
  let request = reqLines[reqLines.length - 1];
  let i = reqLines.length - 1;
  while (i > 0 && !/^[a-z]+/i.test(request)) {
    i = i - 1;
    request = reqLines[i] + " " + request;
  }
  const parts = request.split(" ");
  if (parts.length === 1) {
    // complete HTTP method
    const partialMethod = parts[0].toUpperCase();
    return httpMethods
      .filter((method) => method.startsWith(partialMethod))
      .map((method) => ({
        replace: partialMethod,
        insert: method.slice(partialMethod.length) + " ",
      }));
  } else if (parts.length === 2 && parts[1] !== "") {
    const urlParts = parts[1].split("?");
    if (urlParts.length === 1) {
      // complete the URL
      const method = parts[0].toUpperCase();
      for (const endpoint of spec.endpoints) {
        for (const url of endpoint.urls) {
          const { path, methods } = url;
          if (methods.includes(method)) {
            const typedSegments = parts[1].split("/");
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
                        replace: parts[1],
                        insert:
                          "/" + segments.slice(typedSegments.length).join("/"),
                      });
                    } else {
                      matches.push({
                        replace: parts[1],
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
                      replace: parts[1],
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
      // complete the query string
      const api = await getAPI(parts[0].toUpperCase(), urlParts[0]);
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
  } else if (parts.length >= 3) {
    // request body
    const [method, url] = request.split(/\s/, 2);
    const api = await getAPI(method.toUpperCase(), url);

    // remove the request header
    let body = request.replace(/^[^{]*\s{/, "{");

    // collapse any complete sub-types and arrays
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let newBody = body.replace(/\[[^{[]*?\]/, "null");
      newBody = newBody.replace(/{[^{[]*?}/, "null");
      if (newBody === body) {
        break;
      }
      body = newBody;
    }

    // obtain the list of parent keys, plus the complete list of keys used in the
    // last level
    const levels = body.split(/[{[]/).map((p) => p.trim());
    const parents = [];
    for (let i = 1; i < levels.length - 1; i++) {
      const parentLhs = levels[i]
        .split(",")
        .map((p) => p.trim().split(":")[0].trim());
      let parent = parentLhs[parentLhs.length - 1];
      if (parent.startsWith('"')) {
        parent = parent.slice(1);
      }
      if (parent.endsWith('"')) {
        parent = parent.slice(0, -1);
      }
      parents.push(parent);
    }

    // figure out the type that we need to autocomplete
    const getInterfaceProperties = (
      name: string,
      namespace: string,
    ): Property[] => {
      for (const type of spec.types) {
        if (type.kind !== "interface") {
          continue;
        }
        const i = type as Interface;
        if (i.name.name === name && i.name.namespace === namespace) {
          return i.properties;
        }
      }
      return [];
    };

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
    // now we traverse the list of parent properties
    for (const parent of parents) {
      let prop = undefined;
      for (const p of properties) {
        if (p.name === parent) {
          prop = p;
          break;
        }
      }
      if (prop) {
        if (prop.type.kind === "instance_of") {
          properties = getInterfaceProperties(
            prop.type.type.name,
            prop.type.type.namespace,
          );
        }
      } else {
        properties = [];
      }
    }

    // parse the term that needs to be completed
    const lastTerm = levels[levels.length - 1].split(",").slice(-1)[0];
    const [left, right] = lastTerm.split(":", 2);
    if (left && right === undefined) {
      // complete a property name (left side)

      for (const prop of properties) {
        if (('"' + prop.name).startsWith(left)) {
          matches.push({
            replace: left.slice(1),
            insert: prop.name.slice(left.length - 1),
          });
        }
      }
    } else if (right !== undefined) {
      // complete a property value (right side)
    }
    //console.log(properties);
    console.log(left, right);
    console.log(matches);
  }
  return matches.sort((a, b) =>
    a.replace + a.insert <= b.replace + b.insert ? -1 : 1,
  );
}

// { "f
// { "foo": "ba
// { "foo": "bar", "ba
// { "foo": "bar", "z": { "y": "w", "v": "u" }, "baz": { "abc": "def", "ghi": { "xx
// "foo": "bar", "z":
// "y": "w", "v": "u" }, "baz":
// "abc": "def", "ghi":
// "xx
