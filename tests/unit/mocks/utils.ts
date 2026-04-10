/**
 * Util useful to create mocked versions of classes with each of their methods
 * and properties replaced, while being properly checked by TypeScript.
 * @param {Object} methods - Each of this class' methods (key is the method
 * name, value is the implementation).
 * @param {Object} properties - Each of this class' property (key is the
 * property name, value is the implementation).
 * @returns {*} - The mocked class, which should respect its public API.
 */
export function makeMockedClass<T>(
  methods: MethodsMap<T>,
  properties: PropertiesMap<T>,
): { new (opts?: Partial<T>): T; prototype: IPrototype<T> } {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class Dummy {
    constructor(opts: Partial<T> = {}) {
      // Apply default property values
      for (const key in properties) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) {
          // @ts-expect-error dynamic assignment
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this[key] = properties[key];
        }
      }
      // Override with any provided opts
      for (const key in opts) {
        if (Object.prototype.hasOwnProperty.call(opts, key)) {
          // @ts-expect-error dynamic assignment
          this[key] = opts[key];
        }
      }
    }
  }
  for (const [name, fn] of Object.entries(methods)) {
    // @ts-expect-error dynamic assignment
    Dummy.prototype[name as keyof typeof Dummy.prototype] = fn;
  }
  return Dummy as unknown as { new (opts?: Partial<T>): T; prototype: IPrototype<T> };
}

/* eslint-disable @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-restricted-types */
type IPrototype<T> = { [K in keyof T as T[K] extends Function ? K : never]: T[K] };

// Splits T's keys into method keys and property keys
type MethodKeys<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
type PropertyKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
/* eslint-enable @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-restricted-types */

type MethodsMap<T> = { [K in MethodKeys<T>]: T[K] };
type PropertiesMap<T> = { [K in PropertyKeys<T>]: T[K] };
