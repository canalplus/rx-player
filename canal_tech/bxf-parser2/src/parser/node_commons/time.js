import reduceChildren from "../reduce_children";
import { parsedTimeCode } from "../../utils/timecode";

export function parseSmpteTimeCode(node) {
  return reduceChildren(node, (res, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:smptetimecode":
        return node.textContent;
    }
    return res;
  }, undefined);
}

export function parseStartDateTime(node) {
  return reduceChildren(node, (res, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:smptedatetime":
        const base = node.attributes[0].value;
        const baseUTC = new Date(base).getTime() / 1000;
        const time = parseSmpteTimeCode(node);
        const timeSeconds = parsedTimeCode(time, 25);
        return baseUTC + timeSeconds;
    }
    return res;
  }, undefined);
}