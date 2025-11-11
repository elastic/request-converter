{{#if complete}}
package com.example;
import java.io.IOException;
import co.elastic.clients.elasticsearch.ElasticsearchClient;

public class App {
    public static void main(String[] args) throws java.io.IOException {
        ElasticsearchClient client = ElasticsearchClient.of(_client -> _client
            .host({{#if elasticsearchUrl}}"{{elasticsearchUrl}}"{{else}}System.getenv("ELASTICSEARCH_URL"){{/if}})
            .apiKey(System.getenv("ELASTIC_API_KEY"))
            .usernameAndPassword("elastic", "xaqafzvl")
        );

        try {
{{/if}}
{{#each requests}}
{{#supportedApi}}
{{#hasArgs}}
{{../baseIndent}}var resp{{#if @index}}{{@index}}{{/if}} = client.{{nsAndApi this.api}}(_{{api this.api}} -> _{{api this.api}}
    {{#each this.params}}
    {{../../baseIndent}}.{{alias @key ../this.request.path}}("{{{this}}}")
    {{/each}}
    {{#each this.query}}
    {{../../baseIndent}}.{{alias @key ../this.request.query}}({{{javaprint this @key ../this.request.query}}})
    {{/each}}
    {{#ifRequestBodyKind "properties"}}
    {{#each this.body}}
    {{../../baseIndent}}.{{alias @key ../this.request.body.properties}}({{{javaprint this @key ../this.request.body.properties}}})
    {{/each}}
    {{else ifRequestBodyKind "value"}}
    {{#if this.request.body.codegenName}}{{this.request.body.codegenName}}{{else}}body{{/if}}={{{javaprint this.body}}},
{{/ifRequestBodyKind}}
{{../baseIndent}});
{{else}}
{{../baseIndent}}var resp{{#if @index}}{{@index}}{{/if}} = client.{{this.api}}();
{{/hasArgs}}
{{else}}
resp{{#if @index}}{{@index}}{{/if}} = client.perform_request(
    "{{this.method}}",
    "{{this.path}}",
    {{#if this.query}}
    params={{{javaprint this.query}}},
    {{/if}}
    {{#if this.body}}
    headers={"Content-Type": "application/json"},
    body={{{javaprint this.body}}},
    {{/if}}
)
{{/supportedApi}}
{{#if ../printResponse}}
{{../baseIndent}}System.out.println(resp{{#if @index}}{{@index}}{{/if}}.toString());
{{/if}}

{{/each}}
{{#if complete}}
        }
        catch(Exception e) {
            System.out.println(e.toString());
        }
        client.close();
    }
}
{{/if}}
