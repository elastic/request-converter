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
    {{#ifRequestKind "properties"}}
    {{#each this.body}}
    {{alias @key ../this.request.body.properties}}={{{pyprint this}}},
    {{/each}}
    {{else ifRequestKind "value"}}
    {{this.request.body.codegenName}}={{{pyprint this.body}}},
    {{/ifRequestKind}}
)
{{else}}
resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}()
{{/hasArgs}}
{{else}}
resp{{#if @index}}{{@index}}{{/if}} = client.perform_request(
    "{{this.method}}",
    "{{this.url}}",
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
