import createDebugElement from "../../core/api/debug";
import type { IFeaturesObject } from "../../features/types";

/**
 * Add ability to parse SAMI text tracks in an HTML textrack mode.
 * @param {Object} features
 */
function addDebugElementFeature(features: IFeaturesObject): void {
  features.createDebugElement = createDebugElement;
}

export { addDebugElementFeature as DEBUG_ELEMENT };
export default addDebugElementFeature;
