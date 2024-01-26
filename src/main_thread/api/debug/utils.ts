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
export function createElement(
  elementName: "input",
  opts?: CreateElementOptions | undefined,
): HTMLInputElement;
export function createElement(
  elementName: "button",
  opts?: CreateElementOptions | undefined,
): HTMLButtonElement;
export function createElement(
  elementName: "a",
  opts?: CreateElementOptions | undefined,
): HTMLLinkElement;
export function createElement(
  elementName: "canvas",
  opts?: CreateElementOptions | undefined,
): HTMLCanvasElement;
export function createElement(
  elementName: string,
  opts?: CreateElementOptions | undefined,
): HTMLElement;
export function createElement(
  elementName: string,
  { textContent, className }: CreateElementOptions | undefined = {},
): HTMLElement {
  const elt = document.createElement(elementName);
  if (className !== undefined) {
    elt.className = className;
  }
  if (textContent !== undefined) {
    elt.textContent = textContent;
  }
  return elt;
}

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
export function createCompositeElement(
  rootElementName: string,
  parts: Array<HTMLElement | string>,
  { className }: { className?: string } | undefined = {},
): HTMLElement {
  const elt = document.createElement(rootElementName);
  if (className !== undefined) {
    elt.className = className;
  }
  for (const subElt of parts) {
    if (typeof subElt === "string") {
      elt.appendChild(document.createTextNode(subElt));
    } else {
      elt.appendChild(subElt);
    }
  }
  return elt;
}

export function isExtendedMode(parentElt: HTMLElement): boolean {
  return parentElt.clientHeight > 400;
}

export function createMetricTitle(title: string): HTMLElement {
  const elt = createElement("span", {
    textContent: title + "/",
  });
  elt.style.fontWeight = "bold";
  return elt;
}

export function createGraphCanvas(): HTMLCanvasElement {
  const canvasElt = createElement("canvas");
  canvasElt.style.border = "1px solid white";
  canvasElt.style.height = "15px";
  canvasElt.style.marginLeft = "2px";
  return canvasElt;
}
