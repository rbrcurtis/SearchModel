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
                    const result = value.apply(target, args);
                    onMutate();
                    return result === target ? proxy : result;
                };
            }
            return value;
        },
        set(target, prop, value) {
            if (typeof prop === 'string' && !isNaN(Number(prop))) {
                target[prop] = value;
                onMutate();
                return true;
            }
            target[prop] = value;
            if (prop === 'length' && typeof value === 'number') {
                onMutate();
            }
            return true;
        }
    });
    proxy.__isTrackedArray = true;
    return proxy;
}
//# sourceMappingURL=arrayProxy.js.map