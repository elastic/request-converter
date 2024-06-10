#!/bin/bash
export ONLY_LANGUAGE=$1
jest tests/integration/convert.test.ts
