#!/bin/bash -x
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
CURRENT_DIR=$(pwd)
BRANCH=$(jq -r .version package.json | grep -Eo "^[0-9]+\.[0-9]+")

if [[ "$1" == "" ]]; then
    # the `test:setup` command runs this script without arguments to initialize
    # the environment, so we first delete any previous one
    rm -rf $SCRIPT_DIR/.java-request-converter
    rm -rf $SCRIPT_DIR/.java
fi

if [[ ! -d $SCRIPT_DIR/.java-es-request-converter ]]; then
    git clone https://github.com/elastic/java-request-converter $SCRIPT_DIR/.java-request-converter
    cd $SCRIPT_DIR/.java-request-converter
    ./gradlew jar
    cd $CURRENT_DIR
fi

if [[ ! -d $SCRIPT_DIR/.java ]]; then
    mkdir $SCRIPT_DIR/.java
    echo "Installing from branch $BRANCH."
    git clone -b "$BRANCH" --depth=1 "https://github.com/elastic/elasticsearch-java.git" $SCRIPT_DIR/.java ||
    (echo "Branch $BRANCH not found. Cloning main branch." &&
      git clone -b "main" --depth=1 "https://github.com/elastic/elasticsearch-java.git" $SCRIPT_DIR/.java)
fi

if [[ "$1" != "" ]]; then
    cd $SCRIPT_DIR/java-app
    mkdir -p src/main/java/com/example
    cp $CURRENT_DIR/$1 src/main/java/com/example/App.java
    mvn clean compile assembly:single
    if [[ "$?" == "0" ]]; then
        java -jar target/app-1.0-SNAPSHOT-jar-with-dependencies.jar
    fi
fi
