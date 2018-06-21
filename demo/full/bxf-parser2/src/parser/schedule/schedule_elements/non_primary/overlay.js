import reduceChildren from "../../../reduce_children";
import { parsedTimeCode } from "../../../../utils/timecode";
import parseTransition from "../../../node_commons/transition";
import { parseStartDateTime } from "../../../node_commons/time";

/**
 * Parse logo event data
 * @param {Element} node
 */
export default function parseOverlay(node, _name){
  return reduceChildren(node, (res, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:eventtitle":
        res.title = node.textContent;
        break;
      case "ns1:nonprimaryevent":
        res.offset = reduceChildren(node, (res, name, node) => {
          switch (name.toLowerCase()) {
            case "ns1:offset":
              const from = node.attributes[1].value;
              const direction = node.attributes[0].value;
              const TC = parsedTimeCode(node.textContent, 25);
              const orientedTC = direction === "Positive" ? TC : -TC;
              switch(from){
                case "BeginningofEvent":
                  res.begin = orientedTC;
                  break;
                case "EndofEvent":
                  res.ending = orientedTC;
                  break;
              }
              break;
          }
          return res;
        }, {begin: undefined, ending: undefined});
        break;
      case "ns1:startdatetime":
        res.startTime = parseStartDateTime(node);
        break;
      case "ns1:transitions":
        res.transitions = parseTransition(node);
    }
    res.type = _name;
    return res;
  }, {});
}