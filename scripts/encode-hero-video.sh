#!/usr/bin/env bash
# Re-encode a source video into the hero multi-codec stack.
#
# Usage:
#   ./scripts/encode-hero-video.sh path/to/source.mp4
#
# Produces, next to the source, with the source's base name:
#   <base>.av1.webm        desktop AV1 WebM   (SVT-AV1, CRF 35, 1080p, 30fps)
#   <base>.vp9.webm        desktop VP9 WebM   (CRF 33,  1080p, 30fps)
#   <base>.desktop.mp4     desktop H.264 MP4  (CRF 24,  1080p, 30fps, +faststart)
#   <base>.mobile.mp4      mobile  H.264 MP4  (CRF 26,   720p, 30fps, +faststart)
#   <base>.poster.webp     WebP still from 1.5s
#
# Upload each output through the admin hero manager:
#   - .desktop.mp4 goes into the base slide (blob_url) via the normal hero upload
#   - .av1.webm    -> Variants panel, "AV1 WebM"
#   - .vp9.webm    -> Variants panel, "VP9 WebM"
#   - .mobile.mp4  -> Variants panel, "Mobile MP4"
#   - .poster.webp -> Variants panel, "Poster"
#
# Requires ffmpeg built with libsvtav1, libvpx-vp9, libx264, libwebp.
# On Windows, the gyan.dev "full" build has all of these.
#
# Tune CRF per clip if file sizes miss the targets (1-3 MB desktop, <1 MB mobile).
# Higher CRF = smaller file + lower quality. Each +2 roughly halves size.

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <source-video>" >&2
  exit 2
fi

SRC="$1"
if [ ! -f "$SRC" ]; then
  echo "Source not found: $SRC" >&2
  exit 1
fi

BASE="${SRC%.*}"

# Strip metadata and audio from every output; cap to 30fps; don't upscale.
# `scale='min(W,iw)':-2` keeps aspect ratio and caps the long side at W.
SCALE_1080="scale='min(1920,iw)':-2,fps=30"
SCALE_720="scale='min(1280,iw)':-2,fps=30"
STRIP="-map_metadata -1 -an"
FAST="-movflags +faststart"

echo "[1/5] AV1 WebM (desktop, SVT-AV1 CRF 35)"
ffmpeg -y -hide_banner -loglevel error -stats -i "$SRC" \
  -c:v libsvtav1 -crf 35 -preset 6 -pix_fmt yuv420p10le \
  -vf "$SCALE_1080" $STRIP "$BASE.av1.webm"

echo "[2/5] VP9 WebM (desktop, CRF 33)"
ffmpeg -y -hide_banner -loglevel error -stats -i "$SRC" \
  -c:v libvpx-vp9 -crf 33 -b:v 0 -row-mt 1 -pix_fmt yuv420p \
  -vf "$SCALE_1080" $STRIP "$BASE.vp9.webm"

echo "[3/5] H.264 MP4 (desktop, CRF 24)"
ffmpeg -y -hide_banner -loglevel error -stats -i "$SRC" \
  -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p \
  -vf "$SCALE_1080" $STRIP $FAST "$BASE.desktop.mp4"

echo "[4/5] H.264 MP4 (mobile 720p, CRF 26)"
ffmpeg -y -hide_banner -loglevel error -stats -i "$SRC" \
  -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p \
  -vf "$SCALE_720" $STRIP $FAST "$BASE.mobile.mp4"

echo "[5/5] WebP poster (1.5s)"
ffmpeg -y -hide_banner -loglevel error -ss 1.5 -i "$SRC" -vframes 1 \
  -vf "scale='min(1920,iw)':-2" -q:v 80 "$BASE.poster.webp"

echo
echo "Outputs:"
ls -lh "$BASE".av1.webm "$BASE".vp9.webm "$BASE".desktop.mp4 "$BASE".mobile.mp4 "$BASE".poster.webp
