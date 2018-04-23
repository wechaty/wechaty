#!/usr/bin/env bash
set -e

brew update
brew cleanup
brew cask cleanup

brew install \
  moreutils \
  jq \
  shellcheck
