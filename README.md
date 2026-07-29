# request-converter

Library that converts Elasticsearch requests in Dev Console syntax to other formats.

Try it out [here](https://elastic.github.io/request-converter).

## Installation

```bash
npm install @elastic/request-converter
```

## Usage

```typescript
import { convertRequests } from "@elastic/request-converter";

const devConsoleScript = `GET /my-index-000001/_search?from=40&size=20
{
  "query": {
    "term": {
      "user.id": "kimchy"
    }
  }
}`

async function main() {
  const code = await convertRequests(devConsoleScript, "python", {
    checkOnly: false,
    printResponse: true,
    complete: true,
    elasticsearchUrl: "http://localhost:9200",
  });
  console.log(code);
}

main();
```

The list of available formats that can be passed in the second argument can be
obtained as follows:

```typescript
import { listFormats } from "@elastic/request-converter";

const formats = listFormats();
```

The ouput code in the example above would look like this:

```python
import os
from elasticsearch import Elasticsearch

client = Elasticsearch(
    hosts=["http://localhost:9200"],
    api_key=os.getenv("ELASTIC_API_KEY"),
)

resp = client.search(
    index="my-index-000001",
    from_="40",
    size="20",
    query={
        "term": {
            "user.id": "kimchy"
        }
    },
)
```

When using Node and JavaScript, you can import the functions in this library as
follows:


```typescript
const { convertRequests, listFormats } = require("@elastic/request-converter");
```

## Available Formats

At this time the converter supports `curl`, `python`, `javascript`, `php`, `ruby` and `csharp`. Work is currently in
progress to add support for more languages.

### curl

The curl exporter generates commands for the terminal using the
[curl](https://curl.se/) command line HTTP client.

Supported options:

| Option name | Type | Required | Description |
| ----------- | ---- | -------- | ----------- |
| `elasticsearchUrl` | `string` | no | The Elasticsearch endpoint to use in the generated commands. The default is `http://localhost:9200`. |
| `otherUrls` | `Record<string, string>` | no | URLs for other services. For Kibana, use `{kbn: "http://localhost:5601"}` |
| `windows` | `boolean` | no | If `true`, use PowerShell escaping rules for quotes. If `false`, use bash/zsh escaping rules. The default is `false`. |

### python

The Python exporter generates code for the Elasticsearch Python client.

Supported options:

| Option name | Type | Required | Description |
| ----------- | ---- | -------- | ----------- |
| `printResponse` | `boolean` | no | If `true`, add code to print the response. The default is `false`. |
| `complete` | `boolean` | no | If `true`, generate a complete script. If `false`, only generate the request code. The default is `false`. |
| `elasticsearchUrl` | `string` | no | The Elasticsearch endpoint to use. The default is `http://localhost:9200`. |

### javascript

The JavaScript exporter generates code for the Elasticsearch JavaScript client.

Supported options:

| Option name | Type | Required | Description |
| ----------- | ---- | -------- | ----------- |
| `printResponse` | `boolean` | no | If `true`, add code to print the response. The default is `false`. |
| `complete` | `boolean` | no | If `true`, generate a complete script. If `false`, only generate the request code. The default is `false`. |
| `elasticsearchUrl` | `string` | no | The Elasticsearch endpoint to use in the generated commands. The default is `http://localhost:9200`. |

### php

The PHP exporter generates code for the Elasticsearch PHP client.

Supported options:

| Option name | Type | Required | Description |
| ----------- | ---- | -------- | ----------- |
| `printResponse` | `boolean` | no | If `true`, add code to print the response. The default is `false`. |
| `complete` | `boolean` | no | If `true`, generate a complete script. If `false`, only generate the request code. The default is `false`. |
| `elasticsearchUrl` | `string` | no | The Elasticsearch endpoint to use. The default is `http://localhost:9200`. |

### ruby

The Ruby exporter generates code for the Elasticsearch Ruby client.

Supported options:

| Option name | Type | Required | Description |
| ----------- | ---- | -------- | ----------- |
| `printResponse` | `boolean` | no | If `true`, add code to print the response. The default is `false`. |
| `complete` | `boolean` | no | If `true`, generate a complete script. If `false`, only generate the request code. The default is `false`. |
| `elasticsearchUrl` | `string` | no | The Elasticsearch endpoint to use. The default is `http://localhost:9200`. |

### csharp

The C# exporter generates code for the Elasticsearch .NET client. Unlike the
other exporters, code generation runs inside a .NET WASM bundle shipped
separately as the `@elastic/request-converter-dotnet` package, since the .NET
client's code model isn't available in JavaScript. Install it alongside this
package, choosing the major.minor version that matches your target
Elasticsearch version:

```bash
npm install @elastic/request-converter-dotnet@9.4
```

To use a locally built bundle instead (for example while developing the
bundle itself), set the `CSHARP_REQUEST_CONVERTER_BUNDLE` environment
variable to the path of its entry point before running the converter.

Supported options (snake_case, matching the .NET bundle's wire contract):

| Option name | Type | Required | Description |
| ----------- | ---- | -------- | ----------- |
| `syntax_mode` | `string` | no | `"descriptor"` for fluent descriptor chains, or `"object_initializer"` for object initializers. The default is `"descriptor"`. |
| `use_strongly_typed_document` | `boolean` | no | If `true`, field accessors use lambdas on an illustrative document type. The default is `true`. |
| `document_type_name` | `string` | no | The document type name used in generated code. The default is `"MyDocument"`. |
| `type_name_style` | `string` | no | `"Simplified"`, `"Fqn"`, or `"GlobalFqn"` type-name rendering. The default is `"Simplified"`. |
| `debug` | `boolean` | no | If `true`, append converter diagnostics to error messages. The default is `false`. |

## Command-Line Interface

For convenience, a CLI that wraps the `convertRequests` function is also available.

```bash
$ echo GET / > request.txt
$ node_modules/.bin/es-request-converter --format python --complete < request.txt
import os
from elasticsearch import Elasticsearch

client = Elasticsearch(
    hosts=[os.getenv("ELASTICSEARCH_URL")],
    api_key=os.getenv("ELASTIC_API_KEY"),
)

resp = client.info()
```

## Using a Custom Exporter

Instead of passing the name of one of the available exporters, you can pass a
custom exporter instance.

To define a custom exporter format, create a class that implements the
`FormatExporter` interface. Here is an example exporter that outputs the name
of the API used in the request:

```typescript
import { FormatExporter, convertRequests } from "@elastic/request-converter";

class MyExporter implements FormatExporter {
  async check(requests: ParsedRequest[]): Promise<boolean> { return true; }
  async convert(requests: ParsedRequest[], options: ConvertOptions): Promise<string> {
    return requests.map(req => req.api).join("\n");
  }
}

const apis = await convertRequests("GET /my-index/_search\nGET /\n", new MyExporter(), {});
console.log(apis); // outputs "search\ninfo"
```
