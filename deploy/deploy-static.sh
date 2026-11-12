#!/usr/bin/env bash
#
# deploy-static.sh - build frontend jadi file statis (Next.js `output: 'export'`,
# Vite, dll), lalu taruh di folder yang di-serve langsung oleh nginx. Tidak ada
# proses Node.js maupun PM2 yang jalan terus.
#
# Dijalankan langsung di server nginx, dari folder repo:
#   git pull && npm run deploy
#
# Pemakaian:
#   bash deploy/deploy-static.sh [env] [opsi]
#
#   [env]  opsional. Tanpa env: pakai deploy/default.env kalau ada, kalau tidak
#          ada pakai nilai default (deploy ke /var/www/<nama-folder-repo> di
#          mesin ini). Dengan env: pakai deploy/<env>.env (contoh: dev, prod).
#
# Opsi:
#   --skip-install  lewati install dependency
#   --skip-build    pakai out/ hasil build sebelumnya
#   --list          tampilkan daftar release
#   --rollback      kembali ke release sebelumnya (tanpa build); release yang
#                   ditinggalkan dihapus
#   --force         lewati cek branch dan cek working tree bersih
#   -y, --yes       jalan tanpa konfirmasi
#   -h, --help      tampilkan bantuan ini
#
# Struktur di DEPLOY_PATH:
#   releases/<waktu-UTC>-<commit>/  isi OUT_DIR untuk tiap deploy
#   current -> releases/...         symlink yang jadi `root` nginx
#   .deploy.lock/                   ada selama deploy/rollback berjalan
#
# Panduan lengkap: deploy/README.md

set -euo pipefail
umask 022

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -t 1 ]]; then
  C_RED=$'\033[1;31m' C_YELLOW=$'\033[1;33m' C_GREEN=$'\033[1;32m' C_RESET=$'\033[0m'
else
  C_RED='' C_YELLOW='' C_GREEN='' C_RESET=''
fi

info() { printf '%s==> %s%s\n' "$C_YELLOW" "$*" "$C_RESET"; }
ok()   { printf '%s==> %s%s\n' "$C_GREEN" "$*" "$C_RESET"; }
warn() { printf '%sPERINGATAN: %s%s\n' "$C_YELLOW" "$*" "$C_RESET" >&2; }
die()  { printf '%sERROR: %s%s\n' "$C_RED" "$*" "$C_RESET" >&2; exit 1; }

usage() { sed -n '3,/^$/{s/^# \{0,1\}//;p;}' "${BASH_SOURCE[0]}"; }

# ---------------------------------------------------------------------------
# Argumen & config
# ---------------------------------------------------------------------------

ENV_NAME=""
ACTION="deploy"
SKIP_INSTALL=0
SKIP_BUILD=0
FORCE=0
ASSUME_YES=0

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-install) SKIP_INSTALL=1 ;;
      --skip-build) SKIP_BUILD=1 ;;
      --list) ACTION="list" ;;
      --rollback) ACTION="rollback" ;;
      --force) FORCE=1 ;;
      -y | --yes) ASSUME_YES=1 ;;
      -h | --help) usage; exit 0 ;;
      -*) die "Opsi tidak dikenal: $1 (lihat --help)" ;;
      *)
        [[ -z "$ENV_NAME" ]] || die "Hanya boleh satu <env>, dapat '$ENV_NAME' dan '$1'"
        ENV_NAME="$1"
        ;;
    esac
    shift
  done

  [[ -z "$ENV_NAME" || "$ENV_NAME" =~ ^[A-Za-z0-9_-]+$ ]] || die "Nama env tidak valid: $ENV_NAME"
}

# Path fisik (symlink diikuti). Untuk path yang belum ada, folder induk terdekat
# yang sudah ada yang di-resolve, sisanya ditempel apa adanya.
real_dir() {
  local p="$1" rest=""
  while [[ -n "$p" && ! -d "$p" ]]; do
    rest="/${p##*/}$rest"
    p="${p%/*}"
  done
  if [[ -n "$p" ]]; then p="$(cd "$p" && pwd -P)"; fi
  printf '%s%s\n' "${p%/}" "$rest"
}

# has_file <glob-yang-sudah-diekspansi...>: true kalau minimal satu file ada.
has_file() {
  local f
  for f in "$@"; do [[ -e "$f" ]] && return 0; done
  return 1
}

load_config() {
  CONFIG_FILE=""
  if [[ -n "$ENV_NAME" ]]; then
    CONFIG_FILE="$SCRIPT_DIR/$ENV_NAME.env"
    [[ -f "$CONFIG_FILE" ]] ||
      die "Config $CONFIG_FILE tidak ada. Buat dari contoh: cp deploy/env.example deploy/$ENV_NAME.env (atau jalankan tanpa <env> untuk pakai default)"
  elif [[ -f "$SCRIPT_DIR/default.env" ]]; then
    CONFIG_FILE="$SCRIPT_DIR/default.env"
  fi
  CONFIG_DESC="${CONFIG_FILE:+deploy/${CONFIG_FILE##*/}}"
  CONFIG_DESC="${CONFIG_DESC:-default (tanpa file config)}"

  # Di-unset dulu supaya variabel dengan nama sama di shell tidak ikut terpakai
  # (atau ter-export ke build). Yang tidak diisi file config, atau diisi
  # kosong, memakai default.
  unset DEPLOY_HOST DEPLOY_USER DEPLOY_PORT DEPLOY_SSH_OPTS DEPLOY_PATH \
    DEPLOY_BRANCH DEPLOY_URL GIT_PULL KEEP_RELEASES INSTALL_CMD BUILD_CMD OUT_DIR

  if [[ -n "$CONFIG_FILE" ]]; then
    # set -a: semua variabel di config ikut ter-export, termasuk NEXT_PUBLIC_*
    # yang dibutuhkan saat build.
    set -a
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
    set +a
  fi

  DEPLOY_HOST="${DEPLOY_HOST:-}"
  DEPLOY_USER="${DEPLOY_USER:-}"
  DEPLOY_PORT="${DEPLOY_PORT:-22}"
  DEPLOY_SSH_OPTS="${DEPLOY_SSH_OPTS:-}"
  DEPLOY_PATH="${DEPLOY_PATH:-}"
  DEPLOY_BRANCH="${DEPLOY_BRANCH:-}"
  DEPLOY_URL="${DEPLOY_URL:-}"
  GIT_PULL="${GIT_PULL:-0}"
  KEEP_RELEASES="${KEEP_RELEASES:-5}"
  INSTALL_CMD="${INSTALL_CMD:-}"
  BUILD_CMD="${BUILD_CMD:-npm run build}"
  if [[ -z "${OUT_DIR:-}" ]]; then
    # Next.js export ke out/, Vite ke dist/. vite.config.* di project Next.js
    # (biasanya untuk Vitest) tidak dihitung.
    OUT_DIR="out"
    if ! has_file "$PROJECT_ROOT"/next.config.* && has_file "$PROJECT_ROOT"/vite.config.*; then
      OUT_DIR="dist"
    fi
  fi
  [[ -n "$DEPLOY_HOST" ]] && IS_REMOTE=1 || IS_REMOTE=0

  local repo_real
  repo_real="$(real_dir "$PROJECT_ROOT")"
  DEPLOY_PATH="${DEPLOY_PATH%/}"
  if [[ -z "$DEPLOY_PATH" ]]; then
    # Nama folder repo di mesin build tidak ada hubungannya dengan server lain.
    [[ $IS_REMOTE -eq 0 ]] || die "DEPLOY_PATH wajib diisi di $CONFIG_DESC kalau DEPLOY_HOST diisi"
    DEPLOY_PATH="/var/www/$(basename "$PROJECT_ROOT")"
    # Repo di-clone langsung di /var/www/<nama> (pola lama PM2): pakai folder
    # sebelahnya supaya release tidak bercampur dengan isi repo.
    if [[ $IS_REMOTE -eq 0 && "$(real_dir "$DEPLOY_PATH")" == "$repo_real" ]]; then
      DEPLOY_PATH="$DEPLOY_PATH-static"
    fi
  fi

  # Absolut, minimal 2 level, tanpa //, . atau .., dan hanya karakter aman
  # (supaya quoting ke shell server tidak bisa salah tafsir).
  local path_re='^(/[A-Za-z0-9_-][A-Za-z0-9._ -]*){2,}$'
  [[ "$DEPLOY_PATH" =~ $path_re ]] ||
    die "DEPLOY_PATH tidak valid: '$DEPLOY_PATH' (harus absolut, minimal 2 level, karakter A-Z a-z 0-9 . _ - spasi). Set DEPLOY_PATH di file config, lihat deploy/env.example"
  case "$DEPLOY_PATH" in
    /bin | /etc | /home | /opt | /root | /srv | /tmp | /usr | /var | /var/www | /var/www/html)
      die "DEPLOY_PATH terlalu umum ($DEPLOY_PATH), pakai folder khusus app ini" ;;
  esac
  [[ "$KEEP_RELEASES" =~ ^[1-9][0-9]*$ ]] || die "KEEP_RELEASES harus angka >= 1"
  [[ "$OUT_DIR" =~ ^[A-Za-z0-9_][A-Za-z0-9._-]*$ ]] || die "OUT_DIR tidak valid: $OUT_DIR"

  if [[ $IS_REMOTE -eq 1 ]]; then
    SSH_TARGET="${DEPLOY_USER:+$DEPLOY_USER@}$DEPLOY_HOST"
    SSH_CMD="ssh -p $DEPLOY_PORT $DEPLOY_SSH_OPTS"
    TARGET_DESC="$SSH_TARGET:$DEPLOY_PATH"
    command -v ssh >/dev/null || die "ssh tidak ditemukan"
  else
    # Release di dalam repo ikut terhapus oleh git clean dan membuat working
    # tree selalu kotor. Repo di dalam DEPLOY_PATH ditolak oleh target_prepare
    # (folder sudah berisi file lain).
    case "$(real_dir "$DEPLOY_PATH")/" in
      "$repo_real/"* | "$PROJECT_ROOT/"*)
        die "DEPLOY_PATH ($DEPLOY_PATH) sama dengan atau di dalam folder repo ($PROJECT_ROOT). Pakai folder di luar repo, misalnya /var/www/$(basename "$PROJECT_ROOT")-static" ;;
    esac
    TARGET_DESC="$DEPLOY_PATH (mesin ini)"
  fi
}

confirm() {
  [[ $ASSUME_YES -eq 1 || ! -t 0 ]] && return 0
  local answer
  read -r -p "$1 [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]] || die "Dibatalkan"
}

# ---------------------------------------------------------------------------
# Eksekusi di server tujuan (via ssh, atau lokal kalau DEPLOY_HOST kosong)
# ---------------------------------------------------------------------------

# Fungsi bersama yang ikut dikirim ke setiap script di server.
read -r -d '' TARGET_LIB <<'EOF' || true
set -eu
umask 022
LOCK=.deploy.lock
acquire_lock() { # $1 = keterangan pemegang lock
  [ -w . ] || {
    echo "ERROR: user $(id -un) tidak punya hak tulis di $PWD. Perbaiki: sudo chown -R $(id -un): \"$PWD\"" >&2
    exit 1
  }
  if ! mkdir "$LOCK" 2>/dev/null; then
    echo "ERROR: deploy/rollback lain sedang berjalan di $PWD ($(cat "$LOCK/owner" 2>/dev/null || echo '?'))." >&2
    echo "       Kalau yakin tidak ada yang jalan, hapus manual: rm -rf '$PWD/$LOCK'" >&2
    exit 1
  fi
  echo "$1" >"$LOCK/owner"
}
release_lock() { rm -rf "$LOCK"; }
current_release() {
  r="$(readlink current 2>/dev/null || true)"
  echo "${r#releases/}"
}
switch_current() {
  [ -f "releases/$1/index.html" ] || { echo "ERROR: releases/$1/index.html tidak ada" >&2; exit 1; }
  ln -sfn "releases/$1" current.tmp
  # mv -T atomic di GNU coreutils; fallback ln -sfn untuk BSD/macOS.
  mv -Tf current.tmp current 2>/dev/null || { rm -f current.tmp; ln -sfn "releases/$1" current; }
}
EOF

# run_on_target <script> [arg...]  - jalankan script bash di server tujuan.
run_on_target() {
  local body="$1"
  shift
  if [[ $IS_REMOTE -eq 1 ]]; then
    # shellcheck disable=SC2086 # SSH_CMD sengaja di-split jadi argumen
    printf '%s\n%s\n' "$TARGET_LIB" "$body" | $SSH_CMD "$SSH_TARGET" "bash -s -- $(printf '%q ' "$@")"
  else
    printf '%s\n%s\n' "$TARGET_LIB" "$body" | bash -s -- "$@"
  fi
}

target_list() {
  # shellcheck disable=SC2016 # dievaluasi di server
  run_on_target '
cd "$1" 2>/dev/null && [ -n "$(ls -A releases 2>/dev/null)" ] || { echo "(belum ada release di $1)"; exit 0; }
cur="$(current_release)"
ls -1 releases | sort | while read -r r; do
  if [ "$r" = "$cur" ]; then echo "* $r  (current)"; else echo "  $r"; fi
done' "$DEPLOY_PATH"
}

# Rollback = pindah ke release sebelum current, lalu hapus release yang
# ditinggalkan. Release rusak tidak pernah terpilih lagi oleh rollback berikutnya.
target_rollback() {
  # shellcheck disable=SC2016 # dievaluasi di server
  run_on_target '
cd "$1"
acquire_lock "rollback $(date -u +%Y%m%dT%H%M%SZ)"
trap release_lock EXIT
cur="$(current_release)"
[ -n "$cur" ] || { echo "ERROR: current belum ada di $1" >&2; exit 1; }
prev="$(ls -1 releases | sort | awk -v c="$cur" "\$0 < c" | tail -n 1)"
[ -n "$prev" ] || { echo "ERROR: tidak ada release sebelum $cur" >&2; exit 1; }
switch_current "$prev"
rm -rf -- "releases/$cur"
echo "current: $cur -> $prev (release $cur dihapus)"' "$DEPLOY_PATH"
}

# Ambil lock dan buat folder release kosong. Lock dilepas oleh target_activate
# atau target_abort.
target_prepare() {
  # shellcheck disable=SC2016 # dievaluasi di server
  run_on_target '
# Jangan menulis ke folder yang sudah dipakai hal lain (misalnya clone repo lama
# atau root nginx lama berisi file langsung).
if [ -d "$1" ] && [ ! -d "$1/releases" ] && [ ! -L "$1/current" ] && [ -n "$(ls -A "$1" 2>/dev/null)" ]; then
  echo "ERROR: $1 sudah berisi file lain, bukan release dari script ini." >&2
  echo "       Pakai folder baru untuk DEPLOY_PATH (set di file config, lihat deploy/env.example)." >&2
  exit 1
fi
mkdir -p "$1/releases" || {
  echo "ERROR: tidak bisa membuat $1/releases sebagai user $(id -un). Siapkan sekali:" >&2
  echo "       sudo mkdir -p \"$1\" && sudo chown $(id -un): \"$1\"" >&2
  exit 1
}
[ -w "$1/releases" ] || {
  echo "ERROR: user $(id -un) tidak punya hak tulis di $1/releases. Perbaiki:" >&2
  echo "       sudo chown -R $(id -un): \"$1\"" >&2
  exit 1
}
cd "$1"
if [ -e current ] && [ ! -L current ]; then
  echo "ERROR: $1/current sudah ada tapi bukan symlink. Pindahkan dulu (lihat deploy/README.md)." >&2
  exit 1
fi
acquire_lock "deploy $2"
[ ! -e "releases/$2" ] || { release_lock; echo "ERROR: releases/$2 sudah ada" >&2; exit 1; }
mkdir "releases/$2" || { release_lock; exit 1; }' "$DEPLOY_PATH" "$1"
}

# Hapus release yang belum aktif dan lepas lock.
target_abort() {
  # shellcheck disable=SC2016 # dievaluasi di server
  run_on_target '
cd "$1"
[ "$(current_release)" = "$2" ] || rm -rf -- "releases/$2"
release_lock' "$DEPLOY_PATH" "$1"
}

target_activate() {
  # shellcheck disable=SC2016 # dievaluasi di server
  run_on_target '
cd "$1"
switch_current "$2"
echo "current -> releases/$2"
ls -1 releases | sort -r | tail -n +"$(($3 + 1))" | while read -r old; do
  [ "$old" = "$(current_release)" ] && continue
  rm -rf -- "releases/$old"
  echo "hapus release lama: $old"
done
release_lock' "$DEPLOY_PATH" "$1" "$KEEP_RELEASES"
}

upload() {
  local release="$1"
  if [[ $IS_REMOTE -eq 1 ]]; then
    rsync -az -e "$SSH_CMD" "$OUT_PATH/" "$SSH_TARGET:$DEPLOY_PATH/releases/$release/"
  else
    rsync -a "$OUT_PATH/" "$DEPLOY_PATH/releases/$release/"
  fi
}

# ---------------------------------------------------------------------------
# Build lokal
# ---------------------------------------------------------------------------

HAS_GIT=0
GIT_BRANCH="-"
GIT_DIRTY=0

check_git() {
  git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 0
  HAS_GIT=1

  GIT_BRANCH="$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)"
  if [[ -n "$DEPLOY_BRANCH" && "$GIT_BRANCH" != "$DEPLOY_BRANCH" ]]; then
    [[ $FORCE -eq 1 ]] || die "Branch aktif '$GIT_BRANCH', $CONFIG_DESC mewajibkan branch '$DEPLOY_BRANCH' (pakai --force untuk melewati)"
    warn "Deploy dari branch '$GIT_BRANCH', bukan '$DEPLOY_BRANCH'"
  fi

  if [[ -n "$(git -C "$PROJECT_ROOT" status --porcelain)" ]]; then
    [[ $FORCE -eq 1 ]] || die "Ada perubahan yang belum di-commit (pakai --force untuk tetap deploy)"
    warn "Working tree tidak bersih, release ditandai -dirty"
    GIT_DIRTY=1
  fi
}

# Dipanggil setelah konfirmasi, supaya jawaban N tidak mengubah working tree.
git_pull() {
  [[ $HAS_GIT -eq 1 && "$GIT_PULL" == "1" ]] || return 0
  info "git pull --ff-only origin $GIT_BRANCH"
  git -C "$PROJECT_ROOT" pull --ff-only origin "$GIT_BRANCH"
}

# Nama release: waktu UTC (urutan konsisten antar mesin/zona waktu) + commit.
release_name() {
  local commit="nogit"
  if [[ $HAS_GIT -eq 1 ]]; then
    commit="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
    [[ $GIT_DIRTY -eq 0 ]] || commit="$commit-dirty"
  fi
  echo "$(date -u +%Y%m%dT%H%M%SZ)-$commit"
}

check_node_version() {
  [[ -f "$PROJECT_ROOT/.nvmrc" ]] || return 0
  local want have
  want="$(tr -d ' v\n' <"$PROJECT_ROOT/.nvmrc" | cut -d. -f1)"
  have="$(node -v | tr -d v | cut -d. -f1)"
  [[ "$want" =~ ^[0-9]+$ && "$want" != "$have" ]] &&
    warn "Node $(node -v) beda major dengan .nvmrc ($(tr -d '\n' <"$PROJECT_ROOT/.nvmrc"))"
  return 0
}

install_deps() {
  local cmd="$INSTALL_CMD"
  if [[ -z "$cmd" ]]; then
    if [[ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]]; then
      cmd="pnpm install --frozen-lockfile"
    elif [[ -f "$PROJECT_ROOT/yarn.lock" ]]; then
      cmd="yarn install --frozen-lockfile"
    elif [[ -f "$PROJECT_ROOT/package-lock.json" ]]; then
      cmd="npm ci"
    else
      cmd="npm install"
    fi
  fi
  info "Install dependency: $cmd"
  (cd "$PROJECT_ROOT" && bash -c "$cmd")
}

build() {
  info "Build: $BUILD_CMD"
  rm -rf "$OUT_PATH"
  (cd "$PROJECT_ROOT" && bash -c "$BUILD_CMD")
}

# ---------------------------------------------------------------------------
# Alur utama
# ---------------------------------------------------------------------------

deploy() {
  command -v rsync >/dev/null || die "rsync tidak ditemukan"
  OUT_PATH="$PROJECT_ROOT/$OUT_DIR"

  check_git
  printf '\n  config : %s\n  tujuan : %s\n  branch : %s\n  build  : %s\n\n' \
    "$CONFIG_DESC" "$TARGET_DESC" "$GIT_BRANCH" "$([[ $SKIP_BUILD -eq 1 ]] && echo "pakai $OUT_DIR/ yang ada" || echo ya)"
  confirm "Lanjut deploy?"
  git_pull

  if [[ $SKIP_BUILD -eq 0 ]]; then
    command -v node >/dev/null || die "node tidak ditemukan"
    check_node_version
    [[ $SKIP_INSTALL -eq 1 ]] || install_deps
    build
  fi
  [[ -f "$OUT_PATH/index.html" ]] ||
    die "$OUT_DIR/index.html tidak ada. Pastikan build menghasilkan file statis di $OUT_DIR/ (Next.js: output: 'export'; Vite: OUT_DIR=dist)."

  local release
  release="$(release_name)"
  info "Siapkan release $release di $TARGET_DESC"
  target_prepare "$release"
  # Kalau gagal/dibatalkan sebelum aktif: hapus release parsial dan lepas lock.
  PENDING_RELEASE="$release"

  info "Salin $OUT_DIR/ ke release"
  upload "$release" || die "Salin $OUT_DIR/ gagal. current tidak berubah."

  info "Aktifkan release"
  target_activate "$release"
  PENDING_RELEASE=""

  if [[ -n "$DEPLOY_URL" ]]; then
    if curl -fsS -o /dev/null --max-time 15 "$DEPLOY_URL"; then
      ok "Cek $DEPLOY_URL OK"
    else
      warn "Cek $DEPLOY_URL gagal. Periksa nginx; kembalikan dengan: bash deploy/deploy-static.sh ${ENV_NAME:+$ENV_NAME }--rollback"
    fi
  fi

  ok "Deploy selesai: $release -> $TARGET_DESC"
}

PENDING_RELEASE=""

on_exit() {
  local status=$?
  if [[ -n "$PENDING_RELEASE" ]]; then
    warn "Deploy tidak selesai, membersihkan release $PENDING_RELEASE dan lock"
    target_abort "$PENDING_RELEASE" || warn "Gagal membersihkan; cek $TARGET_DESC/.deploy.lock"
  fi
  exit "$status"
}

main() {
  trap on_exit EXIT
  trap 'exit 130' INT TERM
  parse_args "$@"
  load_config
  case "$ACTION" in
    list) target_list ;;
    rollback)
      confirm "Rollback $TARGET_DESC ke release sebelumnya?"
      target_rollback
      ;;
    deploy) deploy ;;
  esac
}

main "$@"
