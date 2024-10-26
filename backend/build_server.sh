#!/bin/bash
# build_server.sh

# Clean previous builds
rm -rf build dist

# Build with PyInstaller using spec file
pyinstaller server.spec

# Sign the binary and its dependencies
IDENTITY="Developer ID Application: Zach Rizzo (PY886R2W36)"

# Sign all dylibs
find dist/server -name "*.dylib" -exec codesign --force --sign "$IDENTITY" --entitlements entitlements.plist --options runtime {} \;

# Sign the main executable
codesign --force --sign "$IDENTITY" --entitlements entitlements.plist --options runtime dist/server

# Set permissions
chmod 755 dist/server
