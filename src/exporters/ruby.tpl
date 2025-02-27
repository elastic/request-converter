{{#if complete}}
require "elasticsearch"

client = Elasticsearch::Client.new(
  host: {{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}ENV["ELASTICSEARCH_URL"]{{/if}},
  api_key: ENV["ELASTIC_API_KEY"]
)

{{/if}}
{{#each requests}}
{{#supportedApi}}
{{#hasArgs}}
response{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}(
  {{#each this.params}}
  {{alias @key ../this.request.path}}: "{{{this}}}",
  {{/each}}
  {{#each this.query}}
  {{alias @key ../this.request.query}}: {{{rubyprint this}}},
  {{/each}}
  {{#if this.body}}
  body: {{{rubyprint this.body}}}
  {{/if}}
)
{{else}}
response{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}
{{/hasArgs}}
{{else}}
response{{#if @index}}{{@index}}{{/if}} = client.perform_request(
  "{{this.method}}",
  "{{this.path}}",
  {{#if this.query}}
  params: {{{rubyprint this.query}}},
  {{/if}}
  {{#if this.body}}
  headers: { "Content-Type": "application/json" },
  body: {{{rubyprint this.body}}},
  {{/if}}
)
{{/supportedApi}}
{{#if ../printResponse}}
print(resp{{#if @index}}{{@index}}{{/if}})
{{/if}}

{{/each}}
