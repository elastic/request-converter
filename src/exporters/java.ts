import { readFileSync } from "fs";
import path from "path";
import Handlebars from "handlebars";
import { FormatExporter, ConvertOptions } from "../convert";
import { ParsedRequest } from "../parse";
import { Property, TypeDefinition } from "../metamodel";
import { spec } from "../parse";
import "./templates";

type jsontype =
  | number
  | boolean
  | null
  | undefined
  | string
  | jsonarray
  | jsonobject;
interface jsonarray extends Array<jsontype> {}
interface jsonobject extends Record<string, jsontype> {}

// this regex should match the list of APIs that do not have specific handlers
// in the Python client. APIs in this list are rendered with a perform_request()
// call
const UNSUPPORTED_APIS = new RegExp("^_internal.*$");

export class JavaExporter implements FormatExporter {
  template: Handlebars.TemplateDelegate | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async check(requests: ParsedRequest[]): Promise<boolean> {
    // only return true if all requests are for Elasticsearch
    return requests
      .map((req) => req.service == "es")
      .reduce((prev, curr) => prev && curr, true);
  }

  async convert(
    requests: ParsedRequest[],
    options: ConvertOptions,
  ): Promise<string> {
    if (!(await this.check(requests))) {
      throw new Error("Cannot perform conversion");
    }
    const baseIndent = options.complete ? "            " : "";
    return (await this.getTemplate())({ requests, baseIndent, ...options });
  }

  snakeToCamel(name: string) {
    return name.replace(/_([a-z])/g, (k) => k[1].toUpperCase());
  }

  findType(name: string, namespace: string): TypeDefinition | undefined {
    for (const type of spec.types) {
      if (type.name.name === name && type.name.namespace === namespace) {
        return type;
      }
    }
  }

  findSubProp(name: string, parentProp: Property): Property | undefined {
    if (parentProp.type.kind === "instance_of") {
      let props: Property[] = [];
      const parentType = this.findType(
        parentProp.type.type.name,
        parentProp.type.type.namespace,
      );
      if (parentType?.kind === "interface") {
        props = parentType.properties;
      }
      if (props) {
        for (const prop of props) {
          if (prop.name == name) {
            return prop;
          }
        }
      }
    }
    return undefined;
  }

  javaprint(
    data: jsontype,
    indent: string,
    startIndented: boolean,
    schema?: Property,
  ): string {
    if (typeof data === "number" || typeof data === "boolean") {
      return (startIndented ? indent : "") + String(data);
    } else if (data === null || data === undefined) {
      return (startIndented ? indent : "") + "null";
    } else if (typeof data === "string") {
      // sometimes we get data as string (e.g. in the query string) but the actual type of this data is different
      // if we have a schema for this field we use it to determine the correct type
      if (schema) {
        if (schema.type.kind === "instance_of") {
          if (
            schema.type.type.name === "integer" ||
            schema.type.type.name === "boolean"
          ) {
            return (startIndented ? indent : "") + String(data);
          }
        }
      }
      return (startIndented ? indent : "") + JSON.stringify(data);
    } else if (Array.isArray(data)) {
      // if we have a schema we remove the array part and keep the type of the elements
      if (
        schema &&
        schema.type.kind === "array_of" &&
        schema.type.value.kind === "instance_of"
      ) {
        schema.type = schema.type.value;
      }
      let elements = "";
      for (let i = 0; i < data.length; i++) {
        elements += this.javaprint(data[i], indent, startIndented, schema);
        if (i < data.length - 1) {
          elements += `)\n${indent}    .${this.snakeToCamel(
            schema ? schema.name : "_unknown",
          )}(`;
        }
      }
      return elements;
    } else if (typeof data === "object") {
      // dictionary objects need special handling
      if (schema && schema.type.kind === "dictionary_of") {
        if (schema.type.singleKey) {
          if (
            schema.type.key.kind === "instance_of" &&
            schema.type.key.type.name === "Field" &&
            schema.type.key.type.namespace === "_types"
          ) {
            const field: string = Object.keys(data)[0];
            const newData: Record<string, jsontype> = { field };
            const value = data[field];
            if (typeof value === "object" && value !== null) {
              // for single key dicts with a field as key and an object as value
              // we create a new object that has the original attributes plus the "field" key
              for (const key of Object.keys(value as jsonobject)) {
                newData[key] = (value as jsonobject)[key];
              }
            } else {
              if (schema.type.value.kind === "instance_of") {
                const type = this.findType(
                  schema.type.value.type.name,
                  schema.type.value.type.namespace,
                );
                if (type?.kind === "interface") {
                  if (type.shortcutProperty) {
                    // for single key dicts with a field as key and a non-object as value
                    // representing a shortcut property of an interface, we expand to a
                    // new object with the "field" key and the shortcut property
                    newData[type.shortcutProperty] = data[field];
                  }
                }
              }
            }
            data = newData;
          }
        }
      }
      let elements = "";
      for (const key of Object.keys(data)) {
        const p = this.javaprint(
          data[key] as jsontype,
          indent + "    ",
          false,
          schema ? this.findSubProp(key, schema) : undefined,
        );
        if (p === "") {
          continue;
        }
        elements += `${indent}        .${this.snakeToCamel(key)}(` + p + ")\n";
      }
      let name = "_unknown";
      if (schema) {
        name = `_${this.snakeToCamel(schema.name)}`;
      }
      return (
        (startIndented ? indent : "") +
        `${name} -> ${name}` +
        (elements.length > 0 ? "\n" + elements + indent + "    " : "")
      );
    } else {
      throw new Error(`Unexpected type in JSON payload`);
    }
  }

  async getTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (!this.template) {
      // custom data renderer for Java, using builder syntax
      Handlebars.registerHelper(
        "javaprint",
        (context, name, props, options) => {
          let schema = undefined;
          if (!options) {
            options = name;
            name = undefined;
          } else {
            for (const prop of props) {
              if (prop.name == name) {
                schema = prop;
              }
            }
          }
          return this.javaprint(
            context,
            options.data.root.baseIndent,
            false,
            schema,
          );
        },
      );

      // custom conditional for requests without any arguments
      Handlebars.registerHelper(
        "hasArgs",
        function (this: ParsedRequest, options) {
          if (
            Object.keys(this.params ?? {}).length +
              Object.keys(this.query ?? {}).length +
              Object.keys(this.body ?? {}).length >
            0
          ) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );

      // custom conditional to separate supported vs unsupported APIs
      Handlebars.registerHelper(
        "supportedApi",
        function (this: ParsedRequest, options) {
          if (!UNSUPPORTED_APIS.test(this.api as string) && this.request) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );

      // namespace and endpoint names in Java's camel case syntax
      Handlebars.registerHelper("nsAndApi", (name: string) => {
        const parts = name.split(".").map((p) => this.snakeToCamel(p));
        if (parts.length === 1) {
          return parts[0];
        } else if (parts.length === 2) {
          return `${parts[0]}().${parts[1]}`;
        }
        return name; // unexpected format
      });

      // endpoint name in Java camel case syntax
      Handlebars.registerHelper("api", (name: string) => {
        const parts = name.split(".");
        return this.snakeToCamel(parts[parts.length - 1]);
      });

      // attribute name renderer that considers aliases and code-specific names
      // arguments:
      //   name: the name of the attribute
      //   props: the list of schema properties this attribute belongs to
      Handlebars.registerHelper("alias", (name, props) => {
        /*
        const aliases: Record<string, string> = {
          from: "from_",
          _meta: "meta",
          _field_names: "field_names",
          _routing: "routing",
          _source: "source",
          _source_excludes: "source_excludes",
          _source_includes: "source_includes",

        };
        if (aliases[name]) {
          return aliases[name];
        }
        */
        if (props) {
          for (const prop of props) {
            if (prop.name == name && prop.codegenName != undefined) {
              return prop.codegenName;
            }
          }
        }
        return this.snakeToCamel(
          name.replaceAll("-", "_").replaceAll(".", "_"),
        );
      });

      // custom conditional to check for request body kind
      // the argument can be "properties" or "value"
      Handlebars.registerHelper(
        "ifRequestBodyKind",
        function (this: ParsedRequest, kind: string, options) {
          let bodyKind = this.request?.body?.kind ?? "value";
          const parsedBody = typeof this.body == "object" ? this.body : {};
          if (this.api == "search" && "sub_searches" in parsedBody) {
            // Change the kind of any search requests that use sub-searches to
            // "value", so that the template renders a single body argument
            // instead of expanding the kwargs. This is needed because the
            // Python client does not support "sub_searches" as a kwarg yet.
            bodyKind = "value";
          }
          if (bodyKind == kind) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      );

      if (process.env.NODE_ENV !== "test") {
        this.template = Handlebars.templates["java.tpl"];
      } else {
        // when running tests we read the templates directly, in case the
        // compiled file is not up to date
        const t = readFileSync(path.join(__dirname, "./java.tpl"), "utf-8");
        this.template = Handlebars.compile(t);
      }
    }
    return this.template;
  }
}
