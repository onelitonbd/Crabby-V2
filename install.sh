#!/data/data/com.termux/files/usr/bin/bash
set -e

RST='\033[0m'
GRN='\033[0;32m'
YLW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
BLD='\033[1m'
TEL='\033[0;36m'

clear

echo ""
echo -e "${TEL}  ╭─────────────────────────────────╮${RST}"
echo -e "${TEL}  │  ◈  C R A B B Y  —  Install     │${RST}"
echo -e "${TEL}  ╰─────────────────────────────────╯${RST}"
echo ""
echo -e "${DIM}  A personal AI agent. No cloud. No account. No telemetry.${RST}"
echo -e "${DIM}  Runs entirely on your Android phone via Termux.${RST}"
echo ""

if [ ! -d "/data/data/com.termux" ]; then
  echo -e "${RED}  ✕ This must be run inside Termux.${RST}"
  echo -e "${DIM}  Install Termux from F-Droid: f-droid.org/en/packages/com.termux/${RST}"
  exit 1
fi

echo -e "${GRN}[1/5]${RST} Updating packages..."
pkg update -y -q 2>/dev/null || true
echo -e "      ${GRN}✓${RST}"

echo -e "${GRN}[2/5]${RST} Installing dependencies..."
# Only install what's actually missing. Asking for `nodejs` unconditionally
# rips out nodejs-lts and replaces it with the current release — which this
# project's 2015-era blessed TUI has not been tested against.
PKGS=""
command -v git  >/dev/null 2>&1 || PKGS="$PKGS git"
command -v curl >/dev/null 2>&1 || PKGS="$PKGS curl"
command -v node >/dev/null 2>&1 || PKGS="$PKGS nodejs"
command -v npm  >/dev/null 2>&1 || PKGS="$PKGS npm"

if [ -n "$PKGS" ]; then
  pkg install -y -q $PKGS 2>/dev/null || {
    echo -e "${RED}  ✕ Failed to install dependencies.${RST}"
    echo -e "${DIM}  Try: pkg install$PKGS${RST}"
    exit 1
  }
else
  echo -e "      ${DIM}already present${RST}"
fi

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}  ✕ node is still not available.${RST}"
  echo -e "${DIM}  Try: pkg install nodejs-lts${RST}"
  exit 1
fi
echo -e "      ${GRN}✓${RST} nodejs $(node --version)"

echo -e "${GRN}[3/5]${RST} Getting Crabby..."
CRABBY="$HOME/crabby"
REPO="https://github.com/onelitonbd/Crabby-V2.git"
# Which ref to install. Override with:  CRABBY_REF=main bash install.sh
CRABBY_REF="${CRABBY_REF:-arena/66541760-crabby-v2}"
echo -e "      ${DIM}ref: ${CRABBY_REF}${RST}"
if [ -d "$CRABBY/.git" ]; then
  echo -e "      existing install — updating..."
  cd "$CRABBY"
  git fetch -q origin "$CRABBY_REF" 2>/dev/null
  git checkout -q "$CRABBY_REF" 2>/dev/null || git checkout -q -b "$CRABBY_REF" "origin/$CRABBY_REF" 2>/dev/null
  git pull -q origin "$CRABBY_REF" 2>/dev/null || echo -e "      ${YLW}⚠ using existing version${RST}"
else
  [ -d "$CRABBY" ] && mv "$CRABBY" "${CRABBY}_backup_$(date +%s)"
  git clone -q -b "$CRABBY_REF" "$REPO" "$CRABBY" || {
    echo -e "${RED}  ✕ Clone failed. Check your connection, or that ref '$CRABBY_REF' exists.${RST}"
    exit 1
  }
fi
echo -e "      ${GRN}✓${RST}"

cd "$CRABBY"

echo -e "${GRN}[4/5]${RST} Installing node modules..."
npm install -q --no-audit --no-fund 2>/dev/null || {
  echo -e "${RED}  ✕ npm install failed.${RST}"
  echo -e "${DIM}  Try: cd ~/crabby && npm install${RST}"
  exit 1
}
echo -e "      ${GRN}✓${RST}"

echo -e "${GRN}[5/5]${RST} Setting up crabby command..."
mkdir -p "$HOME/.crabby"

# In Termux, $PREFIX/bin is always on PATH — no rc-file editing needed.
if [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
  BIN_DIR="$PREFIX/bin"
else
  BIN_DIR="$HOME/.local/bin"
fi
mkdir -p "$BIN_DIR"

# Symlink rather than copy, so `cd ~/crabby && git pull` updates the command too.
chmod +x "$CRABBY/bin/crabby"
ln -sf "$CRABBY/bin/crabby" "$BIN_DIR/crabby"

NEEDS_PATH=""
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    # Only reached outside Termux. Create ~/.bashrc if nothing exists to carry it.
    [ -f "$HOME/.bashrc" ] || echo '# added by crabby install.sh' > "$HOME/.bashrc"
    for RC in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.zshrc"; do
      [ -f "$RC" ] || continue
      grep -q "\.local/bin" "$RC" 2>/dev/null && continue
      echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC"
    done
    export PATH="$BIN_DIR:$PATH"
    NEEDS_PATH=1
    ;;
esac

echo -e "      ${GRN}✓${RST} ${DIM}$BIN_DIR/crabby${RST}"

echo ""
echo -e "  ${BLD}Done.${RST}"
echo ""
echo -e "  ${YLW}crabby${RST}           start"
echo -e "  ${YLW}crabby status${RST}    what Crabby's been thinking"
echo -e "  ${YLW}crabby logs${RST}      daemon log"
echo -e "  ${YLW}crabby stop${RST}      stop daemon"
echo ""
echo -e "  ${DIM}For full features:${RST}"
echo -e "  ${DIM}· Termux:API — f-droid.org/en/packages/com.termux.api/${RST}"
echo -e "  ${DIM}· CrabbyService — github.com/onelitonbd/Crabby-V2/releases${RST}"
echo ""
if [ -n "$NEEDS_PATH" ]; then
  echo -e "  ${YLW}$BIN_DIR was not on your PATH.${RST}"
  echo -e "  ${DIM}Run this first:${RST} ${BLD}source ~/.bashrc${RST}"
  echo ""
fi
echo -e "  ${TEL}Type 'crabby' to begin.${RST}"
echo ""
