# Makefile for Python Wechaty
#
# 	GitHb: https://github.com/wechaty/python-wechaty
# 	Author: Huan LI <zixia@zixia.net> https://github.com/huan
#

.PHONY: all
all : generate

.PHONY: clean
clean:
	rm -fr src/*

.PHONY: install
install:
	pip3 install -r requirements.txt
	pip3 install -r requirements-dev.txt
	../scripts/install-protoc.sh

.PHONY: test
test:
	python3 -m pytest tests/

code:
	code .

.PHONY: dist
dist:
	python3 setup.py sdist bdist_wheel

.PHONY: publish
publish:
	PATH=~/.local/bin:${PATH} twine upload dist/*

.PHONY: generate
generate:
	./generate.sh
