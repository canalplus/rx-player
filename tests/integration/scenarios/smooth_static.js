import launchTestsForContent from "../utils/launch_tests_for_content.js";

import {
  manifestInfos,
  URLs,
} from "../contents/Smooth_static_bif";

// TODO investigate weird test clean-up bug
xdescribe("Smooth non-linear content", function () {
  launchTestsForContent(URLs, manifestInfos);
});
