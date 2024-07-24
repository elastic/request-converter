#!/usr/bin/env bash

set -eo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
  echo "Installing from branch $BRANCH."
  test -d /tmp/es-client || git clone -b "$BRANCH" --depth=1 "https://github.com/elastic/elasticsearch-js.git" /tmp/es-client
  pushd /tmp/es-client
  npm install
  npm run build
  popd

  npm init -y
  npm install /tmp/es-client
fi

if [[ "$1" != "" ]]; then
  env NODE_PATH="$SCRIPT_DIR" node $1
fi
