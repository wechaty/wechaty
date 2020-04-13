# Makefile for Python Wechaty
#
# 	GitHb: https://github.com/wechaty/python-wechaty
# 	Author: Huan LI <zixia@zixia.net> git.io/zixia
#

.PHONY: all
all : generate

.PHONY: clean
clean:
	rm -fr generated/*

.PHONY: install
install:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

.PHONY: pytest
pytest:
	pytest src/ tests/

.PHONY: test-unit
test-unit: pytest

.PHONY: test
test: lint pytest

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
