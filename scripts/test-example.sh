#!/bin/bash
export ONLY_EXAMPLE=$1
jest tests/integration/convert.test.ts
