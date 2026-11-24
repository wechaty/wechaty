#!/usr/bin/env bash
#
# Credit: https://github.com/grpc/grpc/issues/6757#issuecomment-261703455
#
set -e

PASSPHRASE=wechaty
DAYS=3650
SNI=wechaty-puppet-service

# CA
openssl genrsa  -passout  pass:"$PASSPHRASE" -des3 -out root-ca.key 4096
openssl req     -passin   pass:"$PASSPHRASE" -key root-ca.key -out root-ca.crt \
  -x509 -new -days "$DAYS" \
  -subj  "/C=US/ST=San Francisco/L=Palo Alto/O=Wechaty/OU=CA/CN=wechaty-root-ca"

# Server
openssl genrsa  -passout  pass:"$PASSPHRASE" -des3 -out server.key 1024
openssl req     -passin   pass:"$PASSPHRASE" -new -out server.csr -key server.key \
  -subj  "/C=US/ST=San Francisco/L=Palo Alto/O=Wechaty/OU=Puppet/CN=${SNI}"

openssl x509 -req -passin pass:"$PASSPHRASE" -days "$DAYS" -set_serial 01 \
  -CA root-ca.crt -CAkey root-ca.key \
  -in server.csr -out server.crt
openssl rsa -passin pass:"$PASSPHRASE" -in server.key -out server.key

# Client
# openssl genrsa -passout pass:"$PASSPHRASE" -des3 -out client.key 1024
# openssl req -passin pass:"$PASSPHRASE" -new -key client.key -out client.csr \
#   -subj  "/C=US/ST=San Francisco/L=Palo Alto/O=Wechaty/OU=Client/CN=${SNI}"
# openssl x509 -passin pass:"$PASSPHRASE" -req -days "$DAYS" -in client.csr -CA root-ca.crt -CAkey root-ca.key -set_serial 01 -out client.crt
# openssl rsa -passin pass:"$PASSPHRASE" -in client.key -out client.key





