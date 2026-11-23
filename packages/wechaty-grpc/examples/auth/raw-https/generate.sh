#!/bin/bash

# Private key for the root cert
openssl genrsa -des3 -out rootCA.key 4096

# root certificate
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 365 -out rootCA.crt

# Private key for the server cert
openssl genrsa -out server.key 2048

# Signing request for the server
openssl req -new -key server.key -out server.csr

# Server cert using the root certificate
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial \
    -out server.crt -days 365 -sha256
