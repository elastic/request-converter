{{#if complete}}
import os
from elasticsearch import Elasticsearch

client = Elasticsearch(
    hosts=[{{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}os.getenv("ELASTICSEARCH_URL"){{/if}}],
    api_key=os.getenv("ELASTIC_API_KEY"),
)

{{/if}}
{{#each requests}}
{{#supportedApi}}
{{#hasArgs}}
resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}(
    {{#each this.params}}
    {{alias @key ../this.request.path}}="{{{this}}}",
    {{/each}}
    {{#each this.query}}
    {{alias @key ../this.request.query}}={{{pyprint this}}},
    {{/each}}
    {{#ifRequestBodyKind "properties"}}
    {{#each this.body}}
    {{alias @key ../this.request.body.properties}}={{{pyprint this}}},
    {{/each}}
    {{else ifRequestBodyKind "value"}}
    {{#if this.request.body.codegenName}}{{this.request.body.codegenName}}{{else}}body{{/if}}={{{pyprint this.body}}},
{{/ifRequestBodyKind}}
)
{{else}}
resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}()
{{/hasArgs}}
{{else}}
resp{{#if @index}}{{@index}}{{/if}} = client.perform_request(
    "{{this.method}}",
    "{{this.path}}",
    {{#if this.query}}
    params={{{pyprint this.query}}},
    {{/if}}
    {{#if this.body}}
    headers={"Content-Type": "application/json"},
    body={{{pyprint this.body}}},
    {{/if}}
)
{{/supportedApi}}
{{#if ../printResponse}}
print(resp{{#if @index}}{{@index}}{{/if}})
{{/if}}

{{/each}}
