#!/bin/bash
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

HOME=/bot
PATH=$PATH:/wechaty/node_modules/.bin

figlet " Wechaty "
echo ____________________________________________________
echo "            https://www.wechaty.io"
figlet Connecting
figlet ChatBots

echo
echo -n "Starting Wechaty ... "

VERSION=$(wechaty-version 2>/dev/null || echo '0.0.0(unknown)')

echo "v$VERSION"
echo

if [ "$1" = "shell" ] || \
  [ "$1" = "sh" ] || \
  [ "$1" = "bash" ]
then
  exec /bin/bash -s
  exit $?
fi

if [[ "$1" == *.ts || "$1" == *.js ]]; then

  botFile="$1"
  botFilePath="$HOME/$1"
  shift

  if [ -f "$botFilePath" ]; then
    cd "$HOME" && pwd

    [ -f package.json ] && {
      echo "Install dependencies modules ..."
      yarn
    }

    echo "Linking Wechaty Module ... "
    npm link wechaty > /dev/null

    echo "Executing ts-node $botFilePath $@"
    ret=0
    ts-node "$botFilePath" $@ || ret=$?

    (( "$ret" != 0 )) && {
      figlet ' BUG REPORT '
      read -t 30 -p "Press ENTER to print diagnose output ... " || true
      echo

      echo "### 1. code of $botFile"
      cat $botFilePath

      echo "### 2. directory structor of $HOME"
      ls -l "$HOME"

      echo '### 3. package.json'
      cat "$HOME"/package.json

      echo "### 4. directory structor inside $HOME/node_modules"
      ls "$HOME"/node_modules

      echo '### 5. wechaty doctor'
      wechaty-doctor

      figlet " Submit a ISSUE "
      echo _____________________________________________________________
      echo '####### please paste all the above diagnose messages #######'
      echo
      echo 'Wechaty Issue https://github.com/wechaty/wechaty/issues'
      echo

      read -t 30 -p "Press ENTER to continue ... " || true
    }

    figlet " Wechaty "
    echo ____________________________________________________
    echo "            https://www.wechaty.io"
    figlet " Exit $ret "

    sleep 3
    exit $ret
  else
    echo "ERROR: can not found bot file: $botFile"
    figlet " Troubleshooting "
    cat <<'TROUBLESHOOTING'

      Troubleshooting:

      1. Did you bind the current directory into container?

        check your `docker run ...` command, if there's no `volumn` arg,
        then you need to add it so that we can bind the volume of /bot:

        `--volume="$PWD":/bot`

        this will let the container visit your current directory.

      if you still have issue, please have a look at 
        https://github.com/wechaty/wechaty/issues/66 
        and do a search in issues, that might be help.

TROUBLESHOOTING

    exit -1
  fi

fi

exec npm $@

exit $?
