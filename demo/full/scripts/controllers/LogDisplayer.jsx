import React from "react";
import {
  filter,
  skip,
  Subject,
  takeUntil,
} from "rxjs";
import Button from "../components/Button.jsx";

const LogElement = ({ text, date }) => (
  <div
    className="player-log-item"
  >
    {date.toISOString() + " - " + text}
  </div>
);

class LogDisplayer extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = { logs: [] };

    // A weird React behavior obligates me to mutate a this._logs array instead
    // of calling setState directly to allow multiple setState in a row before
    // rendering.
    // The case seen was that this.state.logs would not change right after
    // setState, so the last addLog call would be the only one really considered
    this._logs = [];

    // Only scroll to bottom if already scrolled to bottom
    this.hasScrolledToBottom = true;
  }

  addLog(text) {
    this._logs = [...this._logs, {
      text,
      date: new Date(),
    }];

    this.setState({ logs: this._logs.slice() });
  }

  resetLogs() {
    this._logs = [];
    this.setState({ logs: [] });
  }

  componentDidMount() {
    this.destructionSubject = new Subject();
    const { player } = this.props;

    player.$get("videoRepresentationsLocked").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe(isLocked => {
      const text = "Video quality selection changed to " +
        (isLocked ? "manual" : "automatic");
      this.addLog(text);
    });

    player.$get("audioRepresentationsLocked").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe(isLocked => {
      const text = "Audio quality selection changed to " +
        (isLocked ? "manual" : "automatic");
      this.addLog(text);
    });

    player.$get("videoRepresentation").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe(r => {
      const text = r === undefined || r === null ?
        "No video Representation anymore" :
        "Video Representation changed to " + r.id;
      this.addLog(text);
    });

    player.$get("audioRepresentation").pipe(
      takeUntil(this.destructionSubject),
      skip(1), // skip initial value
    ).subscribe(r => {
      const text = r === undefined || r === null ?
        "No audio Representation anymore" :
        "Audio Representation changed to " + r.id;
      this.addLog(text);
    });

    player.$get("error").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
      filter(x => x),
    ).subscribe(error => {
      const message = error.message ? error.message : error;
      const text = "The player encountered a fatal Error: " + message;
      this.addLog(text);
    });

    player.$get("isLoading").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
      filter(x => x),
    ).subscribe(() => {
      const text = "A new content is Loading.";
      this.addLog(text);
    });

    player.$get("hasCurrentContent").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
      filter(x => x),
    ).subscribe(() => {
      const text = "The new content has been loaded.";
      this.addLog(text);
    });

    player.$get("isStopped").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
      filter(x => x),
    ).subscribe(() => {
      const text = "The current content is stopped";
      this.addLog(text);
    });

    player.$get("hasEnded").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
      filter(x => x),
    ).subscribe(() => {
      const text = "The current content has ended";
      this.addLog(text);
    });

    player.$get("isBuffering").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe((ib) => {
      const text = ib ?
        "The current content is buffering" :
        "The current content is not buffering anymore";
      this.addLog(text);
    });

    player.$get("isSeeking").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe((ib) => {
      const text = ib ?
        "The current content is seeking" :
        "The current content is not seeking anymore";
      this.addLog(text);
    });

    player.$get("availableAudioTracks").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe(() => {
      const text = "The audio track list has changed";
      this.addLog(text);
    });

    player.$get("availableSubtitles").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe(() => {
      const text = "The text track list has changed";
      this.addLog(text);
    });

    player.$get("availableVideoTracks").pipe(
      skip(1), // skip initial value
      takeUntil(this.destructionSubject),
    ).subscribe(() => {
      const text = "The video track list has changed";
      this.addLog(text);
    });

    this.scrollToBottom();

    const onScroll = () => {
      if (
        this.element.scrollHeight - this.element.offsetHeight ===
        this.element.scrollTop
      ) {
        this.hasScrolledToBottom = true;
      } else {
        this.hasScrolledToBottom = false;
      }
    };

    this.element.addEventListener("scroll", onScroll, { passive: true });
    this.destructionSubject.subscribe(() =>
      this.element.removeEventListener("scroll", onScroll));
  }

  scrollToBottom() {
    if (this.hasScrolledToBottom) {
      this.element.scrollTop = this.element.scrollHeight;
    }
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  componentWillUnmount() {
    this.destructionSubject.next();
    this.destructionSubject.complete();
  }

  render() {
    const { logs } = this.state;

    const logTexts = logs.map(({ text, date }, i) =>
      <LogElement
        key={i}
        text={text}
        date={date}
      />);

    const clearLogs = () => this.resetLogs();
    return (
      <div className="player-logs-wrapper">
        <div className="player-logs-wrapper-title">
          Logs
        </div>
        <div
          className="player-logs"
          ref={el => this.element = el}
        >
          <Button
            ariaLabel="Clear all logs"
            className="player-logs-wrapper-trash"
            onClick={clearLogs}
            value={String.fromCharCode(0xf05e)}
          />
          {logTexts}
        </div>
      </div>
    );
  }
}

export default React.memo(LogDisplayer);
