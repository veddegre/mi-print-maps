# MI Print Maps

Self-hosted **Printable Map Studio** for designing beautiful, print-ready map posters of Michigan places, parks, trails, campuses, and road trips.

![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4)
![MapLibre](https://img.shields.io/badge/MapLibre-GL%20JS-4264FB)

## Features

- **Interactive editor** — MapLibre GL JS with location search, bounding-box draw, and Michigan presets
- **Print settings** — Paper sizes (8×10, 11×14, 16×20, 24×36), DPI (150/300/600), six map styles
- **Poster overlays** — Title, subtitle, scale bar, north arrow, coordinates, grid lines
- **GPX routes** — Upload a GPX file to overlay trails and road trips
- **Photo inset** — Add your own image with size and placement controls
- **Export** — PNG, PDF, and SVG at full print resolution; batch export all sizes

No database required — design and export entirely in the browser.

## Michigan Presets

Built-in starting points include Sleeping Bear Dunes, Porcupine Mountains, Tahquamenon Falls, Mackinac Island, Detroit, Ann Arbor, Traverse City, U-M and MSU campuses, Lake Michigan shoreline, and the Upper Peninsula.

## Quick Start (Docker)

### 1. Build Michigan tiles (one-time)

Generates a ~1–2 GB OpenMapTiles MBTiles file from the Geofabrik Michigan extract. Requires Docker and ~6 GB RAM for Planetiler.

```bash
./scripts/setup-michigan-tiles.sh
```

This downloads `michigan-latest.osm.pbf` (~292 MB) and runs [Planetiler](https://github.com/onthegomap/planetiler) to produce `data/tiles/michigan.mbtiles`. The script is safe to re-run — it skips work if the MBTiles file already exists.

**Alternative:** place your own OpenMapTiles-compatible `michigan.mbtiles` in `data/tiles/` (e.g. from [MapTiler](https://data.maptiler.com/downloads/)).

### 2. Start the stack

```bash
cp .env.example .env
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| App | http://localhost:8080 |
| TileServer GL | http://localhost:8090 |

The app serves MapLibre styles that point at your local TileServer GL instance. Label fonts come from the OpenFreeMap CDN (glyphs only — no map tiles are fetched from third parties).

### Skip self-hosting (development only)

To use the public OpenFreeMap CDN instead of local tiles, set in `.env`:

```env
TILE_URL=https://tiles.openfreemap.org/planet
```

Then run only the app container: `docker compose up -d app`.

## Local Development (without Docker)

Requirements: PHP 8.2+ and a running tile server on port 8090.

```bash
cp .env.example .env
./scripts/setup-michigan-tiles.sh   # if you haven't already
docker compose up -d tileserver     # tiles only
cd public && php -S localhost:8080
```

## Tile Server

**Do not bulk-download tiles from public OpenStreetMap raster servers.**

This project includes [TileServer GL](https://github.com/maptiler/tileserver-gl) in `docker-compose.yml`, configured via `data/tiles/config.json` to serve `michigan.mbtiles`.

| File | Purpose |
|------|---------|
| `data/tiles/config.json` | TileServer GL config |
| `data/tiles/michigan.mbtiles` | Generated tiles (not committed) |
| `scripts/setup-michigan-tiles.sh` | Download OSM + build MBTiles |

Tile URL template (browser-accessible):

```env
TILE_URL=http://localhost:8090/data/michigan/{z}/{x}/{y}.pbf
GLYPHS_URL=https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf
```

For production on a remote host, set `TILE_URL` to your public tileserver URL.

## Map Styles

| Style | Description |
|-------|-------------|
| Minimalist | Clean light palette, ideal for modern wall art |
| Topographic | Warm earth tones with contour emphasis |
| Dark | Deep navy, great for city maps |
| Vintage | Sepia cartographic feel |
| Blueprint | Technical drawing aesthetic |
| Black & White | High-contrast monochrome |

Styles are generated server-side in `src/Services/StyleService.php`. Self-hosted tiles use a simplified OpenMapTiles layer stack; CDN mode uses full OpenFreeMap base styles.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | App config, paper sizes, DPIs, styles |
| GET | `/api/presets` | Michigan location presets |
| GET | `/api/styles/{style}` | MapLibre style JSON |

## Project Structure

```
├── public/           Web root (index.php, assets)
├── src/              PHP application (PSR-4)
│   ├── Controllers/
│   └── Services/
├── templates/        PHP view templates
├── data/tiles/       Michigan MBTiles + TileServer config
├── scripts/          Tile setup scripts
└── docker-compose.yml
```

## Export Notes

Exports render the full poster frame (map + overlays) at the selected DPI using high-resolution canvas capture. At 600 DPI on 24×36, output is 14,400 × 21,600 pixels — ensure adequate RAM and patience. For very large exports, 300 DPI is recommended.

## License

MIT — Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
