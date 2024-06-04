# request-converter

Library that converts Elasticsearch requests in Dev Console syntax to other formats.

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
    complete: true,
    elasticsearchUrl: "http://localhost:9200",
  });
  console.log(code);
}

main();
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

When using Node and JavaScript, you can import the `convertRequests` function as
follows:


```typescript
const { convertRequests } = require("@elastic/request-converter");
```

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
