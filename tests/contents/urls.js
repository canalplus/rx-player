/* eslint-env node */

// Every URLs served by our server. For test purposes.

const urls1 = require("./Smooth_static/urls");
const urls2 = require("./DASH_dynamic_UTCTimings/urls");
const urls3 = require("./DASH_static_SegmentTimeline/urls");
const urls4 = require("./DASH_dynamic_SegmentTemplate/urls");
const urls5 = require("./DASH_dynamic_SegmentTimeline/urls");
const urls6 = require("./DASH_static_SegmentBase/urls");
const urls7 = require("./DASH_static_SegmentTemplate_Multi_Periods/urls");
const urls8 = require("./directfile_webm/urls");
const urls9 = require("./DASH_dynamic_SegmentTemplate_Multi_Periods/urls");
const urls10 = require("./DASH_static_broken_cenc_in_MPD/urls");

module.exports = [
  ...urls1,
  ...urls2,
  ...urls3,
  ...urls4,
  ...urls5,
  ...urls6,
  ...urls7,
  ...urls8,
  ...urls9,
  ...urls10,
];
