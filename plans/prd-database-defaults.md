# PRD: Database Load Defaults Feature

## Status: Gathering Requirements

## Initial Request

"A property's default needs to apply on load from the database to allow for iterative additions to the model and needing to default the new field."

## Clarifying Questions & Answers

### 1. Problem Context

What specific problem are you experiencing with defaults currently?

- a) Defaults only apply on new object creation, not when loading existing records
- b) New fields added to models cause errors when loading old records
- c) Defaults are inconsistently applied across different data sources
- d) Other (please specify)

**Answer: a **

- Defaults only apply on new object creation, not when loading existing records
- New fields added to models cause errors when loading old records

### 2. Scope of Implementation

Where should these defaults be applied?

- a) Only in the SearchModel class
- b) Across all models in the project
- c) Only for specific field types (please specify which)
- d) As a configurable option per field

**Answer: Defaults should be applied when a model is created via fromJSON and also in the constructor if a default is specified in the decorator for the field. This applies to all classes that extend SearchModel.**

### 3. Default Behavior

When should defaults be applied during database load?

- a) Only when the field is missing/undefined
- b) Also when the field is null
- c) Only for newly added fields (migration scenario)
- d) Always override with default if no value exists

** Answer: a**

- Only when the field is missing/undefined (null values should be preserved as intentional)

### 4. Field Types

Which field decorators need this functionality?

- a) All existing decorators (DateType, StringType, NumberType, BooleanType, etc.)
- b) Only specific decorators (please list)
- c) Need a new decorator specifically for this
- d) Should be a parameter on existing decorators

**Answer: All existing decorators already have the `default` option**

- The existing `default` option in decorators will be used (e.g., `@StringType({ default: () => 'value' })`)
- No new `applyOnLoad` parameter needed - defaults always apply when field is undefined
- Note: Based on code review, the existing decorators are: DateType, StringType, NumberType, BooleanType, StringArrayType, ObjectType, ObjectArrayType, KeywordType, StringMapType

### 5. Database Integration

How are you currently loading data from the database?

- a) Through Elasticsearch queries
- b) Through a separate database layer
- c) Both Elasticsearch and another database
- d) Other (please specify)

** Answer: a**

- Through Elasticsearch queries (based on the codebase's current implementation)

### 6. Migration Strategy

How should existing records be handled?

- a) Apply defaults lazily (when loaded)
- b) Run a migration to update all existing records
- c) Both options should be supported
- d) Not concerned about existing records

** Answer: a**

- Apply defaults lazily (when loaded) - this supports iterative development without requiring migrations

### 7. Performance Considerations

Are there any performance requirements?

- a) Defaults must be applied with minimal overhead
- b) Can accept some performance impact for correctness
- c) Need benchmarks before/after implementation
- d) Performance is not a primary concern

**Answer: d**

- Performance is not a primary concern (correctness is more important)

### 8. Testing Requirements

What testing scenarios are most important?

- a) Loading old records with new fields
- b) Ensuring defaults don't override existing values
- c) Performance impact of applying defaults
- d) All of the above

** Answer: d**

- All of the above (comprehensive testing is important for this feature)

---

**Please review these answers and let me know if you'd like any adjustments!**

## Full PRD

### Introduction/Overview

This feature enhances the SearchModel class and its child classes to apply field defaults when loading documents from Elasticsearch via `fromJSON`. Currently, defaults only apply during object creation through the constructor, which causes issues when new fields are added to models and existing records are loaded without those fields. This feature enables iterative model development by ensuring defaults are applied during both construction and deserialization.

### Goals

1. Enable seamless addition of new fields to existing models without breaking existing records
2. Apply field defaults during document loading from Elasticsearch via `fromJSON`
3. Apply field defaults during constructor initialization
4. Maintain backward compatibility with existing code
5. Support iterative development workflows without requiring data migrations

### User Stories

1. **As a developer**, I want to add new fields with defaults to my SearchModel subclasses without migrating existing data, so that I can iterate quickly on model changes.
2. **As a developer**, I want existing records to automatically use default values for new fields when loaded via `fromJSON`, so that my application doesn't break.
3. **As a developer**, I want defaults to be applied consistently whether creating new objects via constructor or loading from the database, so that behavior is predictable.
4. **As a developer**, I want to use the existing `default` option in field decorators without needing additional configuration.

### Functional Requirements

1. The system must apply field defaults when loading documents from Elasticsearch if the field is undefined
2. The system must apply field defaults in the constructor if the field is undefined
3. The system must respect existing null values and not override them with defaults
4. The system must use the existing `default` option in decorator parameters (e.g., `@StringType({ default: () => 'value' })`)
5. The system must apply defaults during the `fromJSON` deserialization process
6. The system must not apply defaults to fields that have explicit values (including empty strings, 0, false)
7. The system must support all existing field decorators: DateType, StringType, NumberType, BooleanType, StringArrayType, ObjectType, ObjectArrayType, KeywordType, StringMapType
8. The default option must be a function that returns the default value to avoid shared references

### Non-Goals (Out of Scope)

1. Will NOT automatically migrate existing data in Elasticsearch
2. Will NOT apply defaults to null values (null is considered intentional)
3. Will NOT require any new decorator parameters or flags (uses existing `default` option)
4. Will NOT support async computed defaults that require database queries
5. Will NOT affect the indexing/saving process
6. Will NOT create new decorators (uses existing type decorators)

### Design Considerations

- Use the existing `default` option in decorators (no new parameters needed)
- Modify the `fromJSON` method in SearchModel to check and apply defaults for undefined fields
- Modify the constructor in SearchModel to apply defaults for undefined fields
- Ensure the default application logic is centralized and reusable
- Leverage the existing Symbol-based private storage (PRIVATE_STORAGE) and field metadata system
- The `default` option is already defined as `default?: () => any` in BaseFieldOptions

### Technical Considerations

1. Implementation should be in both `SearchModel.fromJSON` method and constructor
2. Leverage existing decorator metadata storage mechanisms (getFieldMetadata)
3. Ensure compatibility with the current field validation system
4. Must work with nested objects and arrays (ObjectType, ObjectArrayType)
5. Use the existing `default?: () => any` option in BaseFieldOptions
6. Apply defaults before validation to ensure required fields with defaults pass validation
7. Defaults should be applied through a centralized helper function to avoid duplication

### Success Metrics

1. Zero errors when loading existing records after adding new fields with defaults
2. Defaults apply correctly in both constructor and fromJSON
3. 100% backward compatibility with existing code
4. All new fields with defaults work correctly on first deployment
5. All existing tests continue to pass
6. New tests validate default application for all decorator types

### Open Questions

1. Should we log when defaults are applied for debugging purposes?
2. Should defaults be applied before or after transformation functions?
3. Should we add a method to check if a field was defaulted vs explicitly set?
4. How should defaults interact with the `required` field option?

---

## Implementation Notes

Based on the code review:
- The decorators already have a `default?: () => any` option in BaseFieldOptions
- All decorators inherit from BaseFieldOptions, so they all support defaults
- The implementation needs to call the default function when a field is undefined
- This should happen in both the constructor and fromJSON method
- The existing validation and transformation logic should remain unchanged
