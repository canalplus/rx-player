# rx-player functional testing

One core problem encountered with web browsers are their multiplicity and speed of renewal.
It's a complex task to manually check on every browser that it can still run our player.
These scripts are meant to automatically check for browser updates while they are still on beta or alpha state,
to notify if any error is thrown with these versions.

## Requirements

The script is configured to use all binaries described. If you want to reduce the number of binaries tested, please see the section *Parameters*

**TL;DR: For amd64 Debian users: just run `./install.sh` as root**

### Google Chrome

Please run this script before each test to always have the most up-to-date version
```sh
cd ./test/func
make chrome_pre
wget -qO /tmp/gch.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && ar p /tmp/gch.deb data.tar.xz | tar xJ -C ./chrome/stable
wget -qO /tmp/gch.deb https://dl.google.com/linux/direct/google-chrome-beta_current_amd64.deb && ar p /tmp/gch.deb data.tar.xz | tar xJ -C ./chrome/beta
wget -qO /tmp/gch.deb https://dl.google.com/linux/direct/google-chrome-unstable_current_amd64.deb && ar p /tmp/gch.deb data.tar.xz | tar xJ -C ./chrome/unstable
```

#### Chromedriver

```sh
wget -qO /tmp/chrdrvr.zip http://chromedriver.storage.googleapis.com/`wget -qO- http://chromedriver.storage.googleapis.com/LATEST_RELEASE`/chromedriver_linux64.zip && unzip -o /tmp/chrdrvr.zip -d chrome/driver/
```

### Firefox

libgtk-3 and libav are needed. For Debian/Ubuntu, run the following :
```sh
apt-get install libgtk-3-0 gstreamer1.0-libav gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-x
```

Please run this script before each test to always have the most up-to-date version
```sh
cd ./test/func
make firefox_pre
wget -qO- "https://download.mozilla.org/?product=firefox-latest&os=linux64&lang=en-US" | tar -xj -C ./firefox/stable
wget -qO- "https://download.mozilla.org/?product=firefox-beta-latest&os=linux64&lang=en-US" | tar -xj -C ./firefox/beta
wget -qO- "https://download.mozilla.org/?product=firefox-aurora-latest&os=linux64&lang=en-US" | tar -xj -C ./firefox/unstable
```

#### GeckoDriver

Get Wires the WebDriver for Firefox
Latest Release: [geckodriver releases](https://github.com/mozilla/geckodriver/releases)
Put it in the test/func/firefox/driver directory
Automatically get latest release:
```sh
wget -qO- `wget -qO- https://api.github.com/repos/mozilla/geckodriver/releases | grep -m 1 'browser_download_url.*linux64' | awk '{print $2}' | sed -e 's/"//g'` | tar -zxf - && mv geckodriver firefox/driver/wires
chmod +x firefox/driver/wires
```

### Parameters

You can overload FIREFOX_BINARIES and CHROME_BINARIES env var to specify your own PATH.
Syntax is the same as the $PATH env var.
You can also specify your own CHROMEDRIVER_PATH and FFDRIVER_PATH if installed by your own method

Example:
```sh
FIREFOX_BINARIES=/opt/firefox/firefox CHROME_BINARIES=/usr/local/bin/chrome35/google-chrome make test
```

### Headless

To run these scripts headless, you need Xvfb
```sh
apt-get install xvfb
```

## Dependencies

- [connect](https://github.com/senchalabs/connect)
- [mocha](https://github.com/mochajs/mocha)
- [selenium-webdriver](https://github.com/SeleniumHQ/selenium/tree/master/javascript/node/selenium-webdriver)
- [serve-static](https://github.com/expressjs/serve-static)
- [xunit-file](https://github.com/peerigon/xunit-file)

## Run

To run these scripts:
```sh
cd rx-player/test/func
make test
```
