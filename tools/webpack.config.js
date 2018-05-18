/* eslint-env node */

const webpack = require("webpack");
const isBarebone = process.env.RXP_BAREBONE === "true";

module.exports = {
  mode: "development",
  entry: "./src/exports.ts",
  output: {
    library: "RxPlayer",
    libraryTarget: "umd",
    filename: "rx-player.js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "__FEATURES__": {
        SMOOTH: isBarebone ?
          process.env.RXP_SMOOTH === "true" :
          process.env.RXP_SMOOTH !== "false",

        DASH: isBarebone ?
          process.env.RXP_DASH === "true" :
          process.env.RXP_DASH !== "false",

        METAPLAYLIST: process.env.RXP_METAPLAYLIST === "true",

        DIRECTFILE: isBarebone ?
          process.env.RXP_DIRECTFILE === "true" :
          process.env.RXP_DIRECTFILE !== "false",

        NATIVE_TTML: isBarebone ?
          process.env.RXP_NATIVE_TTML === "true" :
          process.env.RXP_NATIVE_TTML !== "false",

        NATIVE_SAMI: isBarebone ?
          process.env.RXP_NATIVE_SAMI === "true" :
          process.env.RXP_NATIVE_SAMI !== "false",

        NATIVE_VTT: isBarebone ?
          process.env.RXP_NATIVE_VTT === "true" :
          process.env.RXP_NATIVE_VTT !== "false",

        NATIVE_SRT: isBarebone ?
          process.env.RXP_NATIVE_SRT === "true" :
          process.env.RXP_NATIVE_SRT !== "false",

        HTML_TTML: isBarebone ?
          process.env.RXP_HTML_TTML === "true" :
          process.env.RXP_HTML_TTML !== "false",

        HTML_SAMI: isBarebone ?
          process.env.RXP_HTML_SAMI === "true" :
          process.env.RXP_HTML_SAMI !== "false",

        HTML_VTT: isBarebone ?
          process.env.RXP_HTML_VTT === "true" :
          process.env.RXP_HTML_VTT !== "false",

        HTML_SRT: isBarebone ?
          process.env.RXP_HTML_SRT === "true" :
          process.env.RXP_HTML_SRT !== "false",

        // TODO
        // EME: isBarebone ?
        //   process.env.RXP_EME === "true" :
        //   process.env.RXP_EME !== "false",
        // BIF: isBarebone ?
        //   process.env.RXP_BIF === "true" :
        //   process.env.RXP_BIF !== "false",
      },
      __DEV__: true,
      __LOGGER_LEVEL__: "\"INFO\"",
      "process.env": { NODE_ENV: JSON.stringify("development") },
    }),
  ],
  node: {
    console: false,
    global: true,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
    setImmediate: false,
  },
};
