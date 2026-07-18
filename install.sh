#!/bin/sh

set -eu

PROGRAM_NAME="lingo"
DEFAULT_RELEASES_URL="https://github.com/builder-mafia/lingo/releases"

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Install the Lingo CLI from a GitHub Release.

Usage:
  install.sh [--version <version>] [--install-dir <path>]

Options:
  --version <version>    Install a specific version, for example v0.1.0.
  --install-dir <path>  Install into this directory instead of ~/.local/bin.
  -h, --help            Show this help.

Environment:
  LINGO_VERSION         Default version when --version is omitted.
  LINGO_INSTALL_DIR     Default directory when --install-dir is omitted.
EOF
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

download() {
  url=$1
  destination=$2
  curl --fail --location --silent --show-error --retry 3 \
    --output "$destination" "$url"
}

version=${LINGO_VERSION:-}
install_directory=${LINGO_INSTALL_DIR:-}
releases_url=${LINGO_RELEASES_URL:-$DEFAULT_RELEASES_URL}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      [ "$#" -ge 2 ] || fail "--version requires a value."
      version=$2
      shift 2
      ;;
    --install-dir)
      [ "$#" -ge 2 ] || fail "--install-dir requires a value."
      install_directory=$2
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

for command_name in awk chmod cp curl grep mkdir mktemp mv rm tar uname; do
  require_command "$command_name"
done

if [ -z "$install_directory" ]; then
  [ -n "${HOME:-}" ] || fail "HOME is not set; pass --install-dir."
  install_directory="$HOME/.local/bin"
fi

case "$(uname -s)" in
  Darwin) operating_system="darwin" ;;
  Linux) operating_system="linux" ;;
  *) fail "Unsupported operating system: $(uname -s)" ;;
esac

case "$(uname -m)" in
  arm64 | aarch64) architecture="arm64" ;;
  x86_64 | amd64) architecture="x64" ;;
  *) fail "Unsupported architecture: $(uname -m)" ;;
esac

releases_url=${releases_url%/}
if [ -z "$version" ]; then
  effective_url=$(curl --fail --location --silent --show-error --retry 3 \
    --output /dev/null --write-out '%{url_effective}' "$releases_url/latest") ||
    fail "Could not resolve the latest Lingo release."
  effective_url=${effective_url%/}
  version=${effective_url##*/}
fi

case "$version" in
  v*) ;;
  *) version="v$version" ;;
esac

printf '%s\n' "$version" | grep -Eq \
  '^v[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$' ||
  fail "Invalid version: $version"

platform="$operating_system-$architecture"
archive_name="lingo-$version-$platform.tar.gz"
download_url="$releases_url/download/$version"
temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/lingo-install.XXXXXX") ||
  fail "Could not create a temporary directory."
staged_binary="$install_directory/.lingo.install.$$"

cleanup() {
  rm -rf "$temporary_directory"
  rm -f "$staged_binary"
}
trap cleanup 0
trap 'exit 1' 1 2 3 15

archive_path="$temporary_directory/$archive_name"
checksums_path="$temporary_directory/SHA256SUMS"

printf 'Downloading Lingo %s for %s...\n' "$version" "$platform"
download "$download_url/$archive_name" "$archive_path" ||
  fail "Could not download $archive_name."
download "$download_url/SHA256SUMS" "$checksums_path" ||
  fail "Could not download SHA256SUMS."

expected_checksum=$(
  awk -v filename="$archive_name" \
    '$2 == filename || $2 == "*" filename { print $1; exit }' \
    "$checksums_path"
)
[ -n "$expected_checksum" ] ||
  fail "No checksum found for $archive_name."

if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum=$(sha256sum "$archive_path" | awk '{ print $1 }')
elif command -v shasum >/dev/null 2>&1; then
  actual_checksum=$(shasum -a 256 "$archive_path" | awk '{ print $1 }')
else
  fail "SHA-256 verification requires sha256sum or shasum."
fi

[ "$actual_checksum" = "$expected_checksum" ] ||
  fail "Checksum verification failed for $archive_name."

archive_entries=$(tar -tzf "$archive_path") ||
  fail "Could not inspect $archive_name."
[ "$archive_entries" = "$PROGRAM_NAME" ] ||
  fail "Release archive has unexpected contents."

tar -xzf "$archive_path" -C "$temporary_directory" ||
  fail "Could not extract $archive_name."
[ -f "$temporary_directory/$PROGRAM_NAME" ] ||
  fail "Release archive does not contain the Lingo binary."

mkdir -p "$install_directory" ||
  fail "Could not create install directory: $install_directory"
cp "$temporary_directory/$PROGRAM_NAME" "$staged_binary" ||
  fail "Could not stage the Lingo binary."
chmod 755 "$staged_binary" || fail "Could not make the Lingo binary executable."
"$staged_binary" --version >/dev/null 2>&1 ||
  fail "Downloaded Lingo binary could not run on this computer."
mv -f "$staged_binary" "$install_directory/$PROGRAM_NAME" ||
  fail "Could not install Lingo into $install_directory."

printf 'Installed Lingo %s to %s/%s\n' \
  "$version" "$install_directory" "$PROGRAM_NAME"

case ":${PATH:-}:" in
  *":$install_directory:"*) ;;
  *)
    printf 'Add %s to PATH before running lingo.\n' "$install_directory" >&2
    ;;
esac
