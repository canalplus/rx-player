/**
 * Loop contents from a given start time, to build a metaplaylist.
 * @param {Array<Object>} baseContents // in format [{url, duration}, ...]
 * @param {number} startTime // in format timestamp e.g 1516961850
 * @param {number} occurences // number of loops to reproduce
 */
const metaplaylistGenerator = function (
  baseContents,
  baseTime,
  occurences,
  attributes
) {
  function generateLoop(datas, times) {
    var contents = [];
    var durations = datas
      .map((data) => data.endTime - data.startTime);
    var sum = durations.reduce((a, b) => a + b, 0);

    for (var i = 0; i <= times - 1; i++) {
      for (var k = 0; k <= datas.length - 1; k++) {
        contents.push(
          {
            url: datas[k].url,
            startTime: datas[k].startTime + (sum * (i)),
            endTime: datas[k].endTime + (sum * (i)),
            transport: datas[k].transport,
            textTracks: datas[k].textTracks,
          }
        );
      }
    }
    return contents;
  }

  var playlist = [];
  for (var i = 0; i < baseContents.length; i++) {
    const beforeContent =
      (playlist.length != 0) ? playlist[playlist.length - 1] : undefined;
    const url = baseContents[i].url;
    const transport = baseContents[i].transport;
    const startTime = beforeContent ? beforeContent.endTime : (0 + baseTime);
    const duration = baseContents[i].duration;
    const endTime = startTime + duration;
    const textTracks = baseContents[i].textTracks;
    playlist.push({
      url,
      startTime,
      endTime,
      transport,
      textTracks
    });
  }
  const contents = generateLoop(playlist, occurences);
  const generatedAt = Date.now();
  const mplVersion = "1";
  const metaplaylist = {
    metadata: {
      name: "Demo HAPI contents",
      mplVersion,
      generatedAt,
    },
    contents,
    attributes
  }
  return JSON.stringify(metaplaylist);
}

export default metaplaylistGenerator;