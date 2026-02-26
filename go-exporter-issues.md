# Go Exporter Issues

Comparison of generated output in `go-testing/` against the actual `go-elasticsearch` typed API in `typedapi/`, plus root-cause analysis traced through `elastic-client-generator-go`.

## Summary

| Test | Status | Key Issues |
|------|--------|------------|
| 01 - Info | **OK** | — |
| 02 - Search | **OK** | — |
| 03 - Create Index | **WRONG** | `NumberOfShards`/`NumberOfReplicas` are `*string` not `int`; `Properties` uses wrong map value type and wrong property structs |
| 04 - Aggs | **WRONG** | Go struct field is `Aggregations` not `Aggs`; uses `map[string]interface{}` instead of typed `types.Aggregations` |
| 05 - Bool Query | **WRONG** | Pointer in value slice; wrong `Range` map value type; `Gte`/`Lte` are `json.RawMessage`; `Sort` type completely wrong |
| 06 - Multi Request | **WRONG** | `V()` takes `bool` not `string` |
| 07 - Index Doc | **WRONG** | `index.Request` is `json.RawMessage` not a struct; method is `Id()` not `ID()` |

---

## Detailed Issues

### 03 - Create Index

**Generated:**
```go
Settings: &types.IndexSettings{
    NumberOfShards: 3,
    NumberOfReplicas: 1,
},
Mappings: &types.TypeMapping{
    Properties: map[string]types.BinaryProperty{
        "title": &types.BinaryProperty{ Type: "text" },
        ...
    },
},
```

**Problems:**

1. `IndexSettings.NumberOfShards` is `*string`, not `int`. Should be `some.String("3")`.
2. `IndexSettings.NumberOfReplicas` is `*string`, not `int`. Should be `some.String("1")`.
3. `TypeMapping.Properties` is `map[string]Property` where `Property` is `any`. The output uses `map[string]types.BinaryProperty` which is the wrong map value type.
4. `BinaryProperty` is a specific mapping type for binary fields. Each mapping type has its own struct: `TextProperty`, `DateProperty`, `IntegerNumberProperty`. There is no generic `Type` string field — the struct type itself determines the mapping type.

**Correct approach:**
```go
Properties: map[string]types.Property{
    "title":     types.TextProperty{},
    "timestamp": types.DateProperty{},
    "count":     types.IntegerNumberProperty{},
},
```

### 04 - Aggregations

**Generated:**
```go
Request(&search.Request{
    Size: some.Int(0),
    Aggs: map[string]interface{}{ ... },
})
```

**Problems:**

1. The Go struct field is `Aggregations`, not `Aggs`. (`Aggs` is only a JSON deserialization alias, not the Go field name.)
2. Should use typed `types.Aggregations` struct, not `map[string]interface{}`.

**Correct approach:**
```go
Request(&search.Request{
    Size: some.Int(0),
    Aggregations: map[string]types.Aggregations{
        "status_codes": {
            Terms: &types.TermsAggregation{
                Field: some.String("response.status_code"),
                Size:  some.Int(10),
            },
        },
        "avg_duration": {
            Avg: &types.AverageAggregation{
                Field: some.String("duration"),
            },
        },
    },
})
```

### 05 - Bool Query

**Generated (excerpt):**
```go
Must: []types.Query{
    &types.Query{ Match: ... },
},
Range: map[string]types.UntypedRangeQuery{
    "price": &types.UntypedRangeQuery{ Gte: 10, Lte: 100 },
},
Sort: []string{
    &types.SortOptions{ Price: "asc" },
    "_score",
},
```

**Problems:**

1. `Must`, `Filter`, `Should` are `[]Query` (value slices). Using `&types.Query{...}` produces a pointer — won't compile.
2. `Query.Range` is `map[string]RangeQuery` where `RangeQuery` is `any`. The output uses `map[string]types.UntypedRangeQuery` as the declared map type, which is wrong.
3. `UntypedRangeQuery.Gte` and `.Lte` are `json.RawMessage`, not bare integers. Should be `json.RawMessage("10")`.
4. `Sort` is `[]types.SortCombinations` (where `SortCombinations` is `any`), not `[]string`. The output puts a `&types.SortOptions{}` into a `[]string` which won't compile.
5. `SortOptions` has no `Price` field — custom field sorts go in the `SortOptions map[string]FieldSort` embedded map. `FieldSort` has an `Order` field of type `*sortorder.SortOrder`.

### 06 - Multi Request

**Generated:**
```go
es.Cat.Health().V("true")
```

**Problem:** `V()` signature is `func (r *Health) V(v bool) *Health`. It takes a `bool`, not a `string`. Should be `V(true)`.

### 07 - Index Doc

**Generated:**
```go
es.Index("my-index").
    ID("1").
    Request(&index.Request{
        Title: "Hello World",
        Tags: []interface{}{ ... },
        Metadata: map[string]interface{}{ ... },
    })
```

**Problems:**

1. `index.Request` is defined as `type Request = json.RawMessage`. It is not a typed struct — you cannot initialize it with fields like `Title`, `Tags`, `Metadata`.
2. The method is `Id()` (lowercase d), not `ID()`.
3. The `Request()` method accepts `any`, so the correct approach is to pass a plain Go value (map or anonymous struct).

**Correct approach:**
```go
es.Index("my-index").
    Id("1").
    Request(map[string]interface{}{
        "title": "Hello World",
        "tags":  []string{"intro", "welcome"},
        "metadata": map[string]interface{}{
            "author":  "test",
            "version": 2,
        },
    })
```

---

## Root Cause Analysis (traced through `elastic-client-generator-go`)

### 1. `toPascalCase` special-cases `id` → `ID` but the generator does NOT

**File:** `src/exporters/go/naming.ts` line 9

The exporter has:
```typescript
if (part.toLowerCase() === "id") return "ID";
if (part.toLowerCase() === "ip") return "IP";
```

But the generator (`elastic-client-generator-go/src/pkg/mapping/strings.go`) uses `cases.Title(language.English, cases.NoLower)` which simply title-cases each word. For `id` this produces `Id`, not `ID`. Same for `ip` → `Ip`.

The generator has no special acronym handling, so the exporter's special-casing is incorrect and should be removed. This causes `ID("1")` in the output instead of the correct `Id("1")`.

### 2. Query parameter type resolution: boolean vs string methods

**File:** `src/exporters/go/exporter.ts` `renderQueryParams()`

The exporter correctly checks for boolean type at line 177 (`ctx.resolver.isBooleanType(inst.type)`), but there's a fallback at line 202 where unresolved params get `methodName("value")` — always passing a string.

In the generated client, query parameter methods have typed signatures determined by the endpoint template (`endpoint.go.tmpl` lines 486-497):
- `"boolean"` → `func V(v bool)` 
- `"integer"` → `func From(from int)`

The `v` parameter for `cat.health` has `RawType: "boolean"`, so the generated method is `V(v bool)`. If the spec param lookup fails (line 167: `req.request?.query?.find`), the fallback renders a string. The fix is to ensure query parameter matching works, including when the parser sends `"v"` but the spec has `"v"` with boolean type.

### 3. Union types resolve to first item instead of matching Go generator behavior

**File:** `src/exporters/go/renderer.ts` `goTypeString()` and `renderUnionOf()`

For `union_of` types, the exporter takes the first item:
```typescript
case "union_of": {
  const union = typeInfo as UnionOf;
  if (union.items.length > 0) {
    return this.goTypeString(union.items[0], ctx);
  }
}
```

But the Go generator's `DecisionTree` has complex logic for union resolution. Some examples of how this matters:

| Spec union | Exporter resolves to | Generator resolves to | Go type |
|---|---|---|---|
| `integer \| string` (`number_of_shards`) | `int` (first item) | `string` | `*string` |
| `SortCombinations` (union) | first item | `any` | `SortCombinations any` |
| `RangeQuery` (union) | first item | `any` | `RangeQuery any` |
| `Property` (union) | first item (`BinaryProperty`) | `any` | `Property any` |
| `MinimumShouldMatch` (union) | first item | `any` | `MinimumShouldMatch any` |

In the Go generator, unions that contain non-compatible types (not just string+[]string) are rendered as `any` with a type alias. The exporter needs to check: if the generated Go type is a type alias to `any`, it should use that type alias name instead of resolving the first union item.

### 4. Property alias resolution (JSON `aggs` → Go field `Aggregations`)

**File:** `src/exporters/go/renderer.ts` `renderStructFields()`

The spec property for aggregations has:
```json
{ "name": "aggregations", "aliases": ["aggs"], ... }
```

When the user input uses `"aggs"`, the field lookup (`properties.find(p => p.name === key)`) fails because it matches against `name` but not `aliases`. The code falls to the `!prop` branch which renders `toPascalCase("aggs")` = `Aggs` and uses `renderLiteralValue` instead of typed rendering.

**Fix:** Also check `p.aliases?.includes(key)` in the property lookup.

### 5. `user_defined_value` body → `json.RawMessage` (the `index` API case)

**Files:** `src/exporters/go/exporter.ts` `renderBody()`, `elastic-client-generator-go/src/pkg/models/request.go`

In the raw schema (`schema.json`), the index API body is:
```json
{ "kind": "value", "value": { "kind": "instance_of", "type": { "name": "TDocument", ... } } }
```

In the expanded schema (`schema-no-generics.json`), after generic expansion, it becomes:
```json
{ "kind": "value", "value": { "kind": "user_defined_value" } }
```

The exporter uses `req.request.body` from the raw schema (via parser) where `bodyDef.value.kind === "instance_of"` is true. It then calls `resolver.getInterfaceProperties("TDocument", "_global.index.Request")` which returns nothing (TDocument doesn't exist in the expanded schema). With empty properties, `renderStructFields` falls back to literal rendering for each field, but still wraps everything in `&index.Request{...}`.

In the generator, `TDocument` resolves to `user_defined_value` → `json.RawMessage`. The `Request()` method accepts `any`.

**Fix:** The exporter needs to consult the expanded schema's body definition. When the expanded body value is `user_defined_value`, it should skip the typed Request wrapper and pass the body as a plain `map[string]interface{}` or struct literal. Alternatively, detect when `getInterfaceProperties()` returns empty for a generic type parameter and fall back to untyped.

### 6. Pointer vs value in slices (e.g. `&types.Query{}` in `[]Query`)

**File:** `src/exporters/go/renderer.ts` `renderInstanceOf()`

The renderer always uses `&types.Foo{...}` for struct instances (line 249):
```typescript
return `&types.${goName}{\n${fields}\n${ctx.indent()}}`;
```

But in Go, `[]Query` is a value slice. Putting `&types.Query{}` (a pointer) into `[]Query` won't compile. The renderer needs context about whether it's rendering into a pointer context (struct field with `*` prefix) or a value context (slice element, map value that's not a pointer type).

In the generator, the `ShouldBePointer()` method on `Field` determines this:
- Slices and maps are already underlying pointers, so their elements are not pointer-wrapped
- Only optional struct fields get pointers

### 7. Container variant types rendered as structs with wrong field names

The `SortOptions` struct in go-elasticsearch has:
```go
type SortOptions struct {
    Doc_         *ScoreSort           `json:"_doc,omitempty"`
    Score_       *ScoreSort           `json:"_score,omitempty"`
    SortOptions  map[string]FieldSort `json:"-"`
}
```

The exporter doesn't understand this container variant pattern — custom field sorts go into the `SortOptions` map, not as direct struct fields. It incorrectly tries `SortOptions{Price: "asc"}` which has no `Price` field.

---

## Priority Fix Order

1. ~~**Property alias resolution** — easy fix, check `aliases` in property lookup. Fixes `Aggs` → `Aggregations`.~~ **FIXED**
2. ~~**Remove `id`/`ip` special-casing in `toPascalCase`** — simple fix. Fixes `ID()` → `Id()`.~~ **FIXED**
3. ~~**Union type resolution** — check if the Go type is a type alias to `any` and use the alias name. Fixes `NumberOfShards`, `Sort`, `Range`, `Property` types.~~ **FIXED**
4. **`user_defined_value` body detection** — consult expanded schema to detect untyped request bodies. Fixes index API output.
5. **Pointer vs value context** — track whether we're in a slice/map element context and omit `&`. Fixes `&types.Query{}` in `[]Query`.
6. **Query parameter boolean detection** — ensure spec param lookup finds the `v` parameter for cat health. Fixes `V("true")` → `V(true)`.
7. **Container variant / sort rendering** — complex; requires understanding the sort DSL structure to emit correct `SortOptions` with `map[string]FieldSort`.
