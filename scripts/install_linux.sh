#!/usr/bin/env bash
#
# This script creates a virtual environment using
# the system-installed Python3 on Linux and
# installs the opentips package.
#
# Usage:
#   chmod +x setup-linux-venv.sh
#   ./setup-linux-venv.sh
#

set -e  # Exit on any error
set -u  # Treat unset variables as an error

echo "======================================="
echo " Checking for Python 3 on Linux..."
echo "======================================="

if ! command -v python3 &>/dev/null; then
  echo "[ERROR] python3 is not installed or not found in PATH."
  echo "        Please install Python 3 (e.g., 'sudo apt-get install python3 python3-venv' on Ubuntu/Debian)."
  exit 1
fi

python3 --version

# Check if python3-venv is installed by trying to run "python3 -m venv --help"
if ! python3 -m venv --help &>/dev/null; then
  echo "[ERROR] The 'venv' module is not available."
  echo "        Please install the venv module (e.g., 'sudo apt-get install python3-venv' on Ubuntu/Debian)."
  exit 1
fi

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
pip install --upgrade --ignore-requires-python opentips

echo
echo "======================================="
echo " Setup complete!"
echo
echo " To use the virtual environment:"
echo "   source \"$(pwd)/venv/bin/activate\""
echo "======================================="
