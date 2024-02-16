/**
 * Create an HTML element.
 * @param {string} elementName - The element's name, like `"div"` for example.
 * @param {Object} [options={}] - Optional attributes for the element.
 * @param {string} [options.textContent] - Inner text for that element.
 * @param {string} [options.className] - Value for a `class` attribute
 * associated to this element.
 * @param {string} [options.href] - Value for a `href` attribute
 * associated to this element.
 * @returns {HTMLElement}
 */
export declare function createElement(elementName: "input", opts?: CreateElementOptions | undefined): HTMLInputElement;
export declare function createElement(elementName: "button", opts?: CreateElementOptions | undefined): HTMLButtonElement;
export declare function createElement(elementName: "a", opts?: CreateElementOptions | undefined): HTMLLinkElement;
export declare function createElement(elementName: "canvas", opts?: CreateElementOptions | undefined): HTMLCanvasElement;
export declare function createElement(elementName: string, opts?: CreateElementOptions | undefined): HTMLElement;
interface CreateElementOptions {
    textContent?: string | undefined;
    className?: string | undefined;
}
/**
 * Create an HTML element which may contain mutiple HTML sub-elements.
 * @param {string} rootElementName - The element's name, like `"div"` for
 * example.
 * @param {Array.<string|HTMLElement>} parts - The HTML sub-elements, in order.
 * Those can also just be strings, in which case only text nodes (and no actual
 * HTMLElement) will be added at this place.
 * @param {Object} [options={}] - Optional attributes for the element.
 * @param {string} [options.className] - Value for a `class` attribute
 * associated to this element.
 * @returns {HTMLElement}
 */
export declare function createCompositeElement(rootElementName: string, parts: Array<HTMLElement | string>, { className }?: {
    className?: string;
} | undefined): HTMLElement;
export declare function isExtendedMode(parentElt: HTMLElement): boolean;
export declare function createMetricTitle(title: string): HTMLElement;
export declare function createGraphCanvas(): HTMLCanvasElement;
export {};
