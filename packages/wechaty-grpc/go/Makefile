# Makefile for Python Wechaty
#
# 	GitHb: https://github.com/wechaty/python-wechaty
# 	Author: Huan LI <zixia@zixia.net> git.io/zixia
#

.PHONY: all
all : clean lint

.PHONY: clean
clean:
	rm -fr generated/*

.PHONY: install
install:
	../scripts/install-protoc.sh
	go get -v -t -d ./...

.PHONY: test
test:
	go test ./...

.PHONY: generate
generate:
	bash -x ./generate.sh

.PHONY: publish
publish:
	./publish.sh

