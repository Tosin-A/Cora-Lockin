# iOS Build Fix - EXConstants Script Error

## Problem
Build was failing with:
```
PhaseScriptExecution [CP-User] Generate app.config for prebuilt Constants.manifest
```

**Root Cause:** The wrapper script in DerivedData doesn't properly quote paths with spaces. When the project path contains spaces (for example, the former "Personal Coding Projects" folder before it was renamed to "Projects"), the script fails because bash splits the path incorrectly.

## Solution Applied

### 1. Fixed the Generated Script
The wrapper script at:
```
~/Library/Developer/Xcode/DerivedData/.../EXConstants.build/Script-46EB2E0001F4D0.sh
```

Has been patched to properly handle paths with spaces:
```bash
# Before (broken):
bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"

# After (fixed):
#!/bin/sh
SCRIPT_PATH="$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"
bash -l "$SCRIPT_PATH"
exit $?
```

The fix avoids using `bash -c` with quoted strings (which doesn't work with spaces), and instead assigns the path to a variable first, then executes it directly. Note: We don't use `exec` here because it can cause issues with paths containing spaces when invoked by Xcode's build system.

### 2. Created Fix Script
A script `fix_exconstants_script.sh` has been created to automatically patch the script if it gets regenerated.

## How to Use

### Option 1: Run Fix Script Before Building
```bash
cd coresense/ios
./fix_exconstants_script.sh
npx expo run:ios --device
```

### Option 2: Build Directly (if script already fixed)
```bash
cd coresense
npx expo run:ios --device
```

### Option 3: Clean Build (if issues persist)
```bash
cd coresense/ios
# Clean DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/CoreSense-*

# Reinstall pods
pod install

# Fix script (will run automatically on next build, but you can run it manually)
./fix_exconstants_script.sh

# Build
cd ..
npx expo run:ios --device
```

## Note
If you clean DerivedData, the script will be regenerated and you'll need to run `fix_exconstants_script.sh` again before building. The script automatically detects if it's already fixed.

## Verification
After building, check that:
1. ✅ Build completes without EXConstants script errors
2. ✅ App installs on device
3. ✅ App runs successfully

## Troubleshooting
If the build still fails:
1. Run `./fix_exconstants_script.sh` manually
2. Check the script path: `find ~/Library/Developer/Xcode/DerivedData -name "Script-46EB2E0001F4D0.sh" -path "*/EXConstants.build/*"`
3. Verify the script contains the quoted path: `grep "bash -l -c" <script_path>`
