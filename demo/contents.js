module.exports = [
  {
    "name": "BIF Thumbnail Track example",
    "url": "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/Manifest",
    "transport": "smooth",
    "ciphered": false,
    "live": false,
    "images": {
      "mimeType": "application/bif",
      "url": "http://dash-vod-aka-test.canal-bis.com/test/bif/index.bif"
    },
  },
  {
    "name": "Unified Streaming Live",
    "url": "http://live.unified-streaming.com/loop/loop.isml/loop.mpd?format=mp4&session_id=25020",
    "transport": "dash",
    "ciphered": false,
    "live": true
  },
  {
    "name": "Envivio",
    "url": "http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd",
    "transport": "dash",
    "ciphered": false,
    "live": false
  },
];
