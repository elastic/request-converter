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

At this time the converter supports `curl` and `python`. Work is currently in
progress to add support for `javascript`, `ruby` and `php`.

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
