#!/bin/sh
# Assembles the single-file Scripter scripts from the shared glide engine.
# Scripter needs one self-contained script, so the engine is inlined.
cd "$(dirname "$0")"
cat _808-head.part.js _glide-engine.part.js _808-tail.part.js > WOMP-808-Glide.js
cat _whistle-head.part.js _glide-engine.part.js _whistle-tail.part.js > WOMP-Whistle.js
echo "Built WOMP-808-Glide.js and WOMP-Whistle.js"
