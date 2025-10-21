"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const SearchModel_1 = require("../SearchModel");
const decorators_1 = require("../../decorators");
const id_1 = require("../../utils/id");
class UpdateTestModel extends SearchModel_1.SearchModel {
}
UpdateTestModel.indexName = 'update-test-index';
__decorate([
    (0, decorators_1.StringType)({ required: true }),
    __metadata("design:type", String)
], UpdateTestModel.prototype, "name", void 0);
__decorate([
    (0, decorators_1.NumberType)(),
    __metadata("design:type", Number)
], UpdateTestModel.prototype, "score", void 0);
__decorate([
    (0, decorators_1.DateType)(),
    __metadata("design:type", Date)
], UpdateTestModel.prototype, "birthDate", void 0);
__decorate([
    (0, decorators_1.BooleanType)(),
    __metadata("design:type", Boolean)
], UpdateTestModel.prototype, "isActive", void 0);
__decorate([
    (0, decorators_1.StringArrayType)(),
    __metadata("design:type", Array)
], UpdateTestModel.prototype, "tags", void 0);
__decorate([
    (0, decorators_1.StringType)(),
    __metadata("design:type", String)
], UpdateTestModel.prototype, "description", void 0);
describe('SearchModel.update()', () => {
    describe('basic functionality', () => {
        it('should update single property', () => {
            const model = new UpdateTestModel({ name: 'Original' });
            model['clearChangedFields']();
            model.update({ name: 'Updated' });
            expect(model.name).toBe('Updated');
        });
        it('should update multiple properties at once', () => {
            const testId = (0, id_1.id)();
            const model = new UpdateTestModel({
                id: testId,
                name: 'Original',
                score: 50,
                isActive: false
            });
            model['clearChangedFields']();
            model.update({
                name: 'Updated Name',
                score: 100,
                isActive: true,
                description: 'New description'
            });
            expect(model.name).toBe('Updated Name');
            expect(model.score).toBe(100);
            expect(model.isActive).toBe(true);
            expect(model.description).toBe('New description');
        });
        it('should update with different data types', () => {
            const model = new UpdateTestModel();
            model['clearChangedFields']();
            const updateDate = new Date('2023-12-25');
            model.update({
                name: 'Test',
                score: 85,
                birthDate: updateDate,
                isActive: true,
                tags: ['tag1', 'tag2', 'tag3']
            });
            expect(model.name).toBe('Test');
            expect(model.score).toBe(85);
            expect(model.birthDate).toEqual(updateDate);
            expect(model.isActive).toBe(true);
            expect([...model.tags]).toEqual(['tag1', 'tag2', 'tag3']);
        });
        it('should return the model instance for chaining', () => {
            const model = new UpdateTestModel();
            const result = model.update({ name: 'Test' });
            expect(result).toBe(model);
        });
    });
    describe('change tracking', () => {
        it('should track changes for updated fields', () => {
            const model = new UpdateTestModel({ name: 'Original', score: 50 });
            model['clearChangedFields']();
            model.update({
                name: 'Updated',
                score: 100
            });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('name');
            expect(changedFields).toContain('score');
            expect(changedFields).toHaveLength(2);
        });
        it('should track changes for single field update', () => {
            const model = new UpdateTestModel({ name: 'Original' });
            model['clearChangedFields']();
            model.update({ name: 'Updated' });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('name');
            expect(changedFields).toHaveLength(1);
        });
        it('should track changes for multiple field types', () => {
            const model = new UpdateTestModel();
            model['clearChangedFields']();
            model.update({
                name: 'Test Name',
                score: 95,
                isActive: true,
                tags: ['new', 'tags']
            });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('name');
            expect(changedFields).toContain('score');
            expect(changedFields).toContain('isActive');
            expect(changedFields).toContain('tags');
            expect(changedFields).toHaveLength(4);
        });
        it('should not track changes when setting same value', () => {
            const testId = (0, id_1.id)();
            const model = new UpdateTestModel({
                id: testId,
                name: 'Unchanged',
                score: 50
            });
            model['clearChangedFields']();
            model.update({
                name: 'Unchanged',
                score: 50
            });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toHaveLength(0);
        });
        it('should track changes even when some fields have same values', () => {
            const model = new UpdateTestModel({
                name: 'Original',
                score: 50,
                isActive: false
            });
            model['clearChangedFields']();
            model.update({
                name: 'Updated',
                score: 50,
                isActive: true
            });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('name');
            expect(changedFields).toContain('isActive');
            expect(changedFields).not.toContain('score');
            expect(changedFields).toHaveLength(2);
        });
        it('should track changes when updating from undefined to value', () => {
            const model = new UpdateTestModel({ name: 'Test' });
            model['clearChangedFields']();
            model.update({
                score: 100,
                description: 'New description'
            });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('score');
            expect(changedFields).toContain('description');
            expect(changedFields).toHaveLength(2);
        });
        it('should track changes when updating to null/undefined', () => {
            const model = new UpdateTestModel({
                name: 'Test',
                description: 'Original'
            });
            model['clearChangedFields']();
            model.update({
                description: undefined
            });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('description');
            expect(changedFields).toHaveLength(1);
        });
    });
    describe('field filtering', () => {
        it('should only update valid model attributes', () => {
            const model = new UpdateTestModel({ name: 'Original' });
            model['clearChangedFields']();
            model.update({
                name: 'Updated',
                invalidField: 'should be ignored',
                anotherInvalid: 123
            });
            expect(model.name).toBe('Updated');
            expect(model.invalidField).toBeUndefined();
            expect(model.anotherInvalid).toBeUndefined();
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('name');
            expect(changedFields).toHaveLength(1);
        });
        it('should ignore non-existent properties without error', () => {
            const model = new UpdateTestModel();
            expect(() => {
                model.update({
                    name: 'Valid',
                    nonExistentProp: 'ignored',
                    anotherFake: { nested: 'object' },
                    yetAnother: [1, 2, 3]
                });
            }).not.toThrow();
            expect(model.name).toBe('Valid');
            expect(model.nonExistentProp).toBeUndefined();
        });
        it('should only update decorated fields', () => {
            const model = new UpdateTestModel();
            model['clearChangedFields']();
            model.update({
                id: (0, id_1.id)(),
                name: 'Test Name',
                score: 75,
                birthDate: new Date(),
                isActive: true,
                tags: ['test'],
                description: 'Description',
                version: 999,
                createdAt: new Date('2020-01-01'),
                updatedAt: new Date('2020-01-01'),
                fakeField: 'ignored',
                anotherFake: 123
            });
            expect(model.name).toBe('Test Name');
            expect(model.score).toBe(75);
            expect(model.isActive).toBe(true);
            expect(model.version).toBe(999);
            expect(model.fakeField).toBeUndefined();
            expect(model.anotherFake).toBeUndefined();
        });
    });
    describe('validation and type checking', () => {
        it('should trigger validation through setters', () => {
            const model = new UpdateTestModel();
            expect(() => {
                model.update({
                    name: 123
                });
            }).toThrow("Field 'name' must be a string, got number");
        });
        it('should trigger validation for multiple fields', () => {
            const model = new UpdateTestModel();
            expect(() => {
                model.update({
                    name: 'Valid',
                    score: 'invalid number'
                });
            }).toThrow("Field 'score' must be a valid number, got string");
        });
        it('should validate array fields correctly', () => {
            const model = new UpdateTestModel();
            expect(() => {
                model.update({
                    tags: 'not an array'
                });
            }).toThrow("Field 'tags' must be an array, got string");
        });
        it('should validate date fields correctly', () => {
            const model = new UpdateTestModel();
            expect(() => {
                model.update({
                    birthDate: 'invalid date string'
                });
            }).toThrow("Field 'birthDate' must be a valid date string");
        });
        it('should stop at first validation error and not update remaining fields', () => {
            const model = new UpdateTestModel({ name: 'Original' });
            model['clearChangedFields']();
            expect(() => {
                model.update({
                    name: 'Updated',
                    score: 'invalid',
                    isActive: true
                });
            }).toThrow();
            expect(model.name).toBe('Updated');
            expect(model.isActive).toBeUndefined();
        });
    });
    describe('integration with existing functionality', () => {
        it('should not save automatically', () => {
            const model = new UpdateTestModel({ name: 'Original' });
            const saveSpy = jest.spyOn(model, 'save');
            model.update({ name: 'Updated' });
            expect(saveSpy).not.toHaveBeenCalled();
            expect(model.name).toBe('Updated');
            saveSpy.mockRestore();
        });
        it('should work with chaining and other methods', () => {
            const model = new UpdateTestModel();
            const result = model
                .update({ name: 'Test' })
                .update({ score: 100 });
            expect(result).toBe(model);
            expect(model.name).toBe('Test');
            expect(model.score).toBe(100);
        });
        it('should preserve change tracking through multiple updates', () => {
            const model = new UpdateTestModel({ name: 'Original', score: 50 });
            model['clearChangedFields']();
            model.update({ name: 'First Update' });
            model.update({ score: 100 });
            model.update({ isActive: true });
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('name');
            expect(changedFields).toContain('score');
            expect(changedFields).toContain('isActive');
            expect(changedFields).toHaveLength(3);
        });
        it('should work correctly with toJSON after update', () => {
            const testId = (0, id_1.id)();
            const model = new UpdateTestModel({
                id: testId,
                name: 'Original'
            });
            model.update({
                name: 'Updated',
                score: 85,
                isActive: true
            });
            const json = model.toJSON();
            expect(json).toMatchObject({
                id: testId,
                name: 'Updated',
                score: 85,
                isActive: true
            });
        });
    });
    describe('edge cases', () => {
        it('should handle empty update object', () => {
            const model = new UpdateTestModel({ name: 'Original' });
            model['clearChangedFields']();
            model.update({});
            expect(model.name).toBe('Original');
            expect(model['getChangedFields']()).toHaveLength(0);
        });
        it('should handle null values', () => {
            const model = new UpdateTestModel({ name: 'Original' });
            model['clearChangedFields']();
            model.update({ description: null });
            expect(model.description).toBeNull();
            expect(model['getChangedFields']()).toContain('description');
        });
        it('should handle undefined values', () => {
            const model = new UpdateTestModel({
                name: 'Original',
                description: 'Has description'
            });
            model['clearChangedFields']();
            model.update({ description: undefined });
            expect(model.description).toBeUndefined();
            expect(model['getChangedFields']()).toContain('description');
        });
        it('should handle updates with complex objects for valid fields', () => {
            const model = new UpdateTestModel();
            model['clearChangedFields']();
            const complexDate = new Date('2023-12-25T10:30:00.000Z');
            const complexArray = ['tag1', 'tag2', 'tag3'];
            model.update({
                birthDate: complexDate,
                tags: complexArray
            });
            expect(model.birthDate).toEqual(complexDate);
            expect(model.tags).toEqual(complexArray);
            expect(model['getChangedFields']()).toContain('birthDate');
            expect(model['getChangedFields']()).toContain('tags');
        });
    });
});
//# sourceMappingURL=SearchModel.update.test.js.map