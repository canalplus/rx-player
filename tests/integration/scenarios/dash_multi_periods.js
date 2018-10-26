import launchTestsForContent from "../launch_tests_for_content.js";

import {
  manifestInfos,
  URLs,
} from "../../contents/DASH_static_SegmentTemplate_Multi_Periods";

describe("DASH non-linear multi-periods content (SegmentTemplate)", function () {
  launchTestsForContent(URLs, manifestInfos);
});
