import { DummyMediaElement } from "../../compat/dummy_media_element";

const dummyMediaElementFeature = {
  create(): DummyMediaElement {
    return new DummyMediaElement();
  },
};

export { dummyMediaElementFeature as DUMMY_MEDIA_ELEMENT };
export default dummyMediaElementFeature;
