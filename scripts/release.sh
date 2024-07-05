#!/bin/bash

# make sure there are no uncommitted changes
if [[ $(git status -uno --porcelain) != "" ]]; then
    echo "There are uncommitted changes in the repository."
    echo "Please commit or stash them before running this script."
    echo
    git status
    exit 1
fi

# get the release branch
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == "main" ]]; then
    echo "Must be run from a release branch!"
    exit 1
fi

# make sure the schema is up to date
npm run update-schema
if [[ $(git status -uno --porcelain) != "" ]]; then
    echo "Review and commit the updated schema, then run this script again."
    git status
    exit 1
fi

# generate the next release version number
LAST_VERSION=$(jq -r .version package.json)
if [[ "$(git tag -l v$LAST_VERSION)" == "" ]]; then
    # the version in package.json was never released, so we assume this is the
    # first release in this branch
    VERSION=${BRANCH}.0
else
    VERSION="${LAST_VERSION%.*}.$((${LAST_VERSION##*.}+1))"
fi
read -p "Next release will be $VERSION"

# generate release notes
GIT_REPO=elastic\\$(git config --get remote.origin.url | grep -oE "\/[0-9a-zA-Z_-]+")
PREVIOUS_RELEASE_SHA=$(git log --oneline | grep Release | head -n1 | cut -d " " -f1)
GIT_RANGE=
if [[ "$PREVIOUS_RELEASE_SHA" != "" ]]; then
    GIT_RANGE=$PREVIOUS_RELEASE_SHA...HEAD
fi
git log --pretty=format:"%h %s" $GIT_RANGE | grep -oE "[0-9a-f]+ .*?\(#[0-9]+\)" | sed -E "s/[0-9a-f]+ /* /" | sed -E "s/\`/\`\`/g" | sed -E "s/\(#([0-9]+)\)/(\[#\1](https:\/\/github.com\/"$GIT_REPO"\/pull\/\1))/" > _log.md

head -n 2 CHANGES.md > _CHANGES.md
echo "## $VERSION ($(date '+%Y-%m-%d'))" >> _CHANGES.md
printf "\n" >> CHANGES.md
cat _log.md >> _CHANGES.md
rm _log.md
tail -n +2 CHANGES.md >> _CHANGES.md
mv _CHANGES.md CHANGES.md

# edit release notes
${EDITOR:-vi} _log.md

# update package version
sed -i .bak 's/^  "version": ".*",$/  "version": "'$VERSION'",/' package.json
rm package.json.bak

git diff
read -p "Press ENTER to generate release $VERSION"

# commit release changes
git add package.json CHANGES.md src/schema.json
git commit -m "Release $VERSION"
git tag -f v$VERSION

echo "Release $VERSION is now ready!"
echo "Next steps:"
echo "- run 'git push --tags origin $BRANCH'"
echo "- wait for CI to run and succeed"
echo "- run the 'Publish package to npm' on GitHub actions"
