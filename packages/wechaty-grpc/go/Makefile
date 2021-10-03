# Makefile for Python Wechaty
#
# 	GitHb: https://github.com/wechaty/python-wechaty
# 	Author: Huan LI <zixia@zixia.net> git.io/zixia
#

.PHONY: all
all : clean lint

.PHONY: clean
clean:
	rm -fr out/*

.PHONY: install
install:
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	bash -x ../scripts/install-protoc.sh

.PHONY: test
test:
	go test ./...

.PHONY: generate
generate:
	bash -x ./generate.sh

.PHONY: publish
publish: clean generate
	./publish.sh

.PHONY: build_test
build_test:
	./build_test.sh
