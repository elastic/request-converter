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
{{#if this.body}}
  {{#each this.params}}
  {{@key}}: "{{{this}}}",
  {{/each}}
  {{#each this.query}}
  {{@key}}: {{{rubyprint this}}},
  {{/each}}
  body: {{{rubyprint this.body}}}
{{else}}
  {{#if this.query}}
  {{#each this.params}}
  {{@key}}: "{{{this}}}",
  {{/each}}
  {{#each this.query}}
  {{@key}}: {{{rubyprint this}}}{{#unless @last}},{{/unless}}
  {{/each}}
  {{else}}
  {{#each this.params}}
  {{@key}}: "{{{this}}}"{{#unless @last}},{{/unless}}
  {{/each}}
  {{/if}}
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
  {{{rubyprint this.query}}},
  {{else}}
  {},
  {{/if}}
  {{#if this.body}}
  {{{rubyprint this.body}}},
  { "Content-Type": "application/json" },
  {{/if}}
)
{{/supportedApi}}
{{#if ../printResponse}}
print(resp{{#if @index}}{{@index}}{{/if}})
{{/if}}

{{/each}}
