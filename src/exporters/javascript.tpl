{{#if complete}}
const { Client } = require("@elastic/elasticsearch")

const client = new Client({
  nodes: [{{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}process.env["ELASTICSEARCH_URL"]{{/if}}],
  auth: {
    apiKey: process.env["ELASTIC_API_KEY"]
  },
})

{{/if}}
{{#each requests}}
{{#supportedApi}}
{{#hasArgs}}
const response{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}({
  {{#each this.params}}
  {{alias @key ../this.request.path}}: "{{{this}}}",
  {{/each}}
  {{#each this.query}}
  {{alias @key ../this.request.query}}: {{{this}}},
  {{/each}}
  {{#each this.body}}
  {{alias @key ../this.request.body.properties}}: {{{json this}}},
  {{/each}}
})
{{else}}
const response{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}()
{{/hasArgs}}
{{else}}
const response{{#if @index}}{{@index}}{{/if}} = client.transport.request({
  method: "{{this.method}}",
  path: "{{this.path}}",
  {{#if this.query}}
  querystring: {{{json this.query}}},
  {{/if}}
  {{#if this.body}}
  body: {{{json this.body}}},
  {{/if}}
})
{{/supportedApi}}
{{#if ../printResponse}}
console.log(response{{#if @index}}{{@index}}{{/if}})
{{/if}}

{{/each}}
