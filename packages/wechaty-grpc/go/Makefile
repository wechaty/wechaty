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
	go get -u github.com/golang/protobuf/protoc-gen-go

.PHONY: test
test:
	go test ./...

.PHONY: generate
generate:
	./generate.sh

.PHONY: publish
publish:
	./publish.sh

