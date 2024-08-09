#!/bin/bash
export ONLY_FORMAT=$1
jest --bail tests/integration/convert.test.ts
