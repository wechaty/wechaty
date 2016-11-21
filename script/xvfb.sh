#!/bin/bash

[ "$(which Xvfb)" = "" ] && {
	sudo apt-get -qq update
	sudo apt-get -qqy install xvfb
	echo 1>&2 "Install Xvfb done"
}

[ "$(pgrep -c Xvfb)" = 0 ] && {
	Xvfb :99 -screen 0 640x480x8 > /dev/null 2>&1 &
	echo 1>&2 "Start Xvfb done"
}

echo 1>&2 "Xvfb ready."
echo 1>&2

[ "$DISPLAY" = "" ] && {
  echo "export DISPLAY=:99.0"
  echo 1>&2
}
