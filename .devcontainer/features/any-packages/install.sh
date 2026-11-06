#!/usr/bin/env bash
set -e

# Match Node feature's USERNAME initialization
USERNAME="${USERNAME:-"${_REMOTE_USER:-"automatic"}"}"

# Require root
if [ "$(id -u)" -ne 0 ]; then
  echo 'Script must be run as root. Use sudo, su, or add "USER root" to your Dockerfile before running this script.'
  exit 1
fi

if [ -z "${PACKAGES}" ]; then
  echo "🔧 Feature 'any-packages': PACKAGES is empty, nothing to install. Done."
  exit 0
fi

# ---- Username resolution ----
if [ "${USERNAME}" = "auto" ] || [ "${USERNAME}" = "automatic" ]; then
  USERNAME=""
  POSSIBLE_USERS=("vscode" "node" "codespace" "$(awk -v val=1000 -F ":" '$3==val{print $1}' /etc/passwd)")
  for CURRENT_USER in "${POSSIBLE_USERS[@]}"; do
    if id -u ${CURRENT_USER} > /dev/null 2>&1; then
      USERNAME=${CURRENT_USER}
      break
    fi
  done
  if [ "${USERNAME}" = "" ]; then
    USERNAME=root
  fi
elif [ "${USERNAME}" = "none" ] || ! id -u ${USERNAME} > /dev/null 2>&1; then
  USERNAME=root
fi

echo "🔧 Feature 'any-packages': using USERNAME='${USERNAME}'"

# ---- Normalize PACKAGES into a space-separated list ----
# Handles: "pkg1, pkg2", "pkg1 pkg2", '["pkg1", "pkg2"]'
NORMALIZED="$(printf '%s\n' "${PACKAGES}" \
  | sed -e 's/\[//g' -e 's/\]//g' -e 's/\"//g' \
  | tr ',' ' ' \
  | tr -s '[:space:]' ' ')"

# Trim leading/trailing spaces
NORMALIZED="$(echo "${NORMALIZED}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

if [ -z "${NORMALIZED}" ]; then
  echo "🔧 Feature 'any-packages': After normalization, package list is empty. Nothing to do."
  exit 0
fi

APT_PACKAGES=""
NPM_PACKAGES=""
PIP_PACKAGES=""

# Split by space and categorize
for pkg in ${NORMALIZED}; do
  if [[ "${pkg}" == npm:* ]]; then
    NPM_PACKAGES="${NPM_PACKAGES} ${pkg#npm:}"
  elif [[ "${pkg}" == pip:* ]]; then
    PIP_PACKAGES="${PIP_PACKAGES} ${pkg#pip:}"
  else
    # Default to apt if no prefix (or explicit apt: prefix if we wanted to support it)
    if [[ "${pkg}" == apt:* ]]; then
        APT_PACKAGES="${APT_PACKAGES} ${pkg#apt:}"
    else
        APT_PACKAGES="${APT_PACKAGES} ${pkg}"
    fi
  fi
done

# --- Install APT Packages ---
if [ -n "${APT_PACKAGES}" ]; then
    echo "📦 Installing APT packages: ${APT_PACKAGES}"

    # Update if we haven't recently (simple check)
    if [ "$(find /var/lib/apt/lists/* | wc -l)" = "0" ]; then
        apt-get update -y
    fi

    # Install
    apt-get -y install --no-install-recommends ${APT_PACKAGES}

    # Cleanup
    rm -rf /var/lib/apt/lists/*
fi

# --- Install NPM Packages ---
if [ -n "${NPM_PACKAGES}" ]; then
    echo "📦 Installing NPM packages: ${NPM_PACKAGES}"

    NVM_DIR="${NVM_DIR:-"/usr/local/share/nvm"}"

    # Install globally as the user
    set -f
    su "${USERNAME}" -c "
      set -e
      umask 0002
      if [ -s '${NVM_DIR}/nvm.sh' ]; then
        . '${NVM_DIR}/nvm.sh'
        if type nvm >/dev/null 2>&1; then
          nvm use default >/dev/null 2>&1 || true
        fi
      fi
      npm install -g ${NPM_PACKAGES}
    "
    set +f
fi

# --- Install PIP Packages ---
if [ -n "${PIP_PACKAGES}" ]; then
    echo "📦 Installing PIP packages: ${PIP_PACKAGES}"

    # Check if pip is available
    if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
        echo "⚠️ pip not found. Attempting to install python3-pip..."
        apt-get update -y && apt-get install -y python3-pip
    fi

    # Install globally (system-wide) or user?
    # Usually in devcontainers, we might want global if we are root, but for python it's tricky with 'break-system-packages'.
    # Let's try to install as the user if possible, or global with the flag if needed.
    # However, 'pip install --user' puts things in ~/.local/bin which might not be in PATH.
    # Let's stick to global installation for simplicity in devcontainer context,
    # but we might need --break-system-packages on newer Ubuntus (24.04 is very new).

    PIP_CMD="pip3"
    if ! command -v pip3 &> /dev/null; then PIP_CMD="pip"; fi

    # Check for break-system-packages support (simple heuristic or just try/catch?)
    # Ubuntu 24.04 definitely needs --break-system-packages for system python.

    # We'll run as root to install globally for everyone
    $PIP_CMD install --break-system-packages ${PIP_PACKAGES} || $PIP_CMD install ${PIP_PACKAGES}
fi

echo "✅ Feature 'any-packages': Finished."
