/* eslint-env node */

// Every URLs served by our server. For test purposes.

import urls1 from "./Smooth_static/urls.mjs";
import urls2 from "./DASH_dynamic_UTCTimings/urls.mjs";
import urls3 from "./DASH_static_SegmentTimeline/urls.mjs";
import urls4 from "./DASH_dynamic_SegmentTemplate/urls.mjs";
import urls5 from "./DASH_dynamic_SegmentTimeline/urls.mjs";
import urls6 from "./DASH_static_SegmentBase/urls.mjs";
import urls7 from "./DASH_static_SegmentTemplate_Multi_Periods/urls.mjs";
import urls8 from "./directfile_webm/urls.mjs";
import urls9 from "./DASH_dynamic_SegmentTemplate_Multi_Periods/urls.mjs";
import urls10 from "./DASH_static_broken_cenc_in_MPD/urls.mjs";
import urls11 from "./DASH_static_number_based_SegmentTimeline/urls.mjs";
import urls12 from "./DASH_DRM_static_SegmentTemplate/urls.mjs";

export default [
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
  ...urls11,
  ...urls12,
];
