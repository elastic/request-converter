{{#if complete}}
from elasticsearch import Elasticsearch

client = Elasticsearch(
    hosts=[{{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}os.getenv("ELASTICSEARCH_URL"){{/if}}],
    api_key=os.getenv("ELASTIC_API_KEY"),
)

{{/if}}
{{#each requests}}
{{#hasArgs this}}
resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}(
    {{#each this.params}}
    {{alias @key}}="{{this}}",
    {{/each}}
    {{#each this.query}}
    {{alias @key}}="{{this}}",
    {{/each}}
    {{#each this.body}}
    {{alias @key}}={{{json this}}},
    {{/each}}
)
{{else}}
resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}()
{{/hasArgs}}
{{#if ../printResponse}}
print(resp{{#if @index}}{{@index}}{{/if}})
{{/if}}

{{/each}}
