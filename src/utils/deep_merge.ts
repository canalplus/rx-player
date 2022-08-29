import objectAssign from "./object_assign";

/**
 * Check if an item is an object
 * @param item
 * @returns {boolean}
 */
function isObject(item: unknown) : boolean {
  return (item !== null
          && item !== undefined
          && !Array.isArray(item)
          && typeof item === "object");
}

type IDeepPartial<T> = {
  [P in keyof T]?: IDeepPartial<T[P]> ;
};

type ISourcesArgument<T> = Array<IDeepPartial<T>|unknown>;

/**
 * Deeply merge nested objects
 * @param target
 * @param sources
 * @returns output : merged object
 */
export default function deepMerge<
  T extends Record<string | number | symbol, unknown>
>(target: T, ...sources: ISourcesArgument<T>): T {
  if (sources.length === 0) {
    return target;
  }
  const source = sources.shift() as IDeepPartial<T>;
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        let newTarget = target[key] as Record<string | number | symbol, unknown>;
        if (newTarget === undefined) {
          newTarget = {};
          (target[key] as Record<string | number | symbol, unknown>) = newTarget;
        }
        deepMerge(newTarget, source[key] as IDeepPartial<typeof newTarget>);
      } else {
        objectAssign(target, { [key]: source[key] });
      }
    }
  }
  return deepMerge(target, ...sources);
}
