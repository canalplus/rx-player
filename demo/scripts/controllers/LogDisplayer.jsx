const React = require("react");
const { Subject } = require("rxjs/Subject");

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
    this.state = {
      logs: [],
    };

    // Only scroll to bottom if already scrolled to bottom
    this.hasScrolledToBottom = true;
  }

  addLog(text) {
    // A weird React behavior obligates me to mutate this.state directly
    // to allow multiple setState in a row before rendering.
    // The case seen was that this.state.logs would not change right after
    // setState, so the last addLog call would be the only one really considered

    // TODO What would be cleaner would be to give it to a module or copy the
    // pending state in a context variable.

    // previous version, do not work
    // this.setState({
    //   logs: this.state.logs.concat({
    //     text,
    //     date: new Date(),
    //   }),
    // });

    this.state.logs = [...this.state.logs, {
      text,
      date: new Date(),
    }];

    this.setState({ logs: this.state.logs });
  }

  componentDidMount() {
    this.destructionSubject = new Subject();
    const { player } = this.props;

    player.$get("videoBitrateAuto")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .subscribe(vbAuto => {
        const text = "Video Bitrate selection changed to " +
          (vbAuto ? "automatic" : "manual");
        this.addLog(text);
      });

    player.$get("audioBitrateAuto")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .subscribe(abAuto => {
        const text = "Audio Bitrate selection changed to " +
          (abAuto ? "automatic" : "manual");
        this.addLog(text);
      });

    player.$get("videoBitrate")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .subscribe(vb => {
        const text = "Video Bitrate changed to " + vb;
        this.addLog(text);
      });

    player.$get("audioBitrate")
      .takeUntil(this.destructionSubject)
      .skip(1) // skip initial value
      .subscribe(ab => {
        const text = "Audio Bitrate changed to " + ab;
        this.addLog(text);
      });

    player.$get("error")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .filter(x => x)
      .subscribe(error => {
        const message = error.message ? error.message : error;
        const text = "The player encountered a fatal Error: " + message;
        this.addLog(text);
      });

    player.$get("isLoading")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .filter(x => x)
      .subscribe(() => {
        const text = "A new content is Loading.";
        this.addLog(text);
      });

    player.$get("hasLoadedContent")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .filter(x => x)
      .subscribe(() => {
        const text = "The new content has been loaded.";
        this.addLog(text);
      });

    player.$get("isStopped")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .filter(x => x)
      .subscribe(() => {
        const text = "The current content is stopped";
        this.addLog(text);
      });

    player.$get("hasEnded")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .filter(x => x)
      .subscribe(() => {
        const text = "The current content has ended";
        this.addLog(text);
      });

    player.$get("isBuffering")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .subscribe((ib) => {
        const text = ib ?
          "The current content is buffering" :
          "The current content is not buffering anymore";
        this.addLog(text);
      });

    player.$get("isSeeking")
      .skip(1) // skip initial value
      .takeUntil(this.destructionSubject)
      .subscribe((ib) => {
        const text = ib ?
          "The current content is seeking" :
          "The current content is not seeking anymore";
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
      this.element.removeEventListener("scroll", onScroll)
    );
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

    const logTexts = logs.map(({ text, date}) =>
      <LogElement
        text={text}
        date={date}
      />
    );
    return (
      <div
        className="player-logs-wrapper"
      >
        <div
          className="player-logs-wrapper-title"
        >
          Logs
        </div>
        <div
          className="player-logs"
          ref={el => this.element = el}
        >
          {logTexts}
        </div>
      </div>
    );
  }
}

module.exports = LogDisplayer;
