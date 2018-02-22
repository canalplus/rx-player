import React from "react";
import Button from "../components/Button.jsx";
import TextInput from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import contentsDatabase from "../contents.js";

const STREAMING_TECHNOS = ["DASH", "Smooth", "DirectFile"];
const CONTENTS_PER_TECHNO = STREAMING_TECHNOS.reduce((acc, tech) => {
  acc[tech] = contentsDatabase.filter(({ transport }) =>
    transport === tech.toLowerCase()
  );
  return acc;
}, {});

class ContentList extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = {
      techno: STREAMING_TECHNOS[0],
      choiceIndex: 0,
      hasTextInput: !CONTENTS_PER_TECHNO[STREAMING_TECHNOS[0]].length,
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
      transport: this.state.techno.toLowerCase(),
      autoPlay: true, // TODO add checkBox
      // native browser subtitles engine (VTTCue) doesn't render stylized subs
      // we force HTML textTrackMode to vizualise styles
      textTrackMode: "html",
    });
  }

  changeTechno(techno) {
    this.setState({
      techno,
      choiceIndex: 0,
      hasTextInput: !CONTENTS_PER_TECHNO[techno].length,
    });
  }

  changeContentIndex(index) {
    const { techno } = this.state;
    const hasTextInput = CONTENTS_PER_TECHNO[techno].length === index;
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
    const { techno, choiceIndex, hasTextInput, textValue } = this.state;
    const contents = CONTENTS_PER_TECHNO[techno];

    const contentsName = contents.map(content =>
      `${content.name}${content.live ? " (live)" : ""}`
    );
    contentsName.push("Custom link");

    const onTechChange = (evt) => {
      const index = +evt.target.value;
      if (index >= 0) {
        this.changeTechno(STREAMING_TECHNOS[index]);
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
            className="choice-input techno-choice"
            onChange={onTechChange}
            options={STREAMING_TECHNOS}
          />
          <Select
            className="choice-input content-choice"
            onChange={onContentChange}
            options={contentsName}
            selected={choiceIndex}
          />
          <Button
            className="choice-input load-button"
            onClick={onClickLoad}
            value={String.fromCharCode(0xf144)}
          />
        </div>
        { hasTextInput ?
            <TextInput
              className="choice-input text-input"
              onChange={onTextInput}
              value={textValue}
              placeholder={`URL for the ${techno} manifest`}
            /> : null
        }
      </div>
    );
  }
}

export default ContentList;
