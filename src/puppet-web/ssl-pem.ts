/**
 *   Chatie - https://github.com/chatie
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 *
 * Ssl Key & Cert files.
 *
 * Hardcoded here, NO need to re-config.
 * because there will only be visit from 127.0.0.1
 * so it will not be a security issue.
 *
 * http://blog.mgechev.com/2014/02/19/create-https-tls-ssl-application-with-express-nodejs/
 * openssl req -x509 -days 3650 -nodes -newkey rsa:2048 -keyout key.pem -out cert.pem
 * openssl rsa -in key.pem -out newkey.pem && mv newkey.pem key.pem
 *
 * Reference:
 * What is a Pem file - http://serverfault.com/a/9717
 */

const key = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAt1c10tCbJG5ydWPjBV5c4gA3f1/8ubhNnYj98dtFPR8a4VPk
ORCyst157tLq5uPgmlZLedAm08VFiDUwn8iGQI/RegQSuRjxaS2MccfP9jpzDazy
eMBi0mLg25z/4v9y/8N9nLSqbHrPrye+hzpSkSkyQ/zf/P85ZCdTGwCnFX6WlBQX
I/3o5wWWRv4DaZTaLhChHjAa6+HJdYFvDvI6QUxggj3Vq64HsJv2xGvG7pZWjxXp
FS0Mg8MQbHME1J92OwPNaqsNUY3JfPkaeYmfQi5Qy53ULGLxVgV0eyIFf6s4NSCr
FI4PjJXyBWYCAlxVIUm1WdylIAl4MVvGADA1mQIDAQABAoIBAEOFUsU5HmnkYzLo
fotTnVF+UvIOH70mKy+BbETOREmmUvf5NWvuwmEtP+K8utYdxnIQpetOxX3ogRsQ
u7+c0hSk4rjVFzAkB4R8yeR9ehFspUK8FvBxqfNhhv5aa8Ll4SxgirpTrxAUirgv
IvQafp4HVgPD9ZnvROulr+2Z5+7596qif4F1HrrxN6tl+cGNZFIZ7vk7uGsF8k4G
LQ8xik8QABcTE4pKpRtNlesRpojSGI8cnu/z8MgDIPMHu6wgdz+OR1rZwNMuREZi
zejf5gg82B1KxeFNEmtMI1GM+whKVkPBxwASJTOaiN2Oh7SdSO5SHxFv2bAxjJ6z
SC4mwqECgYEA7YSIINzOTCkUGGcJrg14P0m1KxuoPFSoAXk61F6kwW1FQVPmfk4i
n/MO8+2/CSAZiFEFNTUvWj5xM955wDVgSY8Z7l/aYxn11gGzV0XypsK77edTRrfp
6AlvIepclSX5ocmhizHe4mrm8KaZ014qMtO3RUaoDA9h7zqQOK5OyxcCgYEAxZty
Dy7IxOBk3QfGdVqto/oDX2fQ6PTAIYwuOAh6rrQDkSXShPWI3bUJegylQeVOYG40
3ti/fd/247OkFwPsPODNisWQTsdX5Kr4KWjmfTSpSDm1AkDvnuPk/tcyFhijxZ48
6Q0ZL529oy7cwel3p3uzDIFbAMEdATKIRp9css8CgYAkJNfmUFOgaVvifsONVgVn
dBr6rWHDlIpgdwdJzAE8Yhl44ICh1dgVCRLMcfBxPg5EnTeyqh5DmF73qrJSWo0F
hJ5IlRORoyCy6V1WOZG8aMPaZypYB6KzqcPcoGJoW/gJ87n+iZ9GS0hLdL7R2HGJ
fIhWJXNrKmgX1Iyf436gDwKBgQC57ekEICEIHZrJ3eb9xLRc9YD249fNWXzuE9fp
IRFOEFLK36uVLvH4qb6g+AUGW5vDX+6fP5Ht/i1vUjey8B33qg275OhDN42busKF
NA6rAEHHk4Sc+jx8ZDGzFwgpgkWWS61EGu73vpQQVqegTOwoyltOCOh3bTy9Q661
xHyUQQKBgA1vFFy09wJmQNCoo2kLvghkyPHrBXQlzoRW3cafw+vwoYZFukxst0dd
2mQ3CyRJ7buoDdj0cFVlScB7KSQtIvLMtAn6tkL6ecooep346OSoLlsQd/F5ODep
bBdRj0Orj7xQDeIicM7ASTYPAivh9NTu4yJL0r/YOX3OvXxaBSGf
-----END RSA PRIVATE KEY-----
`

const cert = `
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKMz7h5gRwqgMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTYwNTAxMTUyNzM5WhcNMTcwNTAxMTUyNzM5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAt1c10tCbJG5ydWPjBV5c4gA3f1/8ubhNnYj98dtFPR8a4VPkORCyst15
7tLq5uPgmlZLedAm08VFiDUwn8iGQI/RegQSuRjxaS2MccfP9jpzDazyeMBi0mLg
25z/4v9y/8N9nLSqbHrPrye+hzpSkSkyQ/zf/P85ZCdTGwCnFX6WlBQXI/3o5wWW
Rv4DaZTaLhChHjAa6+HJdYFvDvI6QUxggj3Vq64HsJv2xGvG7pZWjxXpFS0Mg8MQ
bHME1J92OwPNaqsNUY3JfPkaeYmfQi5Qy53ULGLxVgV0eyIFf6s4NSCrFI4PjJXy
BWYCAlxVIUm1WdylIAl4MVvGADA1mQIDAQABo1AwTjAdBgNVHQ4EFgQU/Sed0ljf
HEpQsmReiphJnSsPTFowHwYDVR0jBBgwFoAU/Sed0ljfHEpQsmReiphJnSsPTFow
DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAXjqJfXSEwVktRmeB+tW0
F837NEfzyedP82gSCCC+pbs+4E6DbDANupxP8vqIfqTe03YScZHVR/ha/f/WPLpc
HvDuyOSXrms9x0OHxsH70Ajx5/JBWyBbtFdox6yCEoeydOXl+MQDXgnGGv8VFXdN
dd2RP6/Ovx88hYGWcwf4RekTrbsM40n7BkkCCEedZPy7ouRmAs2FXpd+cm3zD9jt
Bas7b0wEOA7H2HejkbFOUierE40Kzh72vDD7M6DqUZFSvClY0O0+EYefB5TiRsN0
g+Xdc4Ag/St5eqgrp95KOlVeepSlb35LAD1Cc91LddTXCYS7+dc4ndQYpgrLU0ru
Sw==
-----END CERTIFICATE-----
`

export { cert, key }
