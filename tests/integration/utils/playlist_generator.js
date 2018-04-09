/**
 * Loop contents from a given start time, to build a metaplaylist.
 * @param {Array<Object>} baseContents // in format [{url, duration}, ...]
 * @param {number} startTime // in format timestamp e.g 1516961850
 * @param {number} occurences // number of loops to reproduce
 */
const metaplaylistGenerator = function (
  baseContents,
  baseTime,
  occurences
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
            transport: datas[k].transport
          }
        );
      }
    }
    return contents;
  }

  var metaplaylist = [];
  for (var i = 0; i < baseContents.length; i++) {
    const beforeContent =
      (metaplaylist.length != 0) ? metaplaylist[metaplaylist.length - 1] : undefined;
    const url = baseContents[i].url;
    const transport = baseContents[i].transport;
    const startTime = beforeContent ? beforeContent.endTime : (0 + baseTime);
    const duration = baseContents[i].duration;
    const endTime = startTime + duration;
    metaplaylist.push({
      url,
      startTime,
      endTime,
      transport
    });
  }
  return JSON.stringify({ contents: generateLoop(metaplaylist, occurences) });
}

export default metaplaylistGenerator;