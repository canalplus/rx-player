import TimelineIndex from "./timeline.js";
import ListIndex from "./list.js";
import TemplateIndex from "./template.js";
import SmoothIndex from "./smooth.js";
import BaseIndex from "./base.js";

const getRightIndexHelpers = index => {
  switch (index.indexType) {
  case "timeline":
    return TimelineIndex;
  case "list":
    return ListIndex;
  case "template":
    return TemplateIndex;
  case "smooth":
    return SmoothIndex;
  case "base":
    return BaseIndex;
  default:
    return TimelineIndex;
  }
};

export {
  getRightIndexHelpers,
};
