#!/bin/bash

# Tandem Icon Converter
# Converts icon.png to .icns (macOS) and .ico (Windows)

ASSETS_DIR="$(cd "$(dirname "$0")/assets" && pwd)"
SOURCE_PNG="$ASSETS_DIR/icon.png"

echo "🎨 Tandem Icon Converter"
echo "========================"
echo ""

# Check if source PNG exists
if [ ! -f "$SOURCE_PNG" ]; then
    echo "❌ Error: icon.png not found!"
    echo "Please save your 1024x1024 PNG icon to:"
    echo "$ASSETS_DIR/icon.png"
    echo ""
    echo "You can download the icon from Claude and save it there."
    exit 1
fi

echo "✅ Found icon.png"

# Check ImageMagick
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick installed"
    HAS_IMAGEMAGICK=true
else
    echo "⚠️  ImageMagick not installed"
    HAS_IMAGEMAGICK=false
fi

# Convert to ICO (Windows)
if [ "$HAS_IMAGEMAGICK" = true ]; then
    echo ""
    echo "🪟 Converting to Windows .ico..."
    convert "$SOURCE_PNG" -define icon:auto-resize=256,128,64,48,32,16 "$ASSETS_DIR/icon.ico"

    if [ -f "$ASSETS_DIR/icon.ico" ]; then
        echo "✅ Created icon.ico"
    else
        echo "❌ Failed to create icon.ico"
    fi
else
    echo ""
    echo "📝 To create icon.ico:"
    echo "1. Install ImageMagick: brew install imagemagick"
    echo "2. Or use online converter: https://convertio.co/png-ico/"
fi

# Convert to ICNS (macOS)
echo ""
echo "🍎 Converting to macOS .icns..."

# Create iconset directory
ICONSET="$ASSETS_DIR/icon.iconset"
mkdir -p "$ICONSET"

# Generate all required sizes using sips (built-in macOS tool)
sips -z 16 16     "$SOURCE_PNG" --out "$ICONSET/icon_16x16.png" &> /dev/null
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET/icon_16x16@2x.png" &> /dev/null
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET/icon_32x32.png" &> /dev/null
sips -z 64 64     "$SOURCE_PNG" --out "$ICONSET/icon_32x32@2x.png" &> /dev/null
sips -z 128 128   "$SOURCE_PNG" --out "$ICONSET/icon_128x128.png" &> /dev/null
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET/icon_128x128@2x.png" &> /dev/null
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET/icon_256x256.png" &> /dev/null
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET/icon_256x256@2x.png" &> /dev/null
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET/icon_512x512.png" &> /dev/null
sips -z 1024 1024 "$SOURCE_PNG" --out "$ICONSET/icon_512x512@2x.png" &> /dev/null

# Convert iconset to icns
iconutil -c icns "$ICONSET" -o "$ASSETS_DIR/icon.icns"

if [ -f "$ASSETS_DIR/icon.icns" ]; then
    echo "✅ Created icon.icns"
    # Clean up iconset directory
    rm -rf "$ICONSET"
else
    echo "❌ Failed to create icon.icns"
    echo "📝 Alternative: Use online converter https://cloudconvert.com/png-to-icns"
fi

echo ""
echo "🎉 Icon conversion complete!"
echo ""
echo "Created files:"
ls -lh "$ASSETS_DIR"/*.icns "$ASSETS_DIR"/*.ico 2>/dev/null || echo "  (Check errors above)"
echo ""
echo "Next steps:"
echo "1. Rebuild the app: cd .. && npm run dist:mac"
echo "2. Check the icon in the .dmg file!"
