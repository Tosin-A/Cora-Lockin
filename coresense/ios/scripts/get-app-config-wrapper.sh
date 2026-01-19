#!/bin/bash
# Wrapper script to properly handle paths with spaces when calling get-app-config-ios.sh

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
EXPO_CONSTANTS_DIR="$SCRIPT_DIR/../../node_modules/expo-constants"

# Call the actual script with proper quoting
exec bash -l -c "\"$EXPO_CONSTANTS_DIR/scripts/get-app-config-ios.sh\""
