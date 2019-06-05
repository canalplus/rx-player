import launchTestsForContent from "../utils/launch_tests_for_content.js";

import {
  manifestInfos,
} from "../../contents/DASH_static_SegmentTemplate_Multi_Periods";

describe("DASH non-linear multi-periods content (SegmentTemplate)", function () {
  launchTestsForContent(manifestInfos);
});
