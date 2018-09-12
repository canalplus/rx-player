import React from "react";
import Button from "../components/Button.jsx";
import TextInput from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import contentsDatabase from "../contents.js";

const TRANSPORT_TYPES = ["DASH", "Smooth", "DirectFile"];
const DRM_TYPES = ["Widevine", "Playready", "Clearkey"];

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
      displayDRMSettings: false,
      manifestUrlValue: "",
      drm: DRM_TYPES[0],
      autoPlay: true,
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
      supplementaryImageTracks,
      supplementaryTextTracks,
      textTrackMode,
      drmInfos,
    } = content;

    this.buildKeySystems(drmInfos)
      .then((keySystems) => {
        loadVideo({
          url,
          transport,
          autoPlay: !(this.state.autoPlay === false),
          supplementaryImageTracks,
          supplementaryTextTracks,
          textTrackMode,
          keySystems,
        });
      });
  }

  getServerCertificate(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = (evt) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const serverCertificate = evt.target.response;
          resolve(serverCertificate);
        } else {
          reject();
        }
      };
      xhr.send();
    });
  }

  getLicenseCallback(licenseServerUrlValue) {
    return (challenge) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = "arraybuffer";
      xhr.open("POST", licenseServerUrlValue, true);
      return new Promise((resolve, reject) => {
        xhr.onload = (evt) => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const license = evt.target.response;
            resolve(license);
          } else {
            reject();
          }
        },
        xhr.send(challenge);
      });
    };
  }

  buildKeySystems(drmInfos) {
    return new Promise((resolve) => {
      if (!drmInfos) {
        resolve([]);
      }

      const {
        licenseServerUrlValue,
        serverCertificateUrlValue,
        drm,
      } = drmInfos;

      if (licenseServerUrlValue) {
        const keySystem = {
          type: drm.toLowerCase(),
          getLicense: this.getLicenseCallback(licenseServerUrlValue),
        };
        if (serverCertificateUrlValue) {
          this.getServerCertificate(serverCertificateUrlValue)
            .then((serverCertificate) => {
              keySystem.serverCertificate = serverCertificate;
              resolve([keySystem]);
            });
        } else {
          resolve([keySystem]);
        }
      } else {
        resolve([]);
      }
    });
  }

  loadUrl(url, drmInfos, autoPlay) {
    const { loadVideo } = this.props;
    this.buildKeySystems(drmInfos)
      .then((keySystems) => {
        loadVideo({
          url,
          transport: this.state.transportType.toLowerCase(),
          autoPlay,

          // native browser subtitles engine (VTTCue) doesn't render stylized
          // subs.  We force HTML textTrackMode to vizualise styles.
          textTrackMode: "html",
          keySystems,
        });
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
  onManifestInput(evt) {
    this.setState({
      manifestUrlValue: evt.target.value,
    });
  }

  onLicenseServerInput(evt) {
    this.setState({
      licenseServerUrlValue: evt.target.value,
    });
  }

  onServerCertificateInput(evt) {
    this.setState({
      serverCertificateUrlValue: evt.target.value,
    });
  }

  onDRMChange(evt) {
    this.setState({ drm: evt.target.value });
  }

  onDisplayDRMSettings(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({
      displayDRMSettings: value,
    });
  }

  onToggleAutoPlay(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({
      autoPlay: value,
    });
  }

  render() {
    const {
      transportType,
      choiceIndex,
      hasTextInput,
      manifestUrlValue,
      licenseServerUrlValue,
      serverCertificateUrlValue,
      drm,
      displayDRMSettings,
      autoPlay,
    } = this.state;
    const { isStopped } = this.props;
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
        const drmInfos = {
          licenseServerUrlValue,
          serverCertificateUrlValue,
          drm,
        };
        this.loadUrl(manifestUrlValue, drmInfos, autoPlay);
      } else {
        this.loadContent(contents[choiceIndex]);
      }
    };

    const onClickStop = () => {
      const { stopVideo } = this.props;
      stopVideo();
    };

    const onManifestInput = (evt) =>
      this.onManifestInput(evt);
    const onLicenseServerInput = (evt) =>
      this.onLicenseServerInput(evt);
    const onServerCertificateInput = (evt) =>
      this.onServerCertificateInput(evt);
    const onDRMChange = (evt) =>
      this.onDRMChange(evt);
    const onDisplayDRMSettings = (evt) =>
      this.onDisplayDRMSettings(evt);
    const onAutoPlayCheckbox = (evt) =>
      this.onToggleAutoPlay(evt);

    return (
      <div className="choice-inputs-wrapper">
        <div className="content-inputs">
          <span>
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
            <div className="chart-checkbox">
              Auto Play
              <input
                name="displayBufferSizeChart"
                type="checkbox"
                checked={autoPlay}
                onChange={onAutoPlayCheckbox}
              />
            </div>
          </span>
          <span>
            <Button
              className='choice-input stop-load-button'
              onClick={onClickLoad}
              value={String.fromCharCode(0xf144)}
            />
            <Button
              className='choice-input stop-load-button'
              onClick={onClickStop}
              value={String.fromCharCode(0xf04d)}
              disabled={isStopped}
            />
          </span>
        </div>
        {
          hasTextInput ?
            <TextInput
              className="choice-input text-input"
              onChange={onManifestInput}
              value={manifestUrlValue}
              placeholder={`URL for the ${transportType} manifest`}
            /> : null
        }
        {
          hasTextInput ? <div>
            <span className="chart-checkbox" >
              Display DRM settings
              <input
                name="displayDRMSettingsTextInput"
                type="checkbox"
                checked={displayDRMSettings}
                onChange={onDisplayDRMSettings} />
            </span>
            {displayDRMSettings ? <div className="drm-settings">
              <div>
                <Select
                  className="choice-input"
                  onChange={onDRMChange}
                  options={DRM_TYPES}
                />
                <TextInput
                  className="choice-input text-input"
                  onChange={onLicenseServerInput}
                  value={licenseServerUrlValue}
                  placeholder={"License server URL"}
                />
              </div>
              <TextInput
                className="choice-input text-input"
                onChange={onServerCertificateInput}
                value={serverCertificateUrlValue}
                placeholder={"Server certificate URL"}
              />
            </div> : null}
          </div> : null
        }
      </div>
    );
  }
}

export default ContentList;
