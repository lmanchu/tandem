#!/bin/bash

# Convert SVG to various icon formats for Electron
cd "$(dirname "$0")"

# Create PNG at 1024x1024 (base for all conversions)
convert -background none icon.svg -resize 1024x1024 icon.png
echo "Created icon.png (1024x1024)"

# Create iconset for macOS .icns
mkdir -p icon.iconset
for size in 16 32 64 128 256 512; do
  convert -background none icon.svg -resize ${size}x${size} icon.iconset/icon_${size}x${size}.png
  double=$((size * 2))
  convert -background none icon.svg -resize ${double}x${double} icon.iconset/icon_${size}x${size}@2x.png
done
echo "Created iconset PNGs"

# Create .icns file
iconutil -c icns icon.iconset -o icon.icns
echo "Created icon.icns"

# Create .ico for Windows (multiple sizes)
convert -background none icon.svg -resize 256x256 \
  \( -clone 0 -resize 16x16 \) \
  \( -clone 0 -resize 32x32 \) \
  \( -clone 0 -resize 48x48 \) \
  \( -clone 0 -resize 64x64 \) \
  \( -clone 0 -resize 128x128 \) \
  \( -clone 0 -resize 256x256 \) \
  -delete 0 icon.ico
echo "Created icon.ico"

# Cleanup iconset folder
rm -rf icon.iconset

echo "Done! Created: icon.png, icon.icns, icon.ico"
ls -la icon.*
