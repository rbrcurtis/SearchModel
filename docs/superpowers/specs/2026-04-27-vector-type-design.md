# VectorType Field Design

## Goal

Add first-class vector field support to SearchModel so model classes can declare OpenSearch `knn_vector` fields with decorator-based validation and mapping generation.

Audoken needs this for story embeddings. Its current workaround manually injects embeddings into `toSearch()` because SearchModel lacks vector-aware field decorators.

## API

Add a `VectorType` decorator:

```ts
class Story extends SearchModel<Story> {
  @VectorType({ dimension: 1024 })
  embedding!: number[]
}
```

Options:

```ts
interface VectorFieldOptions extends BaseFieldOptions {
  dimension: number
}
```

`VectorType` supports existing base options:

- `required`
- `default`
- `transform`
- `validate`

The decorator validates `dimension` when applied. `dimension` must be a positive integer.

## Field Validation

When assigning a vector value, SearchModel will validate:

- value is an array
- every element is a finite number
- array length exactly equals `dimension`

Invalid values throw field-specific errors matching existing decorator behavior.

Vector arrays will not use mutation-tracking proxies. Callers should assign a full replacement array when changing vectors. This keeps large embeddings simple and avoids proxy overhead for high-dimensional arrays.

## Mapping Generation

`SearchModel.getElasticsearchFieldType()` will map vector metadata to:

```ts
{
  type: 'knn_vector',
  dimension: 1024
}
```

This design does not add OpenSearch `method` configuration yet. Audoken only needs default OpenSearch vector mapping for initial embedding storage and search work.

This design also does not add automatic `index.knn` settings unless implementation tests show OpenSearch requires it for the target version. If needed, that setting should be added with evidence from local OpenSearch verification.

## Type Integration

Add `'vector'` to SearchModel field metadata type unions:

- `FieldMetadata.type`
- `ObjectPropertyDefinition.type`

Nested object mapping and validation can therefore support vector properties if a caller provides vector options with `dimension`. The primary supported use case remains top-level embedding fields.

Export `VectorType` from:

- `src/decorators/index.ts`
- `src/index.ts`

## Tests

Add unit tests for:

- valid vector assignment with exact dimension
- invalid `dimension` options
- non-array assignment rejection
- non-number, `NaN`, and infinite element rejection
- wrong vector length rejection
- generated mapping equals `{ type: 'knn_vector', dimension: N }`
- root package export exposes `VectorType`

Optional integration test may create an index against local OpenSearch if existing test patterns support it without making normal unit tests depend on a running OpenSearch service.

## Build Artifacts

SearchModel tracks generated `lib`, `esm`, and `types` outputs. Implementation should update source first and use the existing build pipeline to refresh generated artifacts when committing.

Existing untracked DateOnly build outputs in `lib/core/__tests__/SearchModel.dateOnly.test.*` must not be staged unless intentionally included as part of a build-artifact cleanup decision.

## Out of Scope

- Query helpers for k-NN search
- Vector similarity search API
- OpenSearch method tuning (`hnsw`, `faiss`, etc.)
- Dense vector support for Elasticsearch-specific mappings
- Automatic migration of existing indexes
