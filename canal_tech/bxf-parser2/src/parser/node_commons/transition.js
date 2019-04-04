import reduceChildren from "../reduce_children";

export default function parseTransition(node) {
  return reduceChildren(node, (res, name, node) => {
    switch (name.toLowerCase()) {
      case "ns1:videotransitions":
        const videoTransition = reduceChildren(node, (res, name, node) => {
          switch (name.toLowerCase()) {
            case "ns1:transitionintype":
              res = node.textContent;
              break;
          }
          return res;
        }, undefined);
        if(res === undefined){
          res = {videoTransitions: []};
        }
        res.videoTransitions.push(videoTransition);
        break;
    }
    return res;
  }, undefined);
}