#!/usr/bin/env bash

set -eo pipefail
set -x

SCRIPT_DIR=/tmp/js-test
CLIENT_DIR=/tmp/es-client
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

if [[ "$1" == "" ]]; then
    # the `test:setup` command runs this script without arguments to initialize
    # the venv, so we first delete any previous one
    rm -rf $SCRIPT_DIR $CLIENT_DIR
fi

if [ ! -d "$CLIENT_DIR" ]; then
  echo "Installing from branch $BRANCH"
  git clone -b "$BRANCH" --depth=1 "https://github.com/elastic/elasticsearch-js.git" "$CLIENT_DIR" ||
    (echo "Branch $BRANCH not found. Cloning main branch." &&
      git clone -b "main" --depth=1 "https://github.com/elastic/elasticsearch-js.git" "$CLIENT_DIR")
  pushd "$CLIENT_DIR"
  npm install
  npm run build
  popd
fi

if [ ! -d "$SCRIPT_DIR" ]; then
  mkdir "$SCRIPT_DIR"
  pushd "$SCRIPT_DIR"
  npm init -y
  npm install
  npm install "$CLIENT_DIR"
  popd
fi

if [[ "$1" != "" ]]; then
  env NODE_PATH="$SCRIPT_DIR/node_modules:$NODE_PATH" node $1
fi
