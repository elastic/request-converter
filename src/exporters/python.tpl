{{#if complete}}
import os
from elasticsearch import Elasticsearch

client = Elasticsearch(
    hosts=[{{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}os.getenv("ELASTICSEARCH_URL"){{/if}}],
    api_key=os.getenv("ELASTIC_API_KEY"),
)

{{/if}}
{{#each requests}}
{{#hasArgs}}
resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}(
    {{#each this.params}}
    {{alias @key}}="{{this}}",
    {{/each}}
    {{#each this.query}}
    {{alias @key}}={{{pyprint this}}},
    {{/each}}
    {{#requestKind "properties"}}
    {{#each this.body}}
    {{alias @key}}={{{pyprint this}}},
    {{/each}}
    {{else requestKind "value"}}
    {{this.request.codegenName}}={{{pyprint this.body}}},
    {{/requestKind}}
)
{{else}}
resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}()
{{/hasArgs}}
{{#if ../printResponse}}
print(resp{{#if @index}}{{@index}}{{/if}})
{{/if}}

{{/each}}
