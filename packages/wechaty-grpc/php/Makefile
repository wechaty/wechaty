# Makefile for PHP Wechaty
#
# 	GitHb: https://github.com/wechaty/php-wechaty
# 	Author: Chunsheng Zhang <zhangchunsheng423@gmail.com> https://git.io/JJmKd
#

.PHONY: all
all : clean lint

.PHONY: clean
clean:
	rm -fr generated/*

.PHONY: test
test:
	bash -x ./generate.sh
	php grpc_test.php

.PHONY: generate
generate:
	bash -x ./generate.sh

.PHONY: publish
publish: clean generate
	./publish.sh

