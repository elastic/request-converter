{{#if complete}}
<?php

require(__DIR__ . "/vendor/autoload.php");

use Elastic\Elasticsearch\ClientBuilder;

$client = ClientBuilder::create()
    ->setHosts([{{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}getenv("ELASTICSEARCH_URL"){{/if}}])
    ->setApiKey(getenv("ELASTIC_API_KEY"))
    ->build();

{{/if}}
{{#each requests}}
{{#supportedApi}}
{{#hasArgs}}
$resp{{#if @index}}{{@index}}{{/if}} = $client->{{this.api}}([
    {{#each this.params}}
    "{{alias @key ../this.request.path}}" => "{{{this}}}",
    {{/each}}
    {{#each this.query}}
    "{{alias @key ../this.request.query}}" => {{{phpprint this}}},
    {{/each}}
    {{#ifRequestBodyKind "properties"}}
    {{#each this.body}}
    "{{alias @key ../this.request.body.properties}}" => {{{phpprint this}}},
    {{/each}}
    {{else ifRequestBodyKind "value"}}
    {{#if this.request.body.codegenName}}{{this.request.body.codegenName}}{{else}}body{{/if}}={{{phprint this.body}}},
{{/ifRequestBodyKind}}
]);
{{else}}
$resp{{#if @index}}{{@index}}{{/if}} = $client->{{this.api}}();
{{/hasArgs}}
{{else}}
$resp{{#if @index}}{{@index}}{{/if}} = $client->perform_request(
    "{{this.method}}",
    "{{this.path}}",
    {{#if this.query}}
    params={{{phprint this.query}}},
    {{/if}}
    {{#if this.body}}
    headers={"Content-Type": "application/json"},
    body={{{phprint this.body}}},
    {{/if}}
);
{{/supportedApi}}
{{#if ../printResponse}}
echo $resp{{#if @index}}{{@index}}{{/if}}->asString();
{{/if}}

{{/each}}
{{#if complete}}
?>
{{/if}}
