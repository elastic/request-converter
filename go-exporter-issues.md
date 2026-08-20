# Go Exporter Audit Results

Source of truth: the integration sweep in `tests/integration/convert.test.ts`, which
converts all 734 documented schema examples to Go, compiles and runs each against
real `go-elasticsearch` (v9.4) via `tests/integration/run-go.sh`, and asserts the
captured request path/query/body matches the parsed Dev Console request.

Run it with:

```bash
npm run compile-templates && npm run expand-schema && npm run test:setup-go
ONLY_FORMAT=go npx jest tests/integration/convert.test.ts   # omit --bail to see all failures
```

## Current state

561 / 734 examples pass (up from 69 before this audit). The exporter now produces
Go that compiles for the large majority of APIs.

## Fixed in this audit

- **Complete-script wrapper**: handle `err` (`if err != nil { log.Fatalf }`) and use
  `res` (`fmt.Println` or `_ = res`) so generated `main.go` compiles. This was
  breaking every complete script.
- **`user_defined_value` → `json.RawMessage`**: `Metadata` map values and untyped
  range bounds (`UntypedRangeQuery.Gte` etc.) now render as `json.RawMessage(...)`.
- **Numeric widths**: `int` / `int64` / `Float64` distinguished; optional fields use
  `some.Int` / `some.Int64` / `some.Float64`.
- **Optional scalars**: optional `string` / `bool` fields use `some.String` / `some.Bool`.
- **Single value → slice**: a scalar for a `[]T` field renders as `[]T{value}`; the
  `T | T[]` union renders as the slice form.
- **`Script` shortcut + pointer**, **optional enums** (`&pkg.Member`), **field-keyed
  containers** (`TermsQuery` → `map[string]TermsQueryField`).
- **Imports**: dropped the eager `types` import (removed 133 unused-import failures).
- **Path argument order**: required path args are ordered by the URL template
  (`/{index}/_create/{id}`), fixing swapped `index`/`id` on create/delete/index/etc.
- **API package names**: strip underscores (`clear_scroll` → `clearscroll`),
  removing 224 import-resolution failures.
- **Container type names**: rely on `GO_TYPE_RENAMES` instead of a blanket
  `Container`-suffix strip (`ProcessorContainer` is kept, `QueryContainer` → `Query`).
- **Enum member casing**: first-letter-cap only (`view_index_metadata` →
  `Viewindexmetadata`), matching the generator.
- **Query-param enums**: resolve alias/union to the enum and emit members
  (`ExpandWildcards(expandwildcard.All)`).
- **ndjson bodies**: bulk/msearch/mtermvectors render `.Raw(strings.NewReader(...))`.
- **Union-alias bodies**: request types that alias a union (e.g. `createrepository.Request`
  = `types.Repository`) render via `.Raw(...)`.

## Remaining failures (173), by category

These are candidates for future work or `skip.ts` entries. Two kinds:

**Unavoidable typed-client differences** (semantically faithful, byte-different — the
typed client cannot reproduce the shorthand). Same situation the other five clients
document in `tests/integration/skip.ts`:

- Query DSL shorthand canonicalization: `{"term": {"f": "v"}}` sends
  `{"term": {"f": {"value": "v"}}}` (typed structs have no shortcut marshaling). (~13)
- Settings represented as `*string`: numeric/boolean inputs send as strings
  (`number_of_shards: "1"`). (~30)
- `typed_keys=true` auto-added to search-family requests. (~12)

**Exporter gaps** (fixable, not yet handled):

- Flattened dotted setting keys (`index.number_of_replicas`) rendered as invalid
  struct field names.
- Dictionary bodies with arbitrary keys rendered as struct fields.
- Per-API field aliases/`codegenName` not applied (`mtermvectors`, `ReindexSource`,
  `getinfluencers`, `FunctionScoreQuery`, `SearchApplicationTemplate`).
- Numeric query params typed as `string` in go-es (`requests_per_second`).
- `IndexSettings` variant bodies (`put_settings`), `BinaryProperty` mapping selection.
- Endpoints absent from go-elasticsearch (removed sample-config APIs) → `skip.ts`.
- Unsupported request shapes (`function_score` single-function shorthand, deprecated
  `from`/`to` range, `saml_complete_logout`).
