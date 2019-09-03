import launchTestsForContent from "../utils/launch_tests_for_content.js";
import {
  manifestInfos as segmentTimelineManifestInfos,
  notStartingAt0ManifestInfos,
} from "../../contents/DASH_static_SegmentTimeline";
import {
  manifestInfos as segmentBaseManifestInfos,
} from "../../contents/DASH_static_SegmentBase_multi_codecs";

describe("DASH non-linear content (SegmentTimeline)", function () {
  launchTestsForContent(segmentTimelineManifestInfos);
});

describe("DASH non-linear content multi-codecs (SegmentBase)", function () {
  launchTestsForContent(segmentBaseManifestInfos);
});

describe("DASH non-linear content not starting at 0 (SegmentTimeline)", function () {
  launchTestsForContent(notStartingAt0ManifestInfos);
});
