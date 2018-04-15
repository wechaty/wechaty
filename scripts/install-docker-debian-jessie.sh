#!/bin/sh
#
# https://docs.docker.com/engine/installation/linux/debian/#/debian-jessie-80-64-bit
#

[ "$(which docker)" = "" ] && {
	sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D
	sudo sh -c 'echo "deb https://apt.dockerproject.org/repo debian-wheezy main" >> /etc/apt/sources.list.d/docker.list'
	sudo apt-get update
	sudo apt-cache policy docker-engine
	sudo apt-get install -y docker-engine
	sudo service docker start
}

docker --version
