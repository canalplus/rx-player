import { expect } from "chai";
import {
  manifestURL1,
  manifestURL2,
  manifestURL3,
  manifestURL4,
} from "../../contents/static_manifests_for_metaplaylist";
import createMetaplaylist from "../../../src/experimental/tools/createMetaplaylist";

describe("createMetaplaylist", () => {
  it("Should correclty create the metaplaylist without offset", async () => {
    const contentsInfos = [{ url: manifestURL1,
                             transport: "dash" },
                           { url: manifestURL2,
                             transport: "dash" },
                           { url: manifestURL3,
                             transport: "smooth" },
                           { url: "test-URL",
                             transport: "dash",
                             duration: 100 } ];

    const metaplaylist = await createMetaplaylist(contentsInfos);
    expect(metaplaylist.type).to.equal("MPL");
    expect(metaplaylist.version).to.equal("0.1");
    expect(metaplaylist.dynamic).to.equal(false);

    const { contents } = metaplaylist;
    expect(contents[0].startTime).to.equal(0);
    expect(contents[0].endTime).to.equal(193.68);
    expect(contents[1].startTime).to.equal(193.68);
    expect(contents[1].endTime).to.equal(927.6800000000001);
    expect(contents[2].startTime).to.equal(927.6800000000001);
    expect(contents[2].endTime).to.equal(1071.8506666);
    expect(contents[3].url).to.equal("test-URL");
    expect(contents[3].startTime).to.equal(1071.8506666);
    expect(contents[3].endTime).to.equal(1071.8506666 + 100);
  });


  it("Should correclty create the metaplaylist with an offset", async () => {
    const contentsInfos = [{ url: manifestURL1,
                             transport: "dash" },
                           { url: manifestURL2,
                             transport: "dash" },
                           { url: manifestURL3,
                             transport: "smooth" },
                           { url: "test-URL",
                             transport: "dash",
                             duration: 100 } ];

    const metaplaylist = await createMetaplaylist(contentsInfos, 10);
    expect(metaplaylist.type).to.equal("MPL");
    expect(metaplaylist.version).to.equal("0.1");
    expect(metaplaylist.dynamic).to.equal(false);

    const { contents } = metaplaylist;
    expect(contents[0].startTime).to.equal(0 + 10);
    expect(contents[0].endTime).to.equal(193.68 + 10);
    expect(contents[1].startTime).to.equal(193.68 + 10);
    expect(contents[1].endTime).to.equal(927.6800000000001 + 10);
    expect(contents[2].startTime).to.equal(927.6800000000001 + 10);
    expect(contents[2].endTime).to.equal(1071.8506666 + 10);
    expect(contents[3].url).to.equal("test-URL");
    expect(contents[3].startTime).to.equal(1071.8506666 + 10);
    expect(contents[3].endTime).to.equal(1071.8506666 + 100 + 10);
  });

  it("Should throw if there is an unsupported transport", async () => {
    const contentsInfos = [{ url: manifestURL1,
                             transport: "rtmp" },
                           { url: manifestURL2,
                             transport: "dash" },
                           { url: manifestURL3,
                             transport: "smooth" },
                           { url: "test-URL",
                             transport: "dash",
                             duration: 100 } ];
    let error;
    try {
      await createMetaplaylist(contentsInfos);
    } catch(err) {
      error = err;
    }

    expect(typeof error).to.equal("object");
    expect(error.message).to.equal("createMetaplaylist: Unknown transport type.");
  });

  it("Should throw if there is a dynamic manifest", async () => {
    const contentsInfos = [{ url: manifestURL4,
                             transport: "dash" },
                           { url: manifestURL2,
                             transport: "dash" },
                           { url: manifestURL3,
                             transport: "smooth" },
                           { url: "test-URL",
                             transport: "dash",
                             duration: 100 } ];
    let error;
    try {
      await createMetaplaylist(contentsInfos);
    } catch(err) {
      error = err;
    }

    expect(typeof error).to.equal("object");
    expect(error.message).to.equal("createMetaplaylist: No duration on DASH content.");
  });
});