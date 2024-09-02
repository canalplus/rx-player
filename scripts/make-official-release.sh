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

# Log a line to sterr and exit with error code 1
err() {
  echo "ERROR: $1" >&2
  exit 1
}

# Check that the given command is installed and quit on error if that's not the case
check_dependency() {
  if [ -z $(command -v $1) ]; then
    err "This script needs \"$1\" to be installed and be executable"
  fi
}

# Get the name of the current git branch
current_branch() {
  echo $(git branch | sed -n -e 's/^\* \(.*\)/\1/p')
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
  if ! [ x"$(git rev-parse $checked_branch)" = x"$(git rev-parse $checked_remote/$checked_branch)" ]; then
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

if ! [ -z $(git branch --list "release/v$version") ]; then
  err "Branch name "release/v$version" already exists locally. Please delete it first."
fi

if ! [ -z $(git ls-remote --heads git@github.com:canalplus/rx-player.git "refs/heads/release/v$version") ]; then
  err "Branch name "release/v$version" already exists remotely. Please delete it first."
fi

if npm view rx-player@$version >/dev/null 2>&1; then
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

emphasized_log "Calling update-version script to update files and produce builds..."
npm run update-version $version

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
      if ! [ $(current_branch) == "release/v$version" ]; then
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

$EDITOR CHANGELOG.md
if [ -n "$(git status --porcelain)" ]; then
  emphasized_log "Commiting CHANGELOG.md update..."
  git add CHANGELOG.md
  git commit -m "Update CHANGELOG.md for v$version"
fi

emphasized_log "Pushing \"release/v$version\" branch to GitHub..."
git push git@github.com:canalplus/rx-player.git "release/v$version"

while :; do
  echo ""
  log "~~~~~~~~~~~~~~~~~~~~~~~~~  RxPlayer Release Script  ~~~~~~~~~~~~~~~~~~~~~~~~~"
  log ""
  log "Your release branch has been pushed to release/v$version"
  log "Please open a Pull Request on GitHub's interface for it and ensure the CI"
  log "passes."
  log ""
  log "If the CI fails, you can fix it directly on that release branch, keeping that"
  log "script pending."
  log ""
  log 'Once the CI passes, type "y"'
  log ""
  log "If this script has to be interrupted before the CI passes, please delete the"
  log "remote and local release branch before calling this script again."
  log ""
  log "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  REPLY=""
  read -p "" -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy](es)?$ ]]; then
    break
  fi
done

while :; do
  emphasized_log "Merging \"release/v$version\" branch to \"stable\" branch..."
  git checkout stable
  git merge -S --no-ff "release/v$version" stable

  emphasized_log "Running \"releases:demo\" script to update the gh-pages' demo..."
  npm run releases:demo

  emphasized_log "Running \"releases:doc\" script to update the gh-pages' documentation..."
  npm run releases:doc
  echo ""
  log "~~~~~~~~~~~~~~~~~~~~~~~~~  RxPlayer Release Script  ~~~~~~~~~~~~~~~~~~~~~~~~~"
  log ""
  log "The demo page:"
  log "https://developers.canal-plus.com/rx-player/"
  log ""
  log "And the documentation pages:"
  log "https://developers.canal-plus.com/rx-player/doc/api/Overview.html"
  log ""
  log "Have just been updated (actual deployment may take several minutes, please"
  log "check the anounced version on both pages first)."
  log ""
  log "Check that everything is working as intended."
  log ""
  log 'If those pages are OK, type "y"'
  log ""
  log 'If one of those pages has an issue, type "r"'
  log ""
  log "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  REPLY=""
  read -p "" -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy](es)?$ ]]; then
    emphasized_log "Pushing \"stable\" branch to GitHub..."
    git push git@github.com:canalplus/rx-player.git stable
    break
  elif [[ $REPLY =~ ^[Rr](ewind)?$ ]]; then
    if ! [ $(current_branch) == "stable" ]; then
      err "The current branch is not \"stable\""
    fi
    emphasized_log "Resetting \"stable\" branch and checkouting \"release/v$version\" branch again..."
    check_branch_synchronized_with_remote
    git reset --hard HEAD~1
    git checkout "release/v$version"
    while :; do
      echo ""
      log "~~~~~~~~~~~~~~~~~~~~~~~~~  RxPlayer Release Script  ~~~~~~~~~~~~~~~~~~~~~~~~~"
      log ""
      log "We switched back to the branch: release/v$version"
      log ""
      log "Please fix the seen issues there, then ensure the CI passes."
      log ""
      log "If the CI fails, you can fix it directly on that release branch, keeping that"
      log "script pending."
      log ""
      log 'Once the CI passes, type "y"'
      log ""
      log "If this script has to be interrupted before the CI passes, please delete the"
      log "remote and local release branch before calling this script again."
      log ""
      log "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
      REPLY=""
      read -p "" -n 1 -r
      echo ""

      if [[ $REPLY =~ ^[Yy](es)?$ ]]; then
        break
      fi
    done
  fi
done

echo ""
log "~~~~~~~~~~~~~~~~~~~~~~~~~  RxPlayer Release Script  ~~~~~~~~~~~~~~~~~~~~~~~~~"
log ""
log "The stable branch has been updated to now point to the v$version release and"
log "has been pushed to remote."
log ""
log 'You may now run "npm publish", check the published package, and then create'
log "the release on GitHub's interface (don't forget to include builds in it)."
log ""
log "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
