/*
*   Parse XML into a document
*   @param {Object} text: string to convert
    @return {Object} xmlDoc: the converted document
*/
export default function parseXML(text) {
  if (text !== "") {
    try {
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();
        return parser.parseFromString(text, "text/xml");
      }
      const xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async = "false";
      xmlDoc.loadXML(text);
      return xmlDoc;
    } catch (e) {
    }
  }

  return null;
}
