PROTOC=protoc \
	-I ../proto/ \
	-I ../proto/wechaty/ \
	../proto/wechaty/puppet.proto \

.PHONY: all
all: clean generate reverse_proxy_server

.PHONY: clean
clean:
	rm -fr gen/*

.PHONY: install
install:
	[ -d gen ] || mkdir gen
	go install \
		github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway \
		github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2 \
		google.golang.org/protobuf/cmd/protoc-gen-go \
		google.golang.org/grpc/cmd/protoc-gen-go-grpc
	go mod tidy

.PHONY: generate
generate: gen_protobuf gen_gateway gen_openapi

.PHONY: gen_protobuf
gen_protobuf:
	${PROTOC} \
		--go_out ./gen/ --go_opt paths=source_relative \
		--go-grpc_out ./gen/ --go-grpc_opt paths=source_relative \
		../proto/wechaty/puppet.proto

.PHONY: gen_gateway
gen_gateway:
	${PROTOC} \
		--grpc-gateway_out ./gen/ \
		--grpc-gateway_opt logtostderr=true \
		--grpc-gateway_opt paths=source_relative \
		--grpc-gateway_opt generate_unbound_methods=true \

.PHONY: gen_openapi
gen_openapi:
	${PROTOC} \
		--openapiv2_out ./gen/ \
		--openapiv2_opt logtostderr=true \

