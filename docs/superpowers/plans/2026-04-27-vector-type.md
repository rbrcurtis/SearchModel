# VectorType Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class `VectorType` decorator support for OpenSearch `knn_vector` fields in SearchModel.

**Architecture:** `VectorType({ dimension })` extends the existing decorator metadata pipeline with a new `vector` field type. Validation lives beside existing field validation in `src/decorators/index.ts`; mapping generation lives in `src/core/SearchModel.ts`; package exports are updated in `src/index.ts`. Tests are unit-first and do not require a running OpenSearch service.

**Tech Stack:** TypeScript decorators, reflect-metadata, Vitest, SearchModel mapping generation, OpenSearch `knn_vector` mapping.

---

## File Structure

- Modify: `src/decorators/index.ts`
  - Add `VectorFieldOptions`.
  - Add `vector` to field type unions.
  - Add vector option validation helper.
  - Add vector value validation in `validateFieldType()`.
  - Add `VectorType()` decorator.
- Modify: `src/core/SearchModel.ts`
  - Add `vector` mapping case returning OpenSearch `knn_vector` mapping.
- Modify: `src/index.ts`
  - Export `VectorType`.
- Create: `src/decorators/__tests__/VectorType.test.ts`
  - Unit tests for decorator validation, assignment validation, mapping generation, `toSearch()`, change tracking, and root export.
- Build outputs after implementation:
  - Existing build pipeline updates `lib`, `esm`, and `types` artifacts.
  - Do not stage unrelated untracked DateOnly build outputs unless build command creates/updates them and they are required tracked artifacts.

---

### Task 1: Add Failing VectorType Tests

**Files:**
- Create: `src/decorators/__tests__/VectorType.test.ts`

- [ ] **Step 1: Write failing unit tests**

Create `src/decorators/__tests__/VectorType.test.ts`:

```ts
import 'reflect-metadata'
import { SearchModel } from '../../core/SearchModel'
import { VectorType } from '../index'

class VectorTestModel extends SearchModel<VectorTestModel> {
  static readonly indexName = 'test-vector-index'

  @VectorType({ dimension: 3 })
  embedding?: number[]

  @VectorType({ dimension: 2, required: true })
  requiredEmbedding!: number[]

  @VectorType({ dimension: 2, default: () => [0.1, 0.2] })
  defaultEmbedding?: number[]
}

describe('VectorType', () => {
  describe('decorator options', () => {
    it('rejects zero dimension', () => {
      expect(() => {
        class InvalidVectorModel extends SearchModel<InvalidVectorModel> {
          static readonly indexName = 'invalid-vector-zero'

          @VectorType({ dimension: 0 })
          embedding?: number[]
        }

        return InvalidVectorModel
      }).toThrow("Vector field 'embedding' dimension must be a positive integer")
    })

    it('rejects negative dimension', () => {
      expect(() => {
        class InvalidVectorModel extends SearchModel<InvalidVectorModel> {
          static readonly indexName = 'invalid-vector-negative'

          @VectorType({ dimension: -1 })
          embedding?: number[]
        }

        return InvalidVectorModel
      }).toThrow("Vector field 'embedding' dimension must be a positive integer")
    })

    it('rejects non-integer dimension', () => {
      expect(() => {
        class InvalidVectorModel extends SearchModel<InvalidVectorModel> {
          static readonly indexName = 'invalid-vector-decimal'

          @VectorType({ dimension: 1.5 })
          embedding?: number[]
        }

        return InvalidVectorModel
      }).toThrow("Vector field 'embedding' dimension must be a positive integer")
    })
  })

  describe('assignment validation', () => {
    it('accepts finite number arrays with exact dimension', () => {
      const model = new VectorTestModel({
        requiredEmbedding: [1, 2],
        embedding: [0.1, 0.2, 0.3],
      })

      expect(model.embedding).toEqual([0.1, 0.2, 0.3])
      expect(model.requiredEmbedding).toEqual([1, 2])
    })

    it('rejects non-array values', () => {
      const model = new VectorTestModel({ requiredEmbedding: [1, 2] })

      expect(() => {
        ;(model as any).embedding = 'not-a-vector'
      }).toThrow("Field 'embedding' must be an array, got string")
    })

    it('rejects arrays with wrong dimension', () => {
      const model = new VectorTestModel({ requiredEmbedding: [1, 2] })

      expect(() => {
        model.embedding = [0.1, 0.2]
      }).toThrow("Field 'embedding' must have dimension 3, got 2")
    })

    it('rejects non-number elements', () => {
      const model = new VectorTestModel({ requiredEmbedding: [1, 2] })

      expect(() => {
        ;(model as any).embedding = [0.1, 'bad', 0.3]
      }).toThrow("Field 'embedding' must be an array of finite numbers, found string at index 1")
    })

    it('rejects NaN elements', () => {
      const model = new VectorTestModel({ requiredEmbedding: [1, 2] })

      expect(() => {
        model.embedding = [0.1, NaN, 0.3]
      }).toThrow("Field 'embedding' must be an array of finite numbers, found number at index 1")
    })

    it('rejects infinite elements', () => {
      const model = new VectorTestModel({ requiredEmbedding: [1, 2] })

      expect(() => {
        model.embedding = [0.1, Infinity, 0.3]
      }).toThrow("Field 'embedding' must be an array of finite numbers, found number at index 1")
    })

    it('enforces required vector fields', () => {
      const model = new VectorTestModel()

      expect(() => model.validate()).toThrow("Required field 'requiredEmbedding' is missing")
    })
  })

  describe('mapping generation', () => {
    it('generates knn_vector mappings with dimensions', () => {
      const mapping = SearchModel.generateMapping.call(VectorTestModel as any)

      expect(mapping.mappings.properties.embedding).toEqual({
        type: 'knn_vector',
        dimension: 3,
      })
      expect(mapping.mappings.properties.requiredEmbedding).toEqual({
        type: 'knn_vector',
        dimension: 2,
      })
      expect(mapping.mappings.properties.defaultEmbedding).toEqual({
        type: 'knn_vector',
        dimension: 2,
      })
    })

    it('maps vector metadata directly through getElasticsearchFieldType', () => {
      const mapping = SearchModel.getElasticsearchFieldType({
        propertyKey: 'embedding',
        type: 'vector',
        options: { dimension: 4 },
      })

      expect(mapping).toEqual({
        type: 'knn_vector',
        dimension: 4,
      })
    })
  })

  describe('serialization and change tracking', () => {
    it('includes vectors in toSearch output', () => {
      const model = new VectorTestModel({
        requiredEmbedding: [1, 2],
        embedding: [0.1, 0.2, 0.3],
      })

      const searchDoc = model.toSearch()

      expect(searchDoc.embedding).toEqual([0.1, 0.2, 0.3])
      expect(searchDoc.requiredEmbedding).toEqual([1, 2])
    })

    it('tracks changes when assigning vector fields', () => {
      const model = new VectorTestModel({ requiredEmbedding: [1, 2] })
      model['clearChangedFields']()

      model.embedding = [0.1, 0.2, 0.3]

      expect(model['getChangedFields']()).toContain('embedding')
    })

    it('does not proxy vector arrays for in-place mutation tracking', () => {
      const model = new VectorTestModel({
        requiredEmbedding: [1, 2],
        embedding: [0.1, 0.2, 0.3],
      })
      model['clearChangedFields']()

      model.embedding!.push(0.4)

      expect(model['getChangedFields']()).toEqual([])
    })
  })

  describe('root exports', () => {
    it('exports VectorType from package root', async () => {
      const module = await import('../../index')

      expect(module.VectorType).toBe(VectorType)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
yarn vitest run src/decorators/__tests__/VectorType.test.ts
```

Expected:
- Fails to compile or run because `VectorType` is not exported.
- Failure mentions `VectorType` missing from `../index` or similar.

- [ ] **Step 3: Commit failing tests**

Do not commit failing tests alone. Keep changes uncommitted until Task 2 implementation makes them pass.

---

### Task 2: Implement VectorType Decorator and Mapping

**Files:**
- Modify: `src/decorators/index.ts`
- Modify: `src/core/SearchModel.ts`
- Modify: `src/index.ts`
- Test: `src/decorators/__tests__/VectorType.test.ts`

- [ ] **Step 1: Add vector option and metadata types**

In `src/decorators/index.ts`, update type definitions near the existing options and metadata unions.

Add `VectorFieldOptions` after `StringFieldOptions`:

```ts
interface VectorFieldOptions extends BaseFieldOptions {
  dimension: number
}
```

Add `'vector'` to `ObjectPropertyDefinition.type`:

```ts
interface ObjectPropertyDefinition {
  type:
    | 'date'
    | 'dateOnly'
    | 'string'
    | 'number'
    | 'stringArray'
    | 'object'
    | 'objectArray'
    | 'boolean'
    | 'keyword'
    | 'stringMap'
    | 'geoPoint'
    | 'vector'
  options?:
    | BaseFieldOptions
    | StringFieldOptions
    | ObjectFieldOptions
    | VectorFieldOptions
}
```

Add `'vector'` to `FieldMetadata.type` and include `VectorFieldOptions` in options:

```ts
export interface FieldMetadata {
  propertyKey: string
  type:
    | 'date'
    | 'dateOnly'
    | 'string'
    | 'number'
    | 'stringArray'
    | 'object'
    | 'objectArray'
    | 'boolean'
    | 'keyword'
    | 'stringMap'
    | 'geoPoint'
    | 'vector'
  options?:
    | BaseFieldOptions
    | StringFieldOptions
    | ObjectFieldOptions
    | VectorFieldOptions
}
```

- [ ] **Step 2: Add vector dimension helper**

In `src/decorators/index.ts`, add helper function before `validateFieldType()`:

```ts
function getVectorDimension(options: any, propertyKey: string): number {
  const dimension = options?.dimension

  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new Error(
      `Vector field '${propertyKey}' dimension must be a positive integer`
    )
  }

  return dimension
}
```

- [ ] **Step 3: Add vector validation case**

In `validateFieldType()` switch, add this case before `case 'object':`:

```ts
    case 'vector': {
      if (!Array.isArray(value)) {
        throw new Error(
          `Field '${propertyKey}' must be an array, got ${typeof value}`
        )
      }

      const dimension = getVectorDimension(options, propertyKey)
      if (value.length !== dimension) {
        throw new Error(
          `Field '${propertyKey}' must have dimension ${dimension}, got ${value.length}`
        )
      }

      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'number' || !Number.isFinite(value[i])) {
          throw new Error(
            `Field '${propertyKey}' must be an array of finite numbers, found ${typeof value[i]} at index ${i}`
          )
        }
      }
      break
    }
```

- [ ] **Step 4: Add VectorType decorator**

In `src/decorators/index.ts`, add this exported decorator after `StringArrayType()` and before `ObjectType()`:

```ts
/**
 * Decorator for vector embedding fields.
 * Mapped to OpenSearch 'knn_vector' type with a fixed dimension.
 *
 * The value must be an array of finite numbers whose length exactly matches `dimension`.
 * Vector arrays are not proxy-wrapped for in-place mutation tracking; assign a new array to mark changes.
 *
 * @param options - Field configuration options
 * @param options.dimension - Required positive integer vector dimension
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class Story extends SearchModel<Story> {
 *   @VectorType({ dimension: 1024 })
 *   embedding!: number[]
 * }
 * ```
 */
export function VectorType(options: VectorFieldOptions) {
  return function (target: any, propertyKey: string): void {
    getVectorDimension(options, propertyKey)

    setFieldMetadata(target, {
      propertyKey,
      type: 'vector',
      options,
    })
    createValidatedProperty(target, propertyKey, 'vector', options)
  }
}
```

- [ ] **Step 5: Add mapping support**

In `src/core/SearchModel.ts`, add a `vector` case in `getElasticsearchFieldType()` after `geoPoint`:

```ts
      case 'vector': {
        const dimension = (options as any)?.dimension
        if (!Number.isInteger(dimension) || dimension <= 0) {
          throw new Error(
            `Vector field '${field.propertyKey}' dimension must be a positive integer`
          )
        }
        return { type: 'knn_vector', dimension }
      }
```

- [ ] **Step 6: Export VectorType from package root**

In `src/index.ts`, add `VectorType` to decorator exports:

```ts
export {
  DateType,
  DateOnlyType,
  StringType,
  NumberType,
  BooleanType,
  StringArrayType,
  VectorType,
  ObjectType,
  ObjectArrayType,
  KeywordType,
  StringMapType,
  GeoPointType,
  FieldMetadata,
  getFieldMetadata,
  validateFieldType
} from './decorators'
```

- [ ] **Step 7: Run VectorType tests**

Run:

```bash
yarn vitest run src/decorators/__tests__/VectorType.test.ts
```

Expected:
- All tests in `VectorType.test.ts` pass.

- [ ] **Step 8: Commit source and test changes**

Run:

```bash
git add src/decorators/index.ts src/core/SearchModel.ts src/index.ts src/decorators/__tests__/VectorType.test.ts
git commit -m "Add VectorType decorator support"
```

Expected:
- Commit succeeds.
- Commit includes only source and test files from this task.

---

### Task 3: Build Generated Artifacts

**Files:**
- Modify generated artifacts under `lib/`, `esm/`, and `types/` produced by `yarn build`

- [ ] **Step 1: Run build**

Run:

```bash
yarn build
```

Expected:
- Exit code `0`.
- Output runs:
  - `tsc -p tsconfig.cjs.json`
  - `tsc -p tsconfig.esm.json`
  - `tsc -p tsconfig.types.json`

- [ ] **Step 2: Inspect build outputs**

Run:

```bash
git status --short
```

Expected:
- Modified tracked generated files include outputs for:
  - `lib/decorators/index.*`
  - `esm/decorators/index.*`
  - `types/decorators/index.d.ts`
  - `lib/core/SearchModel.*`
  - `esm/core/SearchModel.*`
  - `types/core/SearchModel.d.ts`
  - `lib/index.*`
  - `esm/index.*`
  - `types/index.d.ts`
- New generated test artifacts may appear for `VectorType.test` if the build emits tests.
- Existing untracked DateOnly generated files may still appear:
  - `lib/core/__tests__/SearchModel.dateOnly.test.d.ts`
  - `lib/core/__tests__/SearchModel.dateOnly.test.js`
  - `lib/core/__tests__/SearchModel.dateOnly.test.js.map`

- [ ] **Step 3: Stage only relevant generated artifacts**

Run:

```bash
git add lib/decorators/index.* esm/decorators/index.* types/decorators/index.d.ts \
  lib/core/SearchModel.* esm/core/SearchModel.* types/core/SearchModel.d.ts \
  lib/index.* esm/index.* types/index.d.ts \
  lib/decorators/__tests__/VectorType.test.* esm/decorators/__tests__/VectorType.test.* types/decorators/__tests__/VectorType.test.d.ts
```

If a path does not exist because that output target does not emit it, remove that missing path and rerun `git add` with the existing files only.

Do not stage unrelated DateOnly generated files unless they are already tracked.

- [ ] **Step 4: Commit generated artifacts**

Run:

```bash
git commit -m "Build VectorType generated artifacts"
```

Expected:
- Commit succeeds if generated artifacts changed.
- If no generated artifacts changed, do not create an empty commit.

---

### Task 4: Full Verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Run lint**

Run:

```bash
yarn lint
```

Expected:
- Exit code `0`.

- [ ] **Step 2: Run build**

Run:

```bash
yarn build
```

Expected:
- Exit code `0`.

- [ ] **Step 3: Run full test suite**

Run:

```bash
yarn test
```

Expected:
- Exit code `0`.
- All tests pass.

- [ ] **Step 4: Confirm git status**

Run:

```bash
git status --short
```

Expected:
- No modified tracked files.
- Existing untracked DateOnly build outputs may remain and must not be committed unless intentionally addressed.

---

## Self-Review

Spec coverage:
- `VectorType({ dimension })` API: Task 2.
- Positive integer dimension validation: Tasks 1 and 2.
- Assignment validation for array, finite numbers, exact length: Tasks 1 and 2.
- No vector proxy mutation tracking: Task 1.
- OpenSearch `knn_vector` mapping: Tasks 1 and 2.
- No method config/query helpers/migrations: out of scope, no task.
- Root exports: Tasks 1 and 2.
- Unit tests: Task 1.
- Build artifacts: Task 3.
- Full verification: Task 4.

Placeholder scan:
- No TBD/TODO placeholders.
- All implementation steps include exact files, code, commands, and expected results.
- One conditional exists for missing generated artifact paths because TypeScript output differs by config; action is explicit.

Type consistency:
- Decorator name is consistently `VectorType`.
- Field tag is consistently `'vector'`.
- Option name is consistently `dimension`.
- Mapping is consistently `{ type: 'knn_vector', dimension }`.
