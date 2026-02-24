#!/bin/bash

set -eo pipefail
set -x

GO_DIR=/tmp/go-test
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

if [[ "$1" == "" ]]; then
    rm -rf $GO_DIR
fi

if [ ! -d "$GO_DIR" ]; then
    mkdir -p $GO_DIR
    pushd $GO_DIR
    go mod init go-test
    echo "Installing go-elasticsearch from branch $BRANCH"
    go get github.com/elastic/go-elasticsearch/v9@$BRANCH ||
        (echo "Branch $BRANCH not found. Using main branch." &&
            go get github.com/elastic/go-elasticsearch/v9@main)
    popd
fi

if [[ "$1" != "" ]]; then
    cp "$1" "$GO_DIR/main.go"
    pushd $GO_DIR
    go run main.go
    popd
fi
