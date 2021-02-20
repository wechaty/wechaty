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
	go install \
		github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway \
		github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2 \
		google.golang.org/protobuf/cmd/protoc-gen-go \
		google.golang.org/grpc/cmd/protoc-gen-go-grpc
	go mod tidy

.PHONY: gen_protobuf
gen_protobuf:
	${PROTOC} \
		--go_out ${GENERATED_DIR} --go_opt paths=source_relative \
		--go-grpc_out ${GENERATED_DIR} --go-grpc_opt paths=source_relative \

.PHONY: gen_gateway
gen_gateway:
	${PROTOC} \
		--grpc-gateway_out ${GENERATED_DIR} \
		--grpc-gateway_opt logtostderr=true \
		--grpc-gateway_opt paths=source_relative \
		--grpc-gateway_opt generate_unbound_methods=true \
