#!/usr/bin/env sh
# Extrae del vídeo original las poses de la cabeza, ordenadas de
# "mirando a la izquierda" a "mirando a la derecha" y sin parpadeos,
# y las guarda como WebP para que portfolio.js las pinte en un canvas.
#
# Uso (desde la raíz del repo, con ffmpeg instalado):
#   sh scripts/build-gaze-frames.sh
#
# Si cambias el vídeo, ajusta FRAMES (números de fotograma del origen) y
# los ángulos de GAZE_POSES en assets/portfolio.js, en el mismo orden.
set -eu

SRC="assets/video/hero-scrub.mp4"
OUT="assets/gaze"
FRAMES="56 44 41 39 37 36 35 34 85 24 0"

mkdir -p "$OUT"
rm -f "$OUT"/*.webp
i=0
for n in $FRAMES; do
  name=$(printf '%02d' "$i")
  ffmpeg -v error -y -i "$SRC" -vf "select='eq(n\,$n)'" -frames:v 1 \
    -c:v libwebp -quality 82 -compression_level 6 "$OUT/$name.webp"
  i=$((i + 1))
done
ls -l "$OUT"
