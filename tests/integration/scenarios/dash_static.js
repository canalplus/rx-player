import launchTestsForContent from "../launch_tests_for_content.js";

import {
  manifestInfos,
  URLs,
} from "../../contents/DASH_static_SegmentTimeline";

describe("DASH non-linear content (SegmentTimeline)", function () {
  launchTestsForContent(URLs, manifestInfos);
});
