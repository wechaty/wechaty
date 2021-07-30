#!/usr/bin/env bash
#
# Credit: https://github.com/grpc/grpc/issues/6757#issuecomment-261703455
#
set -e

PASSPHRASE=wechaty

# CA
openssl genrsa  -passout  pass:"$PASSPHRASE" -des3 -out ca.key 4096
openssl req     -passin   pass:"$PASSPHRASE" -key ca.key -out ca.crt \
  -x509 -new -days 365 \
  -subj  "/C=FR/ST=Paris/L=Paris/O=Test/OU=Test/CN=ca"

# Server
openssl genrsa  -passout  pass:"$PASSPHRASE" -des3 -out server.key 4096
openssl req     -passin   pass:"$PASSPHRASE" -new -out server.csr -key server.key \
  -subj  "/C=FR/ST=Paris/L=Paris/O=Test/OU=Server/CN=localhost"

openssl x509 -req -passin pass:"$PASSPHRASE" -days 365 -set_serial 01 \
  -CA ca.crt -CAkey ca.key \
  -in server.csr -out server.crt
openssl rsa -passin pass:"$PASSPHRASE" -in server.key -out server.key

# Client
openssl genrsa -passout pass:"$PASSPHRASE" -des3 -out client.key 4096
openssl req -passin pass:"$PASSPHRASE" -new -key client.key -out client.csr -subj  "/C=FR/ST=Paris/L=Paris/O=Test/OU=Client/CN=localhost"
openssl x509 -passin pass:"$PASSPHRASE" -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out client.crt
openssl rsa -passin pass:"$PASSPHRASE" -in client.key -out client.key





