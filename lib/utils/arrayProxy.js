"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrackedArray = createTrackedArray;
function createTrackedArray(arr, onMutate) {
    if (arr.__isTrackedArray) {
        return arr;
    }
    const proxy = new Proxy(arr, {
        get(target, prop) {
            const value = target[prop];
            const mutatingMethods = [
                'push', 'pop', 'shift', 'unshift', 'splice',
                'sort', 'reverse', 'fill', 'copyWithin'
            ];
            if (typeof prop === 'string' && mutatingMethods.includes(prop)) {
                return function (...args) {
                    const before = [...target];
                    const result = value.apply(target, args);
                    onMutate(before);
                    return result === target ? proxy : result;
                };
            }
            return value;
        },
        set(target, prop, value) {
            if (typeof prop === 'string' && !isNaN(Number(prop))) {
                const before = [...target];
                target[prop] = value;
                onMutate(before);
                return true;
            }
            const before = [...target];
            target[prop] = value;
            if (prop === 'length' && typeof value === 'number') {
                onMutate(before);
            }
            return true;
        }
    });
    proxy.__isTrackedArray = true;
    return proxy;
}
//# sourceMappingURL=arrayProxy.js.map