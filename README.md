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

At this time the converter supports `curl`, `python`, `javascript`, `php` and `ruby`. Work is currently in
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

## Development

This section describes routine development tasks.

### Elasticsearch Specification updates

To refresh the specification `schema.json` file, switch to the desired branch (e.g. `9.5`) and then run the command:

```bash
npm run update-schema
```

### Unit tests

To run all the unit tests, use:

```bash
npm run test
```

To start a watcher process that executes tests automatically as source files change, use:

```bash
npm run watch:test
```

### Integration tests

The integration tests run the examples stored in the schema.json file through the conversion process, execute the generated code, capture the requests that the generated code issues, and compare them against the initial examples, with some amount of flexibility due to differences in how each language client interprets requests. This is a fairly complex process that works well for the majority but not all of the examples. Examples that are known to fail can be noted in the `tests/integration/skip.ts` file.

The entire integration test suite runs every Tuesday at 2AM UTC in a GitHub Actions scheduled workflow. It is also possible to trigger a run on demand from the [workflow page](https://github.com/elastic/request-converter/actions/workflows/integration.yml). It currently takes about 5 minutes for the full run, with all the languages running in parallel. A local run with languages running back to back takes can be expected to take 15-20 minutes to complete.

To run the integration tests locally, first install dependencies needed for all supported languages:

```bash
npm run test:setup
```

The setup command is also available separately for each language:

```bash
npm run test:setup-curl
npm run test:setup-python
npm run test:setup-ruby
npm run test:setup-javascript
npm run test:setup-php
```

To run the integration tests for all languages:

```bash
npm run test:integration
```

Or separately for each language:

```bash
npm run test:integration-curl
npm run test:integration-python
npm run test:integration-ruby
npm run test:integration-javascript
npm run test:integration-php
```

It is also possible to run a single test on all available languages:

```bash
npm run test:example CountRequestExample1
```

### Linting

To run the linters:

```bash
npm run lint
npm run prettier
```

To automatically fix issues found by the linters:

```bash
npm run fix
```

### Building

To build the library locally:

```bash
npm run build
```

To delete all the build files:

```bash
npm run clean
```

To build the documentation:

```bash
npm run docs
```

### Releasing

To prepare a release commit, switch to the target branch (e.g. `9.5`) and run:

```bash
npm run release
```

This script could refuse to run in certain situations:

- If the specification's `schema.json` file is not up to date
- If the current branch isn't a releasable branch (e.g. `main`)
- If there are uncommitted changes in the current branch

In these cases, the script will indicate what the problem is and how to address it.

If everything looks all right, the script will propose a version number, which can be accepted or changed. Then it will open your default text editor (set in `$EDITOR`) with generated release notes that can be edited as necessary. Once you exit the editor, the diff for the release changes will be shown. Press `ENTER` to generate a release commit or `Ctrl-C` to abort.

The release commit then needs to be pushed to the upstream repository:

```bash
git push --tags origin $BRANCH
```

Finally, there is a "Publish package to npm" workflow on GitHub Actions that needs to be started to push the release to npm.
