import launchTestsForContent from "../utils/launch_tests_for_content.js";

import {
  CustomAttributes,
  EmptyTextTrack,
  NotStartingAt0,
  Regular,
} from "../../contents/Smooth_static";

const { manifestInfos: emptyTextTrackManifestInfos } = EmptyTextTrack;
const { manifestInfos: NotStartingAt0ManifestInfos } = NotStartingAt0;
const { manifestInfos: regularManifestInfos } = Regular;
const { manifestInfos: customAttributesManifestInfos } = CustomAttributes;

describe("Smooth non-linear regular content", function () {
  launchTestsForContent(regularManifestInfos);
});

describe("Smooth non-linear with empty text track", function () {
  launchTestsForContent(emptyTextTrackManifestInfos);
});

describe("Smooth non-linear not starting at `0`", function () {
  launchTestsForContent(NotStartingAt0ManifestInfos);
});

describe("Smooth custom attributes", function () {
  launchTestsForContent(customAttributesManifestInfos);
});
