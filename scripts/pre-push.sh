#!/bin/bash
#
# An example hook script to verify what is about to be committed.
# Called by "git commit" with no arguments.  The hook should
# exit with non-zero status after issuing an appropriate message if
# it wants to stop the commit.
#
# To enable this hook, rename this file to "pre-commit".
set -e

[ -n "$NO_HOOK" ] && exit 0

[ -n "$HUAN_INNER_PRE_HOOK" ] && {
  # http://stackoverflow.com/a/21334985/1123955
  exit 0
}

npm run lint

[ -z "$CYGWIN" ] && {
  # git rebase
  rm -f package-lock.json
  npm version patch --no-package-lock
  HUAN_INNER_PRE_HOOK=1 git push

  cat <<'_STR_'
  ____ _ _        ____            _
 / ___(_) |_     |  _ \ _   _ ___| |__
| |  _| | __|    | |_) | | | / __| '_ \
| |_| | | |_     |  __/| |_| \__ \ | | |
 \____|_|\__|    |_|    \__,_|___/_| |_|

 ____                              _ _
/ ___| _   _  ___ ___ ___  ___  __| | |
\___ \| | | |/ __/ __/ _ \/ _ \/ _` | |
 ___) | |_| | (_| (_|  __/  __/ (_| |_|
|____/ \__,_|\___\___\___|\___|\__,_(_)

_STR_

  echo
  echo
  echo
  echo " ### Npm verion bumped and pushed by inner push inside hook pre-push ###"
  echo " ------- vvvvvvv outer push will be canceled, never mind vvvvvvv -------"
  echo
  echo
  echo
  exit 127
}

# must run this after the above `test` ([ -z ...]),
# or will whow a error: error: failed to push some refs to 'git@github.com:Chatie/wechaty.git'
echo "PRE-PUSH HOOK PASSED"
echo

