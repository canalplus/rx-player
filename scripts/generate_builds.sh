#!/bin/bash
set -e

echo "cleaning previous builds..."
./scripts/clean-up-builds.sh

echo "bundling modular version..."
npm run build:modules
rm -rf dist/_esm5.raw/export.ts

echo "preparing minimal build..."
cp -r dist/_esm5.raw/ dist/_esm5.minimal

# TODO So ugly right now. Whe should find a way to transform the JS in a cleaner
# way
files="$(find dist/_esm5.minimal -type f -iname '*.js')"
for f in "$files"; do
  sed -i -E "s/\b__DEV__\b/false/g" $f
  sed -i -E "s/\b__LOGGER_LEVEL__\b/\"NONE\"/g" $f
  sed -i -E "s/\b__FEATURES__\.EME\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.SMOOTH\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.DASH\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.DIRECTFILE\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_SAMI\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_SRT\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_TTML\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_VTT\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_SAMI\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_SRT\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_TTML\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_VTT\b/false/g" $f
  sed -i -E "s/\b__FEATURES__\.BIF_PARSER\b/false/g" $f
done

# ugliest of them all
sed -i -E "s/require\(\"(.*)\.ts\"\)/require(\"\1.js\"\)/g" dist/_esm5.minimal/features/index.js

rm -rf minimal
mkdir minimal
ln -s ../dist/_esm5.minimal/extandable.js minimal/index.js

rm -rf features
mkdir features
ln -s ../dist/_esm5.minimal/features/list/index.js features/index.js

echo "done"

echo "preparing regular build..."
cp -r dist/_esm5.raw/ dist/_esm5.regular

files="$(find dist/_esm5.regular -type f -iname '*.js')"
for f in "$files"; do
  sed -i -E "s/\b__DEV__\b/false/g" $f
  sed -i -E "s/\b__LOGGER_LEVEL__\b/\"NONE\"/g" $f
  sed -i -E "s/\b__FEATURES__\.EME\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.SMOOTH\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.DASH\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.DIRECTFILE\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_SAMI\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_SRT\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_TTML\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.HTML_VTT\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_SAMI\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_SRT\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_TTML\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.NATIVE_VTT\b/true/g" $f
  sed -i -E "s/\b__FEATURES__\.BIF_PARSER\b/true/g" $f
done

# ugliest of them all
sed -i -E "s/require\(\"(.*)\.ts\"\)/require(\"\1.js\"\)/g" dist/_esm5.regular/features/index.js

echo "done"

echo "cleaning up..."
rm -rf ./dist/_esm5.raw
echo "done"

# echo ""
# REPLY=""
# read -p "do you want to continue [y/n] ? " -n 1 -r
# echo ""

# if [[ ! $REPLY =~ ^[Yy](es)?$ ]]; then
#   exit 1;
# fi
