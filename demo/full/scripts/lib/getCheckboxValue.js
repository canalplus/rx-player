/**
 * @param {HTMLElement} checkBoxElt
 * @returns {boolean}
 */
function getCheckBoxValue(checkBoxElt) {
  return checkBoxElt.type === "checkbox"
    ? !!checkBoxElt.checked
    : !!checkBoxElt.value;
}

export default getCheckBoxValue;
