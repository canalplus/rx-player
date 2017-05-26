const TimelineIndex = require("./timeline.js");
const ListIndex = require("./list.js");
const TemplateIndex = require("./template.js");
const SmoothIndex = require("./smooth.js");
const BaseIndex = require("./base.js");

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

module.exports = {
  getRightIndexHelpers,
};
