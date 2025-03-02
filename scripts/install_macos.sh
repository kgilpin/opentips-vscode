#!/usr/bin/env bash
#
# This script creates a virtual environment using
# the system-installed Python3 on macOS and
# installs the opentips package.
#

set -e  # Exit on any error
set -u  # Treat unset variables as an error

echo "======================================="
echo " Checking for Python 3 on macOS..."
echo "======================================="

if ! command -v python3 &>/dev/null; then
  echo "[ERROR] python3 is not installed or not found in PATH."
  echo "        Please install Python 3 (e.g., via Xcode command line tools or Homebrew)."
  exit 1
fi

python3 --version

echo
echo "======================================="
echo " Creating virtual environment 'venv'..."
echo "======================================="
python3 -m venv venv

echo
echo "======================================="
echo " Activating virtual environment..."
echo "======================================="
# shellcheck disable=SC1091
source venv/bin/activate

echo
echo "======================================="
echo " Upgrading pip, installing opentips..."
echo "======================================="
pip install --upgrade pip
pip install --ignore-requires-python opentips

echo
echo "======================================="
echo " Setup complete!"
echo
echo " To use the virtual environment:"
echo "   source \"$(pwd)/venv/bin/activate\""
echo "======================================="
