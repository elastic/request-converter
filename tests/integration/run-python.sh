#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

if [[ ! -d $SCRIPT_DIR/.venv ]]; then
    python -m venv $SCRIPT_DIR/.venv
    echo "Installing from branch $BRANCH."
    $SCRIPT_DIR/.venv/bin/pip install https://github.com/elastic/elasticsearch-py/archive/$BRANCH.zip
    if [[ "$?" != "0" ]]; then
        echo "Installation failure. Using main branch instead."
        $SCRIPT_DIR/.venv/bin/pip install https://github.com/elastic/elasticsearch-py/archive/main.zip
    fi
fi

if [[ "$1" != "" ]]; then
    $SCRIPT_DIR/.venv/bin/python $1
fi
