{{#if complete}}
<?php

require(__DIR__ . "/vendor/autoload.php");

use Elastic\Elasticsearch\ClientBuilder;
{{#needsRequestFactory}}
use Http\Discovery\Psr17FactoryDiscovery;
{{else}}
{{/needsRequestFactory}}

$client = ClientBuilder::create()
    ->setHosts([{{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}getenv("ELASTICSEARCH_URL"){{/if}}])
    ->setApiKey(getenv("ELASTIC_API_KEY"))
    ->build();

{{/if}}
{{#each requests}}
{{#supportedApi}}
{{#hasArgs}}
$resp{{#if @index}}{{@index}}{{/if}} = $client->{{{phpEndpoint this.api}}}([
    {{#each this.params}}
    "{{@key}}" => "{{{this}}}",
    {{/each}}
    {{#each this.query}}
    "{{@key}}" => {{{phpprint this}}},
    {{/each}}
    {{#if this.body}}
    "body" => {{{phpprint this.body}}},
{{/if}}
]);
{{else}}
$resp{{#if @index}}{{@index}}{{/if}} = $client->{{{phpEndpoint this.api}}}();
{{/hasArgs}}
{{else}}
$factory = Psr17FactoryDiscovery::findRequestFactory();
$request = $factory->createRequest(
    "{{this.method}}",
    "{{this.path}}",
    {{#if this.body}}
    ["Content-Type" => "application/json"],
    {{{phpprint this.body}}},
    {{else}}
    [],
    {{/if}}
);
$resp{{#if @index}}{{@index}}{{/if}} = $client->sendRequest($request);
{{/supportedApi}}
{{#if ../printResponse}}
echo $resp{{#if @index}}{{@index}}{{/if}}->asString();
{{/if}}

{{/each}}
