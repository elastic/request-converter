#!/bin/bash
export ONLY_FORMAT=$1
jest tests/integration/convert.test.ts
