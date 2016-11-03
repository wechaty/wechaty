#!/bin/bash
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

HOME=/bot
PATH=$PATH:/wechaty/node_modules/.bin

function wechaty::banner() {
  figlet " Wechaty "
  echo ____________________________________________________
  echo "            https://www.wechaty.io"
}

function wechaty::errorBotNotFound() {
  local file=$1
  echo "ERROR: can not found bot file: $file"
  figlet " Troubleshooting "
  cat <<'TROUBLESHOOTING'

    Troubleshooting:

    1. Did you bind the current directory into container?

      check your `docker run ...` command, if there's no `volumn` arg,
      then you need to add it so that we can bind the volume of /bot:

        `--volume="$(pwd)":/bot`

      this will let the container visit your current directory.

    if you still have issue, please have a look at 
      https://github.com/wechaty/wechaty/issues/66 
      and do a search in issues, that might be help.

TROUBLESHOOTING
}

function wechaty::errorCtrlC() {
  # http://www.tldp.org/LDP/abs/html/exitcodes.html
  # 130 Script terminated by Control-C  Ctl-C Control-C is fatal error signal 2, (130 = 128 + 2, see above)
  echo ' Script terminated by Control-C '
  figlet ' Ctrl + C '
}

function wechaty::pressEnterToContinue() {
  local -i timeoutSecond=${1:-30}
  local message=${2:-'Press ENTER to continue ... '}

  read -r -t "$timeoutSecond"  -p "$message" || true
  echo
}

function wechaty::diagnose() {
  local -i ret=$1  && shift
  local file=$1 && shift

: echo " exit code $ret "
  figlet ' BUG REPORT '
  wechaty::pressEnterToContinue

  echo
  echo "### 1. source code of $file"
  echo
  cat "$HOME/$file"

  echo
  echo "### 2. directory structor of $HOME"
  echo
  ls -l "$HOME"

  echo
  echo '### 3. package.json'
  echo
  cat "$HOME"/package.json

  echo
  echo "### 4. directory structor inside $HOME/node_modules"
  echo
  ls "$HOME"/node_modules

  echo
  echo '### 5. wechaty doctor'
  echo
  wechaty-doctor

  figlet " Submit a ISSUE "
  echo _____________________________________________________________
  echo '####### please paste all the above diagnose messages #######'
  echo
  echo 'Wechaty Issue https://github.com/wechaty/wechaty/issues'
  echo

  wechaty::pressEnterToContinue
}

function wechaty::runBot() {
  local botFile=$1

  if [ ! -f "$HOME/$botFile" ]; then
    wechaty::errorBotNotFound "$botFile"
    return 1
  fi

  echo  "Working directory: $HOME"
  cd    "$HOME"

  [ -f package.json ] && {
    echo "Install dependencies modules ..."
    yarn
  }

  echo "Link Wechaty Module ... "
  npm link wechaty > /dev/null

  echo "Executing ts-node $*"
  local -i ret=0
  ts-node "$@" || ret=$?

  case "$ret" in
    0)
      ;;
    130)
      wechaty::errorCtrlC
      ;;
    *)
      wechaty::diagnose "$ret" "$@"
      ;;
  esac

#  if (( "$ret" != 0 )); then
#    if (( "$ret" == 130 )); then
#      wechaty::errorCtrlC
#    else 
#      wechaty::diagnose "$ret" $@
#    fi
#  fi

  return "$ret"
}

function main() {
  wechaty::banner
  figlet Connecting
  figlet ChatBots

  echo
  echo -n "Starting Wechaty ... "

  VERSION=$(WECHATY_LOG=WARN wechaty-version 2>/dev/null || echo '0.0.0(unknown)')

  echo "v$VERSION"
  echo

  local -i ret=0

  case "$1" in
    #
    # 1. Get a shell
    #
    shell | sh | bash)
      /bin/bash -s || ret=$?
      ;;

    #
    # 2. Run a bot
    #
    *.ts | *.js)
      wechaty::runBot "$@" || ret=$?
      ;;

    #
    # 3. Execute npm run ...
    #
    *)
      npm "$@" || ret=$?
     ;;
  esac

  wechaty::banner
  figlet " Exit $ret "
  wechaty::pressEnterToContinue 3
 
  #
  # 1. Get a shell
  #
#  if [ "$1" = "shell" ] || \
#    [ "$1" = "sh" ] || \
#    [ "$1" = "bash" ]
#  then
#    exec /bin/bash -s
#    return $?
#  fi

  #
  # 2. Run a bot
  #
#  if [[ "$1" == *.ts || "$1" == *.js ]]; then
#    wechaty::runBot $@
#
#    wechaty::banner
#    figlet " Exit $ret "
#
#    wechaty::pressEnterToContinue 3
#    return $ret
#  fi

  #
  # 3. Execute npm run ...
  #
#  ret=0
#  exec npm $@ || ret=$?
#
#  wechaty::banner
#  figlet " Exit $ret "
#  wechaty::pressEnterToContinue
#
#  return $ret
}

main "$@"

