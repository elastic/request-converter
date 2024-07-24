#!/usr/bin/env bash

set -eo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
  echo "Installing from branch $BRANCH."
  test -d "$SCRIPT_DIR/es-client" || git clone -b "$BRANCH" --depth=1 "https://github.com/elastic/elasticsearch-js.git" "$SCRIPT_DIR/es-client"
  pushd "$SCRIPT_DIR/es-client"
  npm install
  npm run build
  popd

  pushd "$SCRIPT_DIR"
  npm init -y
  npm install "$SCRIPT_DIR/es-client"
  popd
fi

if [[ "$1" != "" ]]; then
  env NODE_PATH="$SCRIPT_DIR" node $1
fi
