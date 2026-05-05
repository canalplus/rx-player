import EnvDetector from "./env_detector.ts";

/**
 * Return `true` if the current device is compatible with the Worker API.
 *
 * Some old webkit devices, such as the PlayStation 4, returns weird results
 * when doing the most straightforward check. We have to check if other Webkit
 * devices have the same issue.
 * @returns {boolean}
 */
export default function hasWorkerApi(): boolean {
  return EnvDetector.device === EnvDetector.DEVICES.PlayStation4
    ? typeof Worker === "object" || typeof Worker === "function"
    : typeof Worker === "function";
}
