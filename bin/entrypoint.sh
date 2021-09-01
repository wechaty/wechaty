#!/usr/bin/env bash
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

export HOME=/bot
export PATH=$PATH:/wechaty/bin:/wechaty/node_modules/.bin

function wechaty::banner() {
  echo
  figlet " Wechaty "
  echo ____________________________________________________
  echo "            https://www.chatie.io"
}

function wechaty::errorBotNotFound() {
  local file=$1
  echo "Container ERROR: can not found bot file: $HOME/$file"

  echo "Container PWD: $(pwd)"
  echo "Container HOME: $HOME"
  echo "Container LS $HOME: $(ls -l $HOME)"

  figlet " Troubleshooting "
  cat <<'TROUBLESHOOTING'

    Troubleshooting:

    1. Did you bind the current directory into container?

      check your `docker run ...` command, if there's no `volumn` arg,
      then you need to add it so that we can bind the volume of /bot:

        `--volume="$(pwd)":/bot`

      this will let the container visit your current directory.

    2. Are you sure your .js/.ts files aren't .js.txt/.ts.txt?

      this could be a problem on new Windows installs (file
      extensions hidden by default).

    if you still have issue, please have a look at
      https://github.com/wechaty/wechaty/issues/66
      and do a search in issues, that might be help.

TROUBLESHOOTING
}

function wechaty::printEnv () {
  num=$(env | grep -c WECHATY)
  echo "WECHATY Environment Variables: $num"
  env | grep WECHATY
}

function wechaty::errorCtrlC () {
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

  echo "ERROR: Bot exited with code $ret"

  figlet ' BUG REPORT '
  wechaty::pressEnterToContinue 30

  echo
  echo "### 1. source code of $file"
  echo
  cat "$HOME/$file" || echo "ERROR: file not found"
  echo

  echo
  echo "### 2. directory structor of $HOME"
  echo
  ls -l "$HOME"

  echo
  echo '### 3. package.json'
  echo
  cat "$HOME"/package.json || echo "No package.json"

  echo
  echo "### 4. directory structor inside $HOME/node_modules"
  echo
  ls "$HOME"/node_modules || echo "No node_modules"

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
    # echo "Install dependencies modules ..."

    #
    # NPM module install will have problem in China.
    # i.e. chromedriver need to visit a google host to download binarys.
    #
    echo "Please make sure you had installed all the NPM modules which is depended on your bot script."
    # yarn < /dev/null || return $? # yarn will close stdin??? cause `read` command fail after yarn

    #
    # Issue https://github.com/wechaty/wechaty/issues/1478
    #   As a conclusion: we should better not to link the local node_modules to the Docker global.
    #
    # wechaty::linkBotNodeModules
  }

  # echo -n "Linking Wechaty module to bot ... "
  # npm link wechaty < /dev/null > /dev/null 2>&1
  # echo "linked. "

  # npm --progress=false install @types/node > /dev/null

  #
  # Huan(202108) node_arg: --es-module-specifier-resolution=node
  #
  #   Make .js extension default for ESM imports
  #     See: https://github.com/nodejs/node/issues/30927#issuecomment-575998045 \
  #
  local -i ret=0
  case "$botFile" in
    *.js | *.cjs | *.mjs)
      echo "Executing node $*"
      node \
        --es-module-specifier-resolution=node \
        "$@" \
        &
      ;;
    *.ts)
      echo "Executing node --loader=ts-node/esm $*"
      node \
        --es-module-specifier-resolution=node \
        --no-warnings \
        --loader=ts-node/esm \
        "$@" \
        &
      ;;
    *)
      echo "ERROR: wechaty::runBot() neither .{js,cjs,mjs} nor .ts"
      exit 1 &
  esac

  wait "$!" || ret=$? # fix `can only `return' from a function or sourced script` error

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

  return "$ret"
}

# Issue https://github.com/wechaty/wechaty/issues/1478
# To Be Tested:
function wechaty::linkBotNodeModules() {
  for localModule in /bot/node_modules/*; do
    [ -e "$localModule" ] || continue

    module=${localModule//\/bot\/node_modules\//}

    globalModule="/node_modules/$module"

    if [ ! -e "$globalModule" ]; then
      ln -sf "$localModule" /node_modules/
    # else
      # echo "$globalModule exists"
    fi
  done
}

function wechaty::io-client() {
  figlet " Chatie.io "
  figlet " Authing By:"
  echo
  echo "WECHATY_TOKEN=$WECHATY_TOKEN "
  echo

  pushd /wechaty
  npm run io-client
  popd
}

function wechaty::help() {
  figlet " Docker Usage: "
  cat <<HELP



  Usage: wechaty [ mybot.js | mybot.ts | COMMAND ]

  Run a JavaScript/TypeScript <Bot File>, or a <Wechaty Command>.

  <Bot File>:
    mybot.js: a JavaScript program for your bot.
    mybot.ts: a TypeScript program for your bot.

  <Commands>:
    demo    Run Wechaty DEMO
    doctor  Print Diagnose Report
    test    Run Unit Test

  Learn more at:
    https://github.com/wechaty/wechaty/wiki/Docker



HELP
}

function main() {
  # issue #84
  echo -e 'nameserver 114.114.114.114\nnameserver 1.1.1.1\nnameserver 8.8.8.8' | sudo tee -a /etc/resolv.conf > /dev/null

  wechaty::banner
  figlet Connecting
  figlet ChatBots

  wechaty::printEnv

  VERSION=$(WECHATY_LOG=WARN wechaty-version 2>/dev/null || echo '0.0.0(unknown)')

  echo
  echo -n "Starting Docker Container for Wechaty v$VERSION with "
  echo -n "Node.js $(node --version) ..."
  echo

  local -i ret=0

  local defaultArg=help
  if [ -n "$WECHATY_TOKEN" ]; then
    defaultArg=io-client
  fi

  case "${1:-${defaultArg}}" in
    #
    # 1. Get a shell
    #
    shell | sh | bash)
      /bin/bash -s || ret=$?
      ;;

    #
    # 2. Run a bot
    #
    *.ts | *.js | *.cjs | *.mjs)
      # set -e will not work inside wechaty::runBot because of
      # http://stackoverflow.com/a/4073372/1123955
      wechaty::runBot "$@" || ret=$?
      ;;

    #
    # 3. If there's additional `npm` arg...
    #
    npm)
      shift
      npm "$@" || ret=$?
      ;;

    help|version)
      wechaty::help
      ;;

    io-client)
      wechaty::io-client
      ;;

    test)
      # WECHATY_LOG=silent npm run test:unit
      if [ -f "$HOME"/package.json ]; then
        pushd "$HOME"
      else
        pushd /wechaty
      fi
      WECHATY_LOG=silent npm run test
      popd
      ;;

    #
    # 4. Default to execute npm run ...
    #
    *)
      [ "$1" = "run" ] && shift
      npm run "$@" || ret=$?
     ;;
  esac

  wechaty::banner
  figlet " Exit $ret "
  return $ret
}

main "$@"

