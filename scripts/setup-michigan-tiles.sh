#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TILES_DIR="$ROOT/data/tiles"
PBF="$TILES_DIR/michigan-latest.osm.pbf"
MBTILES="$TILES_DIR/michigan.mbtiles"
GEOFABRIK_URL="https://download.geofabrik.de/north-america/us/michigan-latest.osm.pbf"

mkdir -p "$TILES_DIR"

if [[ -f "$MBTILES" ]]; then
  echo "Michigan tiles already exist: $MBTILES"
  ls -lh "$MBTILES"
  exit 0
fi

echo "==> Downloading Michigan OSM extract (~292 MB) from Geofabrik..."
if [[ ! -f "$PBF" ]]; then
  curl -L --fail --progress-bar -o "$PBF" "$GEOFABRIK_URL"
else
  echo "    Using cached $PBF"
fi

echo "==> Building OpenMapTiles MBTiles with Planetiler (expect ~1–2 GB output, 15–45 min)..."
docker run --rm \
  -e JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:--Xmx6g}" \
  -v "$TILES_DIR:/data" \
  ghcr.io/onthegomap/planetiler:latest \
  --osm-path=/data/michigan-latest.osm.pbf \
  --output=/data/michigan.mbtiles \
  --force

echo "==> Done."
ls -lh "$MBTILES"
echo
echo "Start the stack: docker compose up -d --build"
echo "TileServer GL:   http://localhost:8090"
echo "App:             http://localhost:8080"
