.PHONY: all
all : docs

.PHONY: docs
docs:
	protoc \
		-I ../third-party/ \
		-I ../proto/ \
		--doc_out=./ \
		--doc_opt=markdown,README.md \
		../proto/wechaty/puppet.proto
