/* tslint:disable file-header */
import { IStyleElements } from "./parse_style_block";

/**
 * Creates default classes defined in the W3 specification
 *
 * https://www.w3.org/TR/webvtt1/#default-classes
 */

const colorMap: { [colorName: string]: string } = {
  white: "#ffffff",
  lime: "#00ff00",
  cyan: "#00ffff",
  red: "#ff0000",
  yellow: "#ffff00",
  magenta: "#ff00ff",
  blue: "#0000ff",
  black: "#000000",
};

export default function createDefaultStyleElements(): IStyleElements {
  return Object.keys(colorMap).reduce<IStyleElements>((result, key) => {
    result[key] = `color: ${colorMap[key]}`;
    result[`bg_${key}`] = `background-color: ${colorMap[key]}`;
    return result;
  }, {});
}
