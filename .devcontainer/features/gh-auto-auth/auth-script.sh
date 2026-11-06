#!/bin/bash
set -e

# Check if gh is authenticated
if ! gh auth status >/dev/null 2>&1; then
    echo "Authenticating gh CLI..."
    # Attempt to get token from git credential helper
    token=$(printf "protocol=https\nhost=github.com\n" | git credential fill | grep password | cut -d= -f2)

    if [ -n "$token" ]; then
        echo "$token" | gh auth login --with-token
        echo "gh CLI authenticated successfully."
    else
        echo "No token found in git credential helper. Please run 'gh auth login' manually."
    fi
else
    echo "gh CLI is already authenticated."
fi
