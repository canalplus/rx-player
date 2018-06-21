import parseOverlay from "./overlay";
import reduceChildren from "../../../reduce_children";

export function parseNonPrimaryEvent(parentNode) {
  return reduceChildren(parentNode, (res, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:nonprimaryevent":
        res = reduceChildren(node, (res, name, node) => {
          switch (name.toLowerCase()) {
            case "ns1:nonprimaryeventname":
              switch (node.textContent) {
                case "VZ_LOGO":
                  res = parseOverlay(parentNode, "vz_logo");
                  break;
                case "LOGO":
                  res = parseOverlay(parentNode, "csa_picto");
                  break;
                case "VZ_PPDT":
                  res = parseOverlay(parentNode, "ppdt");
                  break;
                default:
                  break;
              }
              break;
          }
          return res;
        }, undefined);
        break;
    }
    return res;
  }, undefined);
}