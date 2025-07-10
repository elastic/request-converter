#!/bin/bash

set -eo pipefail
set -x

CLIENT_DIR=/tmp/ruby-client
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

if [[ "$1" == "" ]]; then
    # the `test:setup` command runs this script without arguments to initialize
    # the venv, so we first delete any previous one
    rm -rf $CLIENT_DIR
fi

if [ ! -d "$CLIENT_DIR" ]; then
  echo "Installing from branch $BRANCH"
  git clone -b "$BRANCH" --depth=1 "https://github.com/elastic/elasticsearch-ruby.git" "$CLIENT_DIR" ||
    (echo "Branch $BRANCH not found. Cloning main branch." &&
       git clone -b "main" --depth=1 "https://github.com/elastic/elasticsearch-ruby.git" "$CLIENT_DIR")
  pushd "$CLIENT_DIR"
  bundle install
  #bundle exec rake bundle:install
  bundle exec rake automation:build_gems
  gem install --local build/elasticsearch-api*
  gem install --local build/elasticsearch*
  popd
fi

if [[ "$1" != "" ]]; then
  ruby $1
fi
