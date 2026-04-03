#!/bin/zsh

SRC="src"
OUT="output"
THEME="200"
WATCH=""

[[ "$1" == "-w" ]] && WATCH="--watch"

mkdir -p "$OUT"
for f in "$SRC"/*.d2; do
  d2 $WATCH --theme=$THEME "$f" "$OUT/${f:t:r}.png" &
done

wait
