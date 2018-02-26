import React from "react";
import Button from "../components/Button.jsx";
import TextInput from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import contentsDatabase from "../contents.js";

const TRANSPORT_TYPES = ["MetaPLAYLIST", "DASH", "Smooth"];
const CONTENTS_PER_TYPE = TRANSPORT_TYPES.reduce((acc, tech) => {
  acc[tech] = contentsDatabase.filter(({ transport }) =>
    transport === tech.toLowerCase()
  );
  return acc;
}, {});

class ContentList extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = {
      transportType: TRANSPORT_TYPES[0],
      choiceIndex: 0,
      hasTextInput: !CONTENTS_PER_TYPE[TRANSPORT_TYPES[0]].length,
      textValue: "",
    };
  }

  loadContent(content) {
    const { loadVideo, stopVideo } = this.props;
    if (content == null) {
      stopVideo();
      return;
    }

    const {
      url,
      transport,
      autoPlay,
      supplementaryImageTracks,
      supplementaryTextTracks,
      textTrackMode,
    } = content;
    loadVideo({
      url,
      transport,
      autoPlay: !(autoPlay === false),
      supplementaryImageTracks,
      supplementaryTextTracks,
      textTrackMode,
    });
  }

  loadUrl(url) {
    const { loadVideo } = this.props;
    loadVideo({
      url,
      transport: this.state.transportType.toLowerCase(),
      autoPlay: true, // TODO add checkBox
      // native browser subtitles engine (VTTCue) doesn't render stylized subs
      // we force HTML textTrackMode to vizualise styles
      textTrackMode: "html",
    });
  }

  changeTransportType(transportType) {
    this.setState({
      transportType,
      choiceIndex: 0,
      hasTextInput: !CONTENTS_PER_TYPE[transportType].length,
    });
  }

  changeContentIndex(index) {
    const { transportType } = this.state;
    const hasTextInput = CONTENTS_PER_TYPE[transportType].length === index;
    this.setState({
      choiceIndex: index,
      hasTextInput,
    });
  }

  // TODO Better event?
  onTextInput(evt) {
    this.setState({
      textValue: evt.target.value,
    });
  }

  render() {
    const { transportType, choiceIndex, hasTextInput, textValue } = this.state;
    const contents = CONTENTS_PER_TYPE[transportType];

    const contentsName = contents.map(content =>
      `${content.name}${content.live ? " (live)" : ""}`
    );
    contentsName.push("Custom link");

    const onTechChange = (evt) => {
      const index = +evt.target.value;
      if (index >= 0) {
        this.changeTransportType(TRANSPORT_TYPES[index]);
      }
    };

    const onContentChange = (evt) => {
      const index = +evt.target.value;
      this.changeContentIndex(index);
    };

    const onClickLoad = () => {
      if (choiceIndex === contents.length) {
        this.loadUrl(textValue);
      } else {
        this.loadContent(contents[choiceIndex]);
      }
    };

    const onTextInput = (t) => this.onTextInput(t);

    return (
      <div
        className="choice-inputs-wrapper"
      >
        <div
          className="content-inputs"
        >
          <Select
            className="choice-input transport-type-choice"
            onChange={onTechChange}
            options={TRANSPORT_TYPES}
          />
          <Select
            className="choice-input content-choice"
            onChange={onContentChange}
            options={contentsName}
            selected={choiceIndex}
          />
          <Button
            className='choice-input load-button'
            onClick={onClickLoad}
            value={String.fromCharCode(0xf144)}
          />
        </div>
        { hasTextInput ?
          <TextInput
            className="choice-input text-input"
            onChange={onTextInput}
            value={textValue}
            placeholder={`URL for the ${transportType} manifest`}
          /> : null
        }
      </div>
    );
  }
}

export default ContentList;
