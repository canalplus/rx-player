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

// TODO
// import _ from "lodash";
// import { expect } from "chai";
// import parser from "../parser";

// describe("smooth parser", function() {

//   xit("is has a parseFromString function", function() {
//     expect(parser.parseFromString).to.be.a("function");
//   });

//   xit("throws root if not SmoothStreamingMedia", function() {
//     expect(function() {
//       parser.parseFromString("<foo></foo>");
//     }).to.throw("parser: document root should be SmoothStreamingMedia");
//   });

//   xit("check major and minor versions", function() {
//     expect(function() {
//       parser.parseFromString("<SmoothStreamingMedia></SmoothStreamingMedia>");
//     }).to.throw();
//     expect(function() {
//       parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"1\"></SmoothStreamingMedia>");
//     }).to.throw();
//     expect(function() {
//       parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\"></SmoothStreamingMedia>");
//     }).to.throw();
//     expect(function() {
//       parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"3\"></SmoothStreamingMedia>");
//     }).to.throw();
//     expect(function() {
//       parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"0\"></SmoothStreamingMedia>");
//     }).to.not.throw();
//     expect(function() {
//       parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"1\"></SmoothStreamingMedia>");
//     }).to.not.throw();
//     expect(function() {
//       parser.parseFromString("<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"2\"></SmoothStreamingMedia>");
//     }).to.not.throw();
//   });

//   xit("parses Duration", function() {
//     expect(parser.parseFromString(
//       "<SmoothStreamingMedia " +
//       "MajorVersion=\"2\" MinorVersion=\"0\" " +
//       "Duration=\"1000\" Timescale=\"10\" IsLive=\"TRUE\">" +
//       "</SmoothStreamingMedia>"
//     ).periods[0].duration).to.equal(100);

//     expect(parser.parseFromString(
//       "<SmoothStreamingMedia " +
//       "MajorVersion=\"2\" MinorVersion=\"0\" " +
//       "Duration=\"\" IsLive=\"FALSE\">" +
//       "</SmoothStreamingMedia>"
//     ).periods[0].duration).to.equal(Infinity);

//     expect(parser.parseFromString(
//       "<SmoothStreamingMedia " +
//       "MajorVersion=\"2\" MinorVersion=\"0\" " +
//       "Duration=\"0\" IsLive=\"FALSE\">" +
//       "</SmoothStreamingMedia>"
//     ).periods[0].duration).to.equal(Infinity);
//   });

//   xit("parses IsLive", function() {
//     expect(parser.parseFromString(
//       "<SmoothStreamingMedia " +
//       "MajorVersion=\"2\" MinorVersion=\"0\" " +
//       "Duration=\"1000\" " +
//       "IsLive=\"TRUE\">" +
//       "</SmoothStreamingMedia>"
//     ).profiles).to.match(/isoff-live/);

//     expect(parser.parseFromString(
//       "<SmoothStreamingMedia MajorVersion=\"2\" MinorVersion=\"0\" Duration=\"\" IsLive=\"FALSE\">" +
//       "</SmoothStreamingMedia>"
//     ).profiles).not.to.match(/isoff-live/);
//   });

//   describe("Protection", function() {

//     beforeEach(function() {
//       this.json = {};
//       // this.json = parser
//       //   .parseFromString(require("raw!test/fixtures/isml.protection.xml"));
//       this.smoothProtection = this.json
//         .periods[0].adaptations[0].smoothProtection;
//     });

//     xit("has a smoothProtection attribute", function() {
//       expect(this.smoothProtection).to.be.ok;
//     });

//     xit("has hexa keyId", function() {
//       expect(this.smoothProtection.keyId).to.be.a("string");
//       expect(this.smoothProtection.keyId).to.have.length(32);
//     });

//     xit("has keySystems", function() {
//       expect(this.smoothProtection.keySystems).to.be.an("array");
//       expect(this.smoothProtection.keySystems).to.have.length(2);
//     });

//     xit("has a playReady keySystem", function() {
//       const playReady = _.find(this.smoothProtection.keySystems, {
//         systemId: "9a04f079-9840-4286-ab92-e65be0885f95",
//       });
//       expect(playReady).to.be.ok;
//       expect(playReady.privateData).to.be.instanceOf(Uint8Array);
//     });

//     xit("has a widevine keySystem", function() {
//       const widevine = _.find(this.smoothProtection.keySystems, {
//         systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
//       });
//       expect(widevine).to.be.ok;
//       expect(widevine.privateData).to.be.instanceOf(Uint8Array);
//     });
//   });

//   describe("Stream", function() {
//     beforeEach(function() {
//       this.json = {};
//       // this.json = parser
//       //   .parseFromString(require("raw!test/fixtures/isml.xml"), new Date);
//     });

//     xit("has duration", function() {
//       expect(this.json.periods[0].duration).is.a("number");
//       expect(this.json.periods[0].duration).equal(Infinity);
//     });

//     xit("is live", function() {
//       expect(this.json.profiles).to.match(/isoff-live/);
//     });

//     xit("has adaptations grouped by types (audio/video/text)", function() {
//       expect(this.json.periods[0].adaptations).to.be.an("array");
//       expect(this.json.periods[0].adaptations).to.have.length(5);
//     });
//   });

// });
