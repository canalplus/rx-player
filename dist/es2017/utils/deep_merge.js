import objectAssign from "./object_assign";
/**
 * Check if an item is an object
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
    return (item !== null &&
        item !== undefined &&
        !Array.isArray(item) &&
        typeof item === "object");
}
/**
 * Deeply merge nested objects
 * @param target
 * @param sources
 * @returns output : merged object
 */
export default function deepMerge(target, ...sources) {
    if (sources.length === 0) {
        return target;
    }
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                let newTarget = target[key];
                if (newTarget === undefined) {
                    newTarget = {};
                    target[key] = newTarget;
                }
                deepMerge(newTarget, source[key]);
            }
            else {
                objectAssign(target, { [key]: source[key] });
            }
        }
    }
    return deepMerge(target, ...sources);
}
