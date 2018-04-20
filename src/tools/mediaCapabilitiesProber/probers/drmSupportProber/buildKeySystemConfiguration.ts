/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const DEFAULT_WIDEVINE_ROBUSTNESSES = [
  "HW_SECURE_ALL",
  "HW_SECURE_DECODE",
  "HW_SECURE_CRYPTO",
  "SW_SECURE_DECODE",
  "SW_SECURE_CRYPTO",
];

interface IKeySystem {
  persistentLicense?: string;
  persistentStateRequired?: boolean;
  distinctiveIdentifierRequired?: boolean;
  videoRobustnesses?: Array<(string|undefined)>;
  audioRobustnesses?: Array<(string|undefined)>;
}

export default function buildKeySystemConfigurations(
  ksName: string,
  keySystem: IKeySystem
): MediaKeySystemConfiguration[] {
  const sessionTypes = ["temporary"];
  let persistentState: "optional" | "required" | "not-allowed" | undefined = "optional";
  let distinctiveIdentifier:
    "optional" | "required" | "not-allowed" | undefined = "optional";

  if (keySystem.persistentLicense) {
    persistentState = "required";
    sessionTypes.push("persistent-license");
  }

  if (keySystem.persistentStateRequired) {
    persistentState = "required";
  }

  if (keySystem.distinctiveIdentifierRequired) {
    distinctiveIdentifier = "required";
  }

  // Set robustness, in order of consideration:
  //   1. the user specified its own robustnesses
  //   2. a "widevine" key system is used, in that case set the default widevine
  //      robustnesses as defined in the config
  //   3. set an undefined robustness
  const videoRobustnesses = keySystem.videoRobustnesses ||
    (ksName === "widevine" ? DEFAULT_WIDEVINE_ROBUSTNESSES : []);
  const audioRobustnesses = keySystem.audioRobustnesses ||
    (ksName === "widevine" ? DEFAULT_WIDEVINE_ROBUSTNESSES : []);

  if (!videoRobustnesses.length) {
    videoRobustnesses.push(undefined);
  }

  if (!audioRobustnesses.length) {
    audioRobustnesses.push(undefined);
  }

  // From the W3 EME spec, we have to provide videoCapabilities and
  // audioCapabilities.
  // These capabilities must specify a codec (even though your stream can use
  // a completely different codec afterward).
  // It is also strongly recommended to specify the required security
  // robustness. As we do not want to forbide any security level, we specify
  // every existing security level from highest to lowest so that the best
  // security level is selected.
  // More details here:
  // https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
  // https://www.w3.org/TR/encrypted-media/#get-supported-configuration-and-consent
  const videoCapabilities = videoRobustnesses.map(robustness => ({
    contentType: "video/mp4;codecs=\"avc1.4d401e\"", // standard mp4 codec
    robustness,
  }));
  const audioCapabilities = audioRobustnesses.map(robustness => ({
    contentType: "audio/mp4;codecs=\"mp4a.40.2\"", // standard mp4 codec
    robustness,
  }));

  return [{
    initDataTypes: ["cenc"],
    videoCapabilities,
    audioCapabilities,
    distinctiveIdentifier,
    persistentState,
    sessionTypes,
  }];
}
