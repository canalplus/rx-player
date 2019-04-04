import reduceChildren from "../../../reduce_children";
import { parsedTimeCode } from "../../../../utils/timecode";
import parseTransition from "../../../node_commons/transition";
import {
  parseStartDateTime,
  parseSmpteTimeCode,
} from "../../../node_commons/time";

export function parsePrimaryEvent(node) { // assuming primary is video stream

  function parseLengthOption(node) {

    function parseSmpteDuration(node) {
      return reduceChildren(node, (res, name, node) => {
        switch (name.toLowerCase()) {
          case "ns1:smpteduration":
            return parseSmpteTimeCode(node);
        }
        return res;
      }, undefined);
    }

    return reduceChildren(node, (res, name, node) => {
      switch (name.toLowerCase()) {
        case "ns1:duration":
          return parseSmpteDuration(node);
      }
      return res;
    }, undefined);
  }

  return reduceChildren(node, (res, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:eventtitle":
        res.title = node.textContent;
        break;
      case "ns1:startdatetime":
        res.startTime = parseStartDateTime(node);
        break;
      case "ns1:lengthoption":
        res.duration = parsedTimeCode(parseLengthOption(node), 25);
        break;
      case "ns1:transitions":
        res.transitions = parseTransition(node);
        break;
    }
    return res;
  }, {});
}