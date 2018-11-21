import launchTestsForContent from "../launch_tests_for_content.js";

import {
  manifestInfos,
  URLs,
} from "../../contents/Smooth_static_bif";

describe.only("Smooth non-linear content", function () {
  launchTestsForContent(URLs, manifestInfos);
});
