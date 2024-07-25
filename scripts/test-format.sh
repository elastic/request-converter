#!/bin/bash
export ONLY_FORMAT=$1
node --experimental-vm-modules node_modules/jest/bin/jest.js --bail tests/integration/convert.test.ts
