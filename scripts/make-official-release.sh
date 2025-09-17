#!/bin/bash

# Make official release
# =====================
#
# This script helps RxPlayer developers to make a new official RxPlayer release.
#
# To use it:
#
#   1. Be sure that you're either on the `stable` branch (if this is a "patch"
#      release in terms of SEMVER) or on the `dev` branch (if this is a "minor"
#      SEMVER release)
#
#   2. Call this script, you may optionally provide the wanted version as an
#      argument to this script. If no argument is provided, the script will ask
#      for your wanted version number.
#
#   3. Wait for all the commands to finish and stay attentive to the output. It
#      will ask you for inputs at various steps and tell you what you need to
#      know to make a release.

set -e

# Log a line prefixed with our script's name
log() {
  echo "---- RxPlayer Release Script ----   $1"
}

# Log a line prefixed with our script's name after an empty line then sleep a little
emphasized_log() {
  echo ""
  log "$1"
  sleep 3.8
}

# Log a line to stderr and exit with error code 1
err() {
  echo "ERROR: $1" >&2
  exit 1
}

# Check that the given command is installed and quit on error if that's not the case
check_dependency() {
  if [ -z "$(command -v "$1")" ]; then
    err "This script needs \"$1\" to be installed and be executable"
  fi
}

# Get the name of the current git branch
current_branch() {
  git branch | sed -n -e 's/^\* \(.*\)/\1/p'
}

# Get the local name for canalplus's remote repository
git_remote_name() {
  git remote -v | grep "git@github.com:canalplus/rx-player.git" | grep "(push)" | cut -f1
}

# Check that the current branch is up-to-date with remote, errors if that's not
# the case
check_branch_synchronized_with_remote() {
  checked_branch=$(current_branch)
  checked_remote=$(git_remote_name)
  if ! [ "$(git rev-parse "$checked_branch")" = "$(git rev-parse "$checked_remote"/"$checked_branch")" ]; then
    err "The branch \"$checked_branch\" is not synchronized with the remote \"$checked_remote\". Please synchronize it first."
  fi
}

check_dependency git
check_dependency echo
check_dependency npm
check_dependency cut
check_dependency grep
check_dependency sed
check_dependency sleep

base_branch=$(current_branch)

if ! [ "$base_branch" == "dev" ] && ! [ "$base_branch" == "stable" ]; then
  err "The base branch for releases should be either \"dev\" or \"stable\""
fi

if [ -n "$(git status --porcelain)" ]; then
  err "Please commit your modifications first"
fi

echo "Checking current branch is synchronized with remote..."
check_branch_synchronized_with_remote

if [ $# -eq 0 ]; then
  read -r -p "Please enter the wanted version number (example: 4.12.1): " version
  echo ""
  if [ -z "${version}" ]; then
    # TODO SEMVER REGEX?
    err "Please enter a valid version number next time."
  fi
else
  version=$1
fi

emphasized_log "This script will create the official version: $version"

echo "checking that the branche does not already exist locally or remotely..."
if ! [ -z "$(git branch --list "release/v$version")" ]; then
  err "Branch name \"release/v""$version""\" already exists locally. Please delete it first."
fi

if ! [ -z "$(git ls-remote --heads git@github.com:canalplus/rx-player.git "refs/heads/release/v$version")" ]; then
  err "Branch name \"release/v""$version""\" already exists remotely. Please delete it first."
fi

echo "checking that the version are not already published on npm..."
if npm view "rx-player@$version" >/dev/null 2>&1; then
  err "Version already published to npm: $version"
fi

if [ "$base_branch" == "dev" ]; then
  emphasized_log "Checkout the stable branch and pull it..."
  git checkout stable
  git pull git@github.com:canalplus/rx-player.git stable

  if [ -n "$(git status --porcelain)" ]; then
    err "Please commit your modifications first"
  fi

  check_branch_synchronized_with_remote

  emphasized_log "Rebase the dev branch on stable..."
  git checkout dev
  git rebase stable --rebase-merges
fi

if [ -n "$(git status --porcelain)" ]; then
  err "Error after doing rebases: updated files"
fi

emphasized_log "Creating \"release/v$version\" branch..."
git checkout -b "release/v$version"

emphasized_log "Calling update-version script to update files with the last version..."
npm run update-version "$version"

# Make Changelog
npm run releases:changelog -- "$version"

$EDITOR CHANGELOG.md
echo "Running prettier on CHANGELOG.md..."
npx prettier --write CHANGELOG.md --log-level silent
echo ""

if [ -n "$(git status --porcelain)" ]; then
  echo ""
  log "Current $base_branch branch status:"
  git status

  while :; do
    echo ""
    log "We will push the following modification to a new release/v$version branch."
    REPLY=""
    read -p "do you want to continue [y/d/s/a/c/t/h] (h for help) ? " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Hh](elp)?$ ]]; then
      log "+- help -------------------------------------------------+"
      log "| y: commit, push and continue                           |"
      log "| d: see diff                                            |"
      log "| s: see status                                          |"
      log "| a: abort script from here                              |"
      log "| h: see this help                                       |"
      log "+--------------------------------------------------------+"
    elif [[ $REPLY =~ ^[Yy](es)?$ ]]; then
      if ! [ "$(current_branch)" == "release/v$version" ]; then
        err "The current branch is not \"release/v$version\""
      fi
      emphasized_log "Commiting those updates..."
      git add --all
      git commit -m "update version to $version"
      break
    elif [[ $REPLY =~ ^[Dd](iff)?$ ]]; then
      git diff || true # ignore when return 1
    elif [[ $REPLY =~ ^[Ss](tatus)?$ ]]; then
      git status
    elif [[ $REPLY =~ ^[Aa](bort)?$ ]]; then
      log "exiting"
      exit 0
    fi
  done
else
  log "nothing to do on the release branch"
fi

emphasized_log "Running \"releases:demo\" script to update the gh-pages' demo..."
npm run releases:demo

emphasized_log "Running \"releases:doc\" script to update the gh-pages' documentation..."
npm run releases:doc

git checkout "release/v$version"

emphasized_log "Pushing \"release/v$version\" branch to GitHub..."
# TODO: Include release note as a tag description?
git tag -s -a "v${version}" -m "RxPlayer release: v${version}"
git push git@github.com:canalplus/rx-player.git "release/v$version"

echo ""
log "~~~~~~~~~~~~~~~~~~~~~~~~~  RxPlayer Release Script  ~~~~~~~~~~~~~~~~~~~~~~~~~"
log ""
log "Your release branch has been pushed to a new \"release/v$version\" branch"
log "Please open a Pull Request on GitHub's interface for it and ensure the CI"
log "passes. If the corresponding CI jobs do not trigger - it might be because"
log "this is a retry attempt, in which case you may need to trigger it manually."
log ""
log "If the CI passes, it should automatically publish a version and merge that"
log "work into the \"stable\" branch of the rx-player"
log ""
log "If the CI fails:"
log "  1. Remove the \"release/v$version\" branch locally and remotely:"
log "     - local remove: \`git branch -d \"release/v$version\"\`"
log "     - remote remove: \`git push origin --delete \"release/v$version\"\`"
log "  2. Remove the version tag from the RxPlayer repository locally and remotely:"
log "     - local remove: \`git tag -d \"$version\"\`"
log "     - remote remove: \`git push origin --delete tag \"$version\"\`"
log "  3. Re-launch this script again."
log ""
log "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
git checkout "$base_branch"
