#!/usr/bin/env bash
set -e

echo "Activating feature 'gh-auto-auth'"

# Copy the auth script to /usr/local/bin
cp auth-script.sh /usr/local/bin/gh-auto-auth
chmod +x /usr/local/bin/gh-auto-auth

echo "gh-auto-auth installed to /usr/local/bin/gh-auto-auth"
