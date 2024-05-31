#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

if [[ ! -d $SCRIPT_DIR/.venv ]]; then
    python -m venv $SCRIPT_DIR/.venv
    $SCRIPT_DIR/.venv/bin/pip install git+https://github.com/elastic/elasticsearch-py
fi

if [[ "$1" != "" ]]; then
    $SCRIPT_DIR/.venv/bin/python $1
fi
