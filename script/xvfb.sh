#!/bin/sh

[ "$(which Xvfb)" = "" ] && {
	sudo apt-get -qq update
	sudo apt-get -qqy install xvfb
	echo "Install Xvfb done"
}

[ "$(ps a | grep Xvfb | grep -v grep | wc -l)" = 0 ] && {
	Xvfb :99 -screen 0 640x480x8 > /dev/null 2>&1 &
	echo "Start Xvfb done"
}

[ "$DISPLAY" = "" ] && {
	export DISPLAY=':99.0'
  echo "Set DISPLAY=:99.0 done"
}

echo "Xvfb ready."
