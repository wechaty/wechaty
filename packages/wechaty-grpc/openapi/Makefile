GENERATED_DIR:="${CURDIR}/../generated/"
THIRD_PARTY_DIR:="${CURDIR}/../third-party/"

PROTOC:=protoc \
	-I ../proto/ \
	-I ../proto/wechaty/ \
	-I ${THIRD_PARTY_DIR} \
	../proto/wechaty/puppet.proto \

.PHONY: all
all: generate

.PHONY: generate
generate:
	${PROTOC} \
		--openapiv2_out ${GENERATED_DIR} \
		--openapiv2_opt logtostderr=true \
		--openapiv2_opt generate_unbound_methods=true \

.PHONY: clean
clean:
	rm -fr ${GENERATED_DIR}/*

.PHONY: install
install:
	./install.sh
