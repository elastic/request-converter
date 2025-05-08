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
$requestFactory = Psr17FactoryDiscovery::findRequestFactory();
{{#if this.body}}
$streamFactory = Psr17FactoryDiscovery::findStreamFactory();
{{/if}}
$request = $requestFactory->createRequest(
    "{{this.method}}",
    "{{{this.url}}}",
);
{{#if this.body}}
$request = $request->withHeader("Content-Type", "application/json");
$request = $request->withBody($streamFactory->createStream(
    json_encode({{{phpprint this.body}}}),
));
{{/if}}
$resp{{#if @index}}{{@index}}{{/if}} = $client->sendRequest($request);
{{/supportedApi}}
{{#if ../printResponse}}
echo $resp{{#if @index}}{{@index}}{{/if}}->asString();
{{/if}}

{{/each}}
