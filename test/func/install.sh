#!/usr/bin/env bash

echo "Cleaning previous installs"
make clean
echo "Installing Firefox dependencies via apt-get [needs to be run as root]"
apt-get install -qy libgtk-3-0 gstreamer1.0-libav gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-x 2> /dev/null

RET=$?
if [[ $RET = 100 ]]
then
  echo "Packaged dependencies will not be installed as you did not run as root."
elif [[ $RET > 0 ]]
then
  echo "Error while running apt-get" && exit
fi

set -e
echo "Preparing Chrome environment"
make chrome_pre
echo "Fetching google-chrome-stable..."
wget -qO /tmp/gch.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && ar p /tmp/gch.deb data.tar.xz | tar xJ -C ./chrome/stable
echo "Fetching google-chrome-beta..."
wget -qO /tmp/gch.deb https://dl.google.com/linux/direct/google-chrome-beta_current_amd64.deb && ar p /tmp/gch.deb data.tar.xz | tar xJ -C ./chrome/beta
echo "Fetching google-chrome-unstable..."
wget -qO /tmp/gch.deb https://dl.google.com/linux/direct/google-chrome-unstable_current_amd64.deb && ar p /tmp/gch.deb data.tar.xz | tar xJ -C ./chrome/unstable
echo "Fetching chromedriver..."
wget -qO /tmp/chrdrvr.zip http://chromedriver.storage.googleapis.com/`wget -qO- http://chromedriver.storage.googleapis.com/LATEST_RELEASE`/chromedriver_linux64.zip && unzip -q -o /tmp/chrdrvr.zip -d chrome/driver/

echo "Preparing Firefox environment"
make firefox_pre
echo "Fetching firefox-stable..."
wget -qO- "https://download.mozilla.org/?product=firefox-latest&os=linux64&lang=en-US" | tar -xj -C ./firefox/stable
echo "Fetching firefox-beta..."
wget -qO- "https://download.mozilla.org/?product=firefox-beta-latest&os=linux64&lang=en-US" | tar -xj -C ./firefox/beta
echo "Fetching firefox-unstable..."
wget -qO- "https://download.mozilla.org/?product=firefox-aurora-latest&os=linux64&lang=en-US" | tar -xj -C ./firefox/unstable
echo "Fetching geckodriver..."
wget -qO- `wget -qO- https://api.github.com/repos/mozilla/geckodriver/releases | grep -m 1 'browser_download_url.*linux64' | awk '{print $2}'| sed -e 's/"//g'` | tar -zxf - && mv geckodriver firefox/driver/wires
chmod +x firefox/driver/wires
echo "Done."
