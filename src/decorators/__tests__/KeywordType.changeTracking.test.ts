import 'reflect-metadata'
import { SearchModel } from '../../core/SearchModel'
import { KeywordType } from '../index'
import { id } from '../../utils/id'

// Test model with keyword field
class TestKeywordModel extends SearchModel<TestKeywordModel> {
  static readonly indexName = 'test-keyword-index'

  @KeywordType({ required: true })
  category!: string

  @KeywordType()
  tag!: string
}

describe('KeywordType Change Tracking', () => {
  it('should track changes when setting keyword field', () => {
    const model = new TestKeywordModel()

    // Initially no changes should be tracked
    expect(model['getChangedFields']()).toHaveLength(0)

    // Set a keyword field value
    model.category = 'electronics'

    // Should track the change
    const changedFields = model['getChangedFields']()
    expect(changedFields).toContain('category')
    expect(changedFields).toHaveLength(1)
  })

  it('should track changes when updating keyword field', () => {
    const model = new TestKeywordModel({ category: 'books' })

    // Clear any initial changes from constructor
    model['clearChangedFields']()
    expect(model['getChangedFields']()).toHaveLength(0)

    // Update the keyword field
    model.category = 'electronics'

    // Should track the change
    const changedFields = model['getChangedFields']()
    expect(changedFields).toContain('category')
    expect(changedFields).toHaveLength(1)
  })

  it('should track changes for multiple keyword fields', () => {
    const model = new TestKeywordModel()

    // Set multiple keyword fields
    model.category = 'electronics'
    model.tag = 'featured'

    // Should track both changes
    const changedFields = model['getChangedFields']()
    expect(changedFields).toContain('category')
    expect(changedFields).toContain('tag')
    expect(changedFields).toHaveLength(2)
  })

  it('should not track changes when setting same value', () => {
    const testId = id()
    const model = new TestKeywordModel({
      id: testId,
      category: 'books'
    })

    // Clear any initial changes from constructor
    model['clearChangedFields']()
    expect(model['getChangedFields']()).toHaveLength(0)

    // Set the same value
    model.category = 'books'

    // Should not track a change since value didn't actually change
    expect(model['getChangedFields']()).toHaveLength(0)
  })

  it('should track changes when setting keyword field to null/undefined', () => {
    const model = new TestKeywordModel({ category: 'books' })

    // Clear any initial changes from constructor
    model['clearChangedFields']()

    // Set to undefined
    model.category = undefined as any

    // Should track the change
    const changedFields = model['getChangedFields']()
    expect(changedFields).toContain('category')
    expect(changedFields).toHaveLength(1)
  })

  it('should validate keyword field type and track changes', () => {
    const model = new TestKeywordModel()

    // Setting valid string should work and track changes
    model.category = 'electronics'
    expect(model['getChangedFields']()).toContain('category')

    // Setting invalid type should throw error and not track additional changes
    expect(() => {
      model.tag = 123 as any
    }).toThrow("Field 'tag' must be a string, got number")

    // Should still only have the first change tracked
    expect(model['getChangedFields']()).toHaveLength(1)
    expect(model['getChangedFields']()).toContain('category')
  })
})