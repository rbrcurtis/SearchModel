"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arrayProxy_1 = require("../arrayProxy");
describe('createTrackedArray', () => {
    let mutationCount;
    let onMutate;
    beforeEach(() => {
        mutationCount = 0;
        onMutate = vi.fn(() => mutationCount++);
    });
    describe('mutating methods', () => {
        it('should track push mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)(['a', 'b'], onMutate);
            arr.push('c');
            expect([...arr]).toEqual(['a', 'b', 'c']);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track pop mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)(['a', 'b', 'c'], onMutate);
            const removed = arr.pop();
            expect(removed).toBe('c');
            expect([...arr]).toEqual(['a', 'b']);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track shift mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)(['a', 'b', 'c'], onMutate);
            const removed = arr.shift();
            expect(removed).toBe('a');
            expect([...arr]).toEqual(['b', 'c']);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track unshift mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)(['b', 'c'], onMutate);
            arr.unshift('a');
            expect([...arr]).toEqual(['a', 'b', 'c']);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track splice mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)(['a', 'b', 'c', 'd'], onMutate);
            const removed = arr.splice(1, 2, 'x', 'y');
            expect(removed).toEqual(['b', 'c']);
            expect([...arr]).toEqual(['a', 'x', 'y', 'd']);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track sort mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([3, 1, 2], onMutate);
            arr.sort();
            expect([...arr]).toEqual([1, 2, 3]);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track reverse mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3], onMutate);
            arr.reverse();
            expect([...arr]).toEqual([3, 2, 1]);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track fill mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3], onMutate);
            arr.fill(0);
            expect([...arr]).toEqual([0, 0, 0]);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track copyWithin mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3, 4], onMutate);
            arr.copyWithin(0, 2);
            expect([...arr]).toEqual([3, 4, 3, 4]);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
    });
    describe('index assignment', () => {
        it('should track direct index assignment', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)(['a', 'b', 'c'], onMutate);
            arr[1] = 'x';
            expect([...arr]).toEqual(['a', 'x', 'c']);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track assignment to new index', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)(['a', 'b'], onMutate);
            arr[2] = 'c';
            expect([...arr]).toEqual(['a', 'b', 'c']);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
    });
    describe('length changes', () => {
        it('should track length reduction', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3, 4], onMutate);
            arr.length = 2;
            expect([...arr]).toEqual([1, 2]);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
        it('should track length increase', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2], onMutate);
            arr.length = 4;
            expect(arr.length).toBe(4);
            expect(onMutate).toHaveBeenCalledTimes(1);
        });
    });
    describe('non-mutating methods', () => {
        it('should not track map', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3], onMutate);
            const result = arr.map(x => x * 2);
            expect(result).toEqual([2, 4, 6]);
            expect([...arr]).toEqual([1, 2, 3]);
            expect(onMutate).not.toHaveBeenCalled();
        });
        it('should not track filter', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3], onMutate);
            const result = arr.filter(x => x > 1);
            expect(result).toEqual([2, 3]);
            expect([...arr]).toEqual([1, 2, 3]);
            expect(onMutate).not.toHaveBeenCalled();
        });
        it('should not track slice', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3], onMutate);
            const result = arr.slice(1);
            expect(result).toEqual([2, 3]);
            expect([...arr]).toEqual([1, 2, 3]);
            expect(onMutate).not.toHaveBeenCalled();
        });
        it('should not track forEach', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3], onMutate);
            let sum = 0;
            arr.forEach(x => sum += x);
            expect(sum).toBe(6);
            expect(onMutate).not.toHaveBeenCalled();
        });
    });
    describe('double-wrapping prevention', () => {
        it('should not wrap already tracked arrays', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1, 2, 3], onMutate);
            const arr2 = (0, arrayProxy_1.createTrackedArray)(arr, onMutate);
            expect(arr).toBe(arr2);
            expect(arr.__isTrackedArray).toBe(true);
        });
    });
    describe('multiple mutations', () => {
        it('should track multiple mutations', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([1], onMutate);
            arr.push(2);
            arr.push(3);
            arr[0] = 10;
            expect([...arr]).toEqual([10, 2, 3]);
            expect(onMutate).toHaveBeenCalledTimes(3);
        });
    });
    describe('chaining', () => {
        it('should work with method chaining that mutates', () => {
            const arr = (0, arrayProxy_1.createTrackedArray)([3, 1, 2], onMutate);
            arr.sort().reverse();
            expect([...arr]).toEqual([3, 2, 1]);
            expect(onMutate).toHaveBeenCalledTimes(2);
        });
    });
});
//# sourceMappingURL=arrayProxy.test.js.map