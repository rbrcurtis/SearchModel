/**
 * Creates a Proxy wrapper around an array that tracks mutations.
 *
 * When any mutating array method is called (push, pop, splice, etc.),
 * the onMutate callback is invoked to mark the field as changed.
 *
 * @param arr - The array to wrap
 * @param onMutate - Callback to invoke when array is mutated
 * @returns Proxied array with mutation tracking
 */
export function createTrackedArray<T>(
  arr: T[],
  onMutate: () => void
): T[] {
  // Store reference to avoid re-proxying
  if ((arr as any).__isTrackedArray) {
    return arr;
  }

  const proxy = new Proxy(arr, {
    get(target, prop) {
      const value = target[prop as keyof typeof target];

      // Methods that mutate the array
      const mutatingMethods = [
        'push', 'pop', 'shift', 'unshift', 'splice',
        'sort', 'reverse', 'fill', 'copyWithin'
      ];

      if (typeof prop === 'string' && mutatingMethods.includes(prop)) {
        return function (...args: any[]) {
          const result = (value as any).apply(target, args);
          onMutate();
          // For methods that return the array itself (like sort, reverse), return the proxy
          return result === target ? proxy : result;
        };
      }

      return value;
    },

    set(target, prop, value) {
      // Direct index assignment: arr[0] = 'new value'
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        target[prop as any] = value;
        onMutate();
        return true;
      }

      // Length assignment or other properties
      target[prop as any] = value;

      // Only trigger onMutate for length changes that actually modify the array
      if (prop === 'length' && typeof value === 'number') {
        onMutate();
      }

      return true;
    }
  });

  // Mark as tracked to avoid double-wrapping
  (proxy as any).__isTrackedArray = true;

  return proxy;
}
