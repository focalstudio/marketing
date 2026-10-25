#!/bin/sh
# Encode the Blender frames: composite the shared rabbit silhouette (fading in from 2.4 s, sliding like the other two) and
# seeded temporal noise for the grain, with the codec settings of video/canvas/render.mjs. Silent.
# Usage: encode.sh FRAMES_DIR RABBIT_PNG OUT_MP4
set -eu
frames=$1 rabbit=$2 out=$3
ffmpeg -v error -y -framerate 30 -i "$frames/%04d.png" -loop 1 -framerate 30 -i "$rabbit" -filter_complex \
  "[1]format=rgba,fade=t=in:st=2.4:d=0.5:alpha=1[r];[0][r]overlay=x='80*pow(1-clip((t-2.4)/0.5,0,1),3)':y=0:shortest=1,noise=alls=22:allf=t:all_seed=5,format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -movflags +faststart "$out"
