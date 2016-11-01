#!/bin/bash
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

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
  botFilePath="/bot/$1"
  shift

  if [ -f "$botFilePath" ]; then
    cd /bot && pwd
    [ -f package.json ] && {
      echo "Install dependencies modules ..."
      yarn
    }
    echo "Executing ts-node $botFilePath $@"
    ts-node "$botFilePath" $@
    ret=$?

    (( $ret != 0 )) && {
      read -t 10 -p "Hit ENTER to see the diagnose output ... "

      echo "### 1. code of $botFile"
      cat $botFilePath

      echo '### 2. directory structor of /bot'
      ls -l /bot

      echo '### 3. package.json'
      cat /bot/package.json

      echo '### 4. directory structor inside /bot/node_modules'
      ls /bot/node_modules

      echo '### 5. wechaty doctor'
      wechaty-doctor

      echo '### please include the above diagnose messages if you submit a issue ###'
      echo
      echo 'Wechaty Issue https://github.com/wechaty/wechaty/issues'
      echo

      figlet ' BUG REPORT '
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
