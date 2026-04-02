// @ts-check

import { spawn } from "child_process";

/**
 * Build the full ffmpeg argument list for the live-packaging pipeline.
 *
 * Three synthetic video sources (720p / 480p / 360p) and three sine-wave
 * audio sources (English / French / Armenian) are muxed into separate MPEG-TS
 * UDP streams consumed by shaka-packager.
 *
 * @param {object} opts
 * @param {number} opts.frameRate
 * @param {number} opts.segmentDuration   - Used to compute the GOP size.
 * @param {{ p720: number, p480: number, p360: number,
 *            audio1: number, audio2: number, audio3: number }} opts.ports
 * @returns {string[]}
 */
export function buildFfmpegArgs({ frameRate, segmentDuration, ports }) {
  const gop = frameRate * segmentDuration;

  /**
   * @param {string} size
   * @param {number} rate
   * @returns {Array.<string>}
   */
  const videoInput = (size, rate) => [
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${size}:rate=${rate}`,
  ];

  /**
   * @param {number} freq
   * @returns {Array.<string>}
   */
  const audioInput = (freq) => [
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${freq}:sample_rate=48000`,
  ];

  /**
   * @param {number} mapIdx
   * @param {string} bitrate
   * @param {string} size
   * @param {number} port
   * @returns {Array.<string>}
   */
  const videoOutput = (mapIdx, bitrate, size, port) => [
    "-map",
    `${mapIdx}:v`,
    "-c:v",
    "libx264",
    "-preset",
    "superfast",
    "-b:v",
    bitrate,
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    "-r",
    String(frameRate),
    "-s",
    size,
    "-f",
    "mpegts",
    `udp://127.0.0.1:${port}`,
  ];

  /**
   * @param {number} mapIdx
   * @param {string} lang
   * @param {number} port
   * @returns {Array.<string>}
   */
  const audioOutput = (mapIdx, lang, port) => [
    "-map",
    `${mapIdx}:a`,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-metadata:s:a",
    `language=${lang}`,
    "-f",
    "mpegts",
    `udp://127.0.0.1:${port}`,
  ];

  return [
    "-re",
    // inputs (indices 0-5)
    ...videoInput("1280x720", frameRate),
    ...videoInput("854x480", frameRate),
    ...videoInput("640x360", frameRate),
    ...audioInput(261.63), // C4 ≈ English
    ...audioInput(293.66), // D4 ≈ French
    ...audioInput(329.63), // E4 ≈ Armenian
    // video outputs
    ...videoOutput(0, "2500k", "1280x720", ports.p720),
    ...videoOutput(1, "1200k", "854x480", ports.p480),
    ...videoOutput(2, "600k", "640x360", ports.p360),
    // audio outputs
    ...audioOutput(3, "eng", ports.audio1),
    ...audioOutput(4, "fre", ports.audio2),
    ...audioOutput(5, "arm", ports.audio3),
  ];
}

/**
 * Spawn ffmpeg with the given arguments.
 *
 * @param {string[]} args
 * @returns {import("child_process").ChildProcess}
 */
export function spawnFfmpeg(args) {
  const proc = spawn("ffmpeg", args, { stdio: "inherit" });
  console.log(`ffmpeg started with PID: ${proc.pid}`);
  return proc;
}
