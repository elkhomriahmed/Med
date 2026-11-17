#!/usr/bin/env bash
# Master the rendered video's audio to -14 LUFS (STYLE_BIBLE S1). Usage: bash timeline/finish.sh IN.mp4 OUT.mp4
set -e
ffmpeg -y -loglevel error -i "$1" -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=7" -ar 48000 -c:a aac -b:a 192k "$2"
ffmpeg -hide_banner -i "$2" -af ebur128=framelog=quiet -f null - 2>&1 | grep -E "^\s+I:" | head -1
