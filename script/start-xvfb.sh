#!/bin/sh

[ "$(which Xvfb)" = "" ] && {
	sudo apt-get install -y xvfb
	echo "xvfb installed"
}

[ "$DISPLAY" = "" ] && {
	export DISPLAY=':99.0'
	echo "Set DISPLAY to $DISPLAY"
	Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
	echo "Xvfb started"

	echo "to set env, run $ export DISPLAY=':99.0'"
}

echo 'Xvfb ready'
