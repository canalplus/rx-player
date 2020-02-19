import { expect } from "chai";
import {
  manifestURL1,
  manifestURL2,
  manifestURL3,
  manifestURL4,
} from "../../contents/static_manifests_for_metaplaylist";
import createMetaplaylist from "../../../src/experimental/tools/createMetaplaylist";

describe("Metaplaylist Maker", () => {
  it("Should correclty create the metaplaylist", (done) => {
    const contentsInfos = [{ url: manifestURL1,
                             transport: "dash" },
                           { url: manifestURL2,
                             transport: "dash" },
                           { url: manifestURL3,
                             transport: "smooth" },
                           { url: "test-URL",
                             transport: "dash",
                             duration: 100 } ];

    createMetaplaylist(contentsInfos).then((metaplaylist) => {
      expect(metaplaylist.type).to.equal("MPL");
      expect(metaplaylist.version).to.equal("0.1");
      expect(metaplaylist.dynamic).to.equal(false);

      const { contents } = metaplaylist;
      expect(contents[0].startTime).to.equal(0);
      expect(contents[0].endTime).to.equal(193.68097777777777);
      expect(contents[1].startTime).to.equal(193.68097777777777);
      expect(contents[1].endTime).to.equal(928.6809777777778);
      expect(contents[2].startTime).to.equal(928.6809777777778);
      expect(contents[2].endTime).to.equal(1072.8516443777778);
      expect(contents[3].url).to.equal("test-URL");
      expect(contents[3].startTime).to.equal(1072.8516443777778);
      expect(contents[3].endTime).to.equal(1072.8516443777778 + 100);
      done();
    });
  });

  it("Should throw if there is an unsupported transport", (done) => {
    const contentsInfos = [{ url: manifestURL1,
                             transport: "rtmp" },
                           { url: manifestURL2,
                             transport: "dash" },
                           { url: manifestURL3,
                             transport: "smooth" },
                           { url: "test-URL",
                             transport: "dash",
                             duration: 100 } ];
    createMetaplaylist(contentsInfos).catch((err) => {
      expect(typeof err).to.equal("object");
      expect(err.message).to.equal("Metaplaylist Maker: Unknown transport type.");
      done();
    });
  });

  it("Should throw if there is a dynamic manifest", (done) => {
    const contentsInfos = [{ url: manifestURL4,
                             transport: "dash" },
                           { url: manifestURL2,
                             transport: "dash" },
                           { url: manifestURL3,
                             transport: "smooth" },
                           { url: "test-URL",
                             transport: "dash",
                             duration: 100 } ];
    createMetaplaylist(contentsInfos).catch((err) => {
      expect(typeof err).to.equal("object");
      expect(err.message).to.equal("Metaplaylist maker: Can't handle dynamic manifests.");
      done();
    });
  });
});