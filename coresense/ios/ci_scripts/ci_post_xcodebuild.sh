#!/bin/sh

# Diagnostic script: logs archive signing info to help debug export failures
set -x

echo "=== Archive Diagnostics ==="

ARCHIVE_PATH="/Volumes/workspace/build.xcarchive"

if [ -d "$ARCHIVE_PATH" ]; then
    echo "--- Archive contents ---"
    ls -la "$ARCHIVE_PATH/Products/Applications/" 2>/dev/null

    APP_PATH=$(find "$ARCHIVE_PATH/Products/Applications" -name "*.app" -maxdepth 1 | head -1)

    if [ -n "$APP_PATH" ]; then
        echo "--- Embedded entitlements ---"
        codesign -d --entitlements - "$APP_PATH" 2>&1 || true

        echo "--- Embedded provisioning profile ---"
        if [ -f "$APP_PATH/embedded.mobileprovision" ]; then
            security cms -D -i "$APP_PATH/embedded.mobileprovision" 2>/dev/null | head -80
        else
            echo "No embedded.mobileprovision found (expected for CODE_SIGN_IDENTITY=-)"
        fi

        echo "--- Info.plist version ---"
        /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$APP_PATH/Info.plist" 2>/dev/null || true
        /usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$APP_PATH/Info.plist" 2>/dev/null || true

        echo "--- Code signing info ---"
        codesign -dvvv "$APP_PATH" 2>&1 || true
    fi
else
    echo "Archive not found at $ARCHIVE_PATH"
fi

# Check for export logs from previous attempts
echo "--- Export archive logs ---"
for logdir in /Volumes/workspace/tmp/*-export-archive-logs; do
    if [ -d "$logdir" ]; then
        echo "Logs in $logdir:"
        find "$logdir" -name "*.log" -exec echo "=== {} ===" \; -exec cat {} \; 2>/dev/null | tail -100
    fi
done

echo "=== Diagnostics complete ==="
