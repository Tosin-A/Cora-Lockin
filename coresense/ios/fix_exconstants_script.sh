#!/bin/bash

# Fix EXConstants script wrapper to properly quote paths with spaces
# This script patches the generated wrapper script in DerivedData

SCRIPT_PATH="$1"

if [ -z "$SCRIPT_PATH" ]; then
    # Try to find the script in DerivedData
    SCRIPT_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "Script-46EB2E0001F4D0.sh" -path "*/EXConstants.build/*" 2>/dev/null | head -1)
fi

if [ -z "$SCRIPT_PATH" ] || [ ! -f "$SCRIPT_PATH" ]; then
    echo "⚠️  EXConstants script not found. It will be created on next build."
    exit 0
fi

# Check if already fixed (look for the new pattern)
if grep -q 'SCRIPT_PATH="\$PODS_TARGET_SRCROOT' "$SCRIPT_PATH" 2>/dev/null; then
    echo "✅ EXConstants script already fixed."
    exit 0
fi

# Fix the script by properly quoting the path
# Replace the bash -c approach with direct script execution (without exec)
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" << 'EOF'
#!/bin/sh
SCRIPT_PATH="$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"
bash -l "$SCRIPT_PATH"
exit $?
EOF
mv "$TEMP_FILE" "$SCRIPT_PATH"
chmod +x "$SCRIPT_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Fixed EXConstants script wrapper for paths with spaces."
    echo "   Patched: $SCRIPT_PATH"
else
    echo "❌ Failed to fix EXConstants script."
    exit 1
fi
