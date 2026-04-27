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