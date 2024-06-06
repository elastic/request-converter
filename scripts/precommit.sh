#!/bin/bash -e
npm run fix:lint
npm run fix:prettier
git add $(git diff --cached --name-only --diff-filter=ACM)
