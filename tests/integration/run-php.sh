#!/bin/bash -x
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
CURRENT_DIR=$(pwd)
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

generate_composer_json() {
    cat <<EOF >composer.json
{
    "repositories": [
        {
            "type": "git",
            "url": "https://github.com/elastic/elasticsearch-php"
        }
    ],
    "require": {
        "elasticsearch/elasticsearch": "dev-$1",
        "guzzlehttp/psr7": "^2.7"
    },
    "config": {
        "allow-plugins": {
            "php-http/discovery": true
        }
    }
}
EOF
}

if [[ "$1" == "" ]]; then
    # the `test:setup` command runs this script without arguments to initialize
    # the venv, so we first delete any previous one
    rm -rf $SCRIPT_DIR/.php
fi

if [[ ! -d $SCRIPT_DIR/.php ]]; then
    mkdir $SCRIPT_DIR/.php
    echo "Installing from branch $BRANCH."
    cd $SCRIPT_DIR/.php
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php composer-setup.php
    php -r "unlink('composer-setup.php');"

    generate_composer_json $BRANCH
    php composer.phar install 2>&1

    if [[ "$?" != "0" ]]; then
        echo "Installation failure. Using main branch instead."
        generate_composer_json main
        php composer.phar install 2>&1
    fi
fi

if [[ "$1" != "" ]]; then
    cd $SCRIPT_DIR/.php
    cp $CURRENT_DIR/$1 ./$1
    php ./$1
    rm ./$1
fi
