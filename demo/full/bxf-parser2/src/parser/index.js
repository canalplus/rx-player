import reduceChildren from "./reduce_children";
import parseSchedule from "./schedule";

/**
 * Parses BXF XML (string format)
 * and reduces it into a JSON.
 * @param {string} xmlString
 */
export default function BXFParser(xmlString) {

  const xmlDoc = new DOMParser().parseFromString(xmlString, "text/xml");
  const bxf = xmlDoc
    .childNodes[0].childNodes[1].childNodes[1].childNodes[1].childNodes[3].childNodes[1];

  const bxfData = reduceChildren(bxf, (data, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:bxfdata":
        data = parseBXFData(node);
    }
    return data;
  }, undefined);

  /**
   * Extract schedule(s) from bxd Data, and parse it.
   * @param {Element} bxfData
   */
  function parseBXFData(bxfData) {
    return reduceChildren(bxfData, (res, name, node) => {
      switch (name.toLowerCase()) {
        case "ns1:schedule":
          res.contents = parseSchedule(node);
      }
      return res;
    }, {});
  }

  return bxfData;
}
