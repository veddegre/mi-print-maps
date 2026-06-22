(function () {
    'use strict';

    const PAPER_SIZES = {
        '8x10':  { w: 8,  h: 10 },
        '11x14': { w: 11, h: 14 },
        '16x20': { w: 16, h: 20 },
        '24x36': { w: 24, h: 36 },
    };

    const PREVIEW_MAX_WIDTH = 720;

    let config = {};
    let map = null;
    let presets = [];
    const INSET_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
    const DEFAULT_INSET = { size: 22, position: 'top-left' };

    let insetSettings = { ...DEFAULT_INSET };
    let gpxLayerAdded = false;
    let lastDrawnBounds = null;
    let michiganBounds = [-91.3, 41.55, -81.85, 48.45];
    let suppressZoomSync = false;
    let searchTimeout = null;

    const els = {
        paperSize: document.getElementById('paper-size'),
        dpi: document.getElementById('dpi'),
        styleSelect: document.getElementById('style-select'),
        titleInput: document.getElementById('title-input'),
        subtitleInput: document.getElementById('subtitle-input'),
        showScale: document.getElementById('show-scale'),
        showNorth: document.getElementById('show-north'),
        showCoords: document.getElementById('show-coords'),
        showGrid: document.getElementById('show-grid'),
        overlayTitle: document.getElementById('overlay-title'),
        overlaySubtitle: document.getElementById('overlay-subtitle'),
        overlayScale: document.getElementById('overlay-scale'),
        overlayNorth: document.getElementById('overlay-north'),
        overlayCoords: document.getElementById('overlay-coords'),
        overlayGrid: document.getElementById('overlay-grid'),
        posterOverlays: document.getElementById('poster-overlays'),
        posterFrame: document.getElementById('poster-frame'),
        posterInner: document.getElementById('poster-inner'),
        editorCanvas: document.getElementById('editor-canvas'),
        showTransit: document.getElementById('show-transit'),
        showPoi: document.getElementById('show-poi'),
        showShields: document.getElementById('show-shields'),
        showPaths: document.getElementById('show-paths'),
        showMinorLabels: document.getElementById('show-minor-labels'),
        exportDimensions: document.getElementById('export-dimensions'),
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('search-results'),
        presetSelect: document.getElementById('preset-select'),
        drawBoundsBtn: document.getElementById('draw-bounds-btn'),
        zoomSlider: document.getElementById('zoom-slider'),
        zoomValue: document.getElementById('zoom-value'),
        zoomIn: document.getElementById('zoom-in'),
        zoomOut: document.getElementById('zoom-out'),
        zoomFineIn: document.getElementById('zoom-fine-in'),
        zoomFineOut: document.getElementById('zoom-fine-out'),
        panNorth: document.getElementById('pan-north'),
        panSouth: document.getElementById('pan-south'),
        panWest: document.getElementById('pan-west'),
        panEast: document.getElementById('pan-east'),
        fitMichigan: document.getElementById('fit-michigan'),
        fitDrawn: document.getElementById('fit-drawn'),
        resetBearing: document.getElementById('reset-bearing'),
        exportPng: document.getElementById('export-png'),
        exportPdf: document.getElementById('export-pdf'),
        exportSvg: document.getElementById('export-svg'),
        batchExport: document.getElementById('batch-export'),
        gpxInput: document.getElementById('gpx-input'),
        insetInput: document.getElementById('inset-input'),
        insetControls: document.getElementById('inset-controls'),
        insetSize: document.getElementById('inset-size'),
        insetSizeVal: document.getElementById('inset-size-val'),
        insetPosition: document.getElementById('inset-position'),
        removeInsetBtn: document.getElementById('remove-inset'),
        overlayInset: document.getElementById('overlay-inset'),
        insetPreview: document.getElementById('inset-preview'),
        status: document.getElementById('editor-status'),
    };

    async function init() {
        const res = await fetch('/api/config');
        config = await res.json();
        if (config.michiganBounds) michiganBounds = config.michiganBounds;

        const presetRes = await fetch('/api/presets');
        const presetData = await presetRes.json();
        presets = presetData.locations || [];
        populatePresets();

        resizePosterFrame();
        await initMap(config.defaultCenter);

        bindEvents();
        updateOverlays();

        window.addEventListener('resize', resizePosterFrame);
        if (window.ResizeObserver && els.editorCanvas) {
            new ResizeObserver(resizePosterFrame).observe(els.editorCanvas);
        }

        const urlPreset = new URLSearchParams(location.search).get('preset');
        if (urlPreset) {
            await applyPreset(urlPreset);
        } else {
            fitGeographicBounds(michiganBounds);
        }
    }

    function populatePresets() {
        const groups = {};
        presets.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });

        Object.entries(groups).forEach(([cat, items]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = cat.charAt(0).toUpperCase() + cat.slice(1);
            items.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                optgroup.appendChild(opt);
            });
            els.presetSelect.appendChild(optgroup);
        });
    }

    function resizePosterFrame() {
        const paper = PAPER_SIZES[els.paperSize.value];
        const aspect = paper.w / paper.h;

        const canvas = els.editorCanvas || els.posterFrame.parentElement;
        const pad = 32;
        const maxW = Math.max(260, (canvas?.clientWidth || PREVIEW_MAX_WIDTH) - pad);
        const maxH = Math.max(260, (canvas?.clientHeight || 800) - pad);

        let width, height;
        if (maxW / maxH > aspect) {
            height = maxH;
            width = Math.round(height * aspect);
        } else {
            width = Math.min(maxW, PREVIEW_MAX_WIDTH);
            height = Math.round(width / aspect);
        }

        els.posterFrame.style.width = width + 'px';
        els.posterFrame.style.height = height + 'px';
        els.posterInner.style.width = width + 'px';
        els.posterInner.style.height = height + 'px';

        const dpi = parseInt(els.dpi.value, 10);
        const exportW = paper.w * dpi;
        const exportH = paper.h * dpi;
        els.exportDimensions.textContent = `Export: ${exportW.toLocaleString()} × ${exportH.toLocaleString()} px`;

        if (map) {
            map.resize();
            if (!suppressZoomSync) syncZoomUi();
        }
    }

    function getPosterPadding() {
        const h = els.posterInner?.offsetHeight || 640;
        return {
            top: 20,
            bottom: Math.round(h * 0.15) + 20,
            left: 20,
            right: 20,
        };
    }

    function getPosterAspect() {
        const paper = PAPER_SIZES[els.paperSize.value];
        return paper.w / paper.h;
    }

    /** Expand geographic bounds so nothing is clipped when fitted to poster aspect ratio. */
    function expandBoundsForPoster(bounds, margin = 0.03) {
        let [west, south, east, north] = bounds;
        let lngSpan = east - west;
        let latSpan = north - south;
        const centerLat = (south + north) / 2;
        const latCos = Math.cos(centerLat * Math.PI / 180);
        const posterAspect = getPosterAspect();
        const geoAspect = (lngSpan * latCos) / latSpan;

        if (geoAspect > posterAspect) {
            const neededLat = (lngSpan * latCos) / posterAspect;
            const extra = (neededLat - latSpan) / 2;
            south -= extra;
            north += extra;
            latSpan = neededLat;
        } else {
            const neededLng = (latSpan * posterAspect) / latCos;
            const extra = (neededLng - lngSpan) / 2;
            west -= extra;
            east += extra;
            lngSpan = neededLng;
        }

        const lngPad = lngSpan * margin;
        const latPad = latSpan * margin;
        return [west - lngPad, south - latPad, east + lngPad, north + latPad];
    }

    function fitGeographicBounds(bounds, animate = true) {
        if (!map) return;
        const expanded = expandBoundsForPoster(bounds);
        map.fitBounds(
            [[expanded[0], expanded[1]], [expanded[2], expanded[3]]],
            {
                padding: getPosterPadding(),
                duration: animate ? 900 : 0,
                maxZoom: 12,
            }
        );
    }

    /** Tight fit to an exact drawn area — no aspect-ratio expansion. */
    function fitDrawnBounds(bounds, animate = true) {
        if (!map) return;
        const [west, south, east, north] = bounds;
        const lngSpan = east - west;
        const latSpan = north - south;

        if (lngSpan < 0.0001 || latSpan < 0.0001) {
            showStatus('Draw a larger box');
            return;
        }

        const lngPad = lngSpan * 0.02;
        const latPad = latSpan * 0.02;

        map.fitBounds(
            [[west - lngPad, south - latPad], [east + lngPad, north + latPad]],
            {
                padding: getPosterPadding(),
                duration: animate ? 900 : 0,
                maxZoom: 18,
            }
        );
    }

    function syncZoomUi() {
        if (!map) return;
        const z = map.getZoom();
        els.zoomSlider.value = z;
        els.zoomValue.textContent = z.toFixed(2);
    }

    function setMapZoom(zoom, animate = false) {
        if (!map) return;
        suppressZoomSync = true;
        map.zoomTo(zoom, { duration: animate ? 200 : 0 });
        syncZoomUi();
        suppressZoomSync = false;
        updateOverlays();
    }

    function nudgeZoom(delta) {
        setMapZoom(map.getZoom() + delta, true);
    }

    function panMap(direction) {
        if (!map) return;
        const offset = Math.min(els.posterInner.offsetWidth, els.posterInner.offsetHeight) * 0.12;
        const offsets = {
            north: [0, -offset],
            south: [0, offset],
            east: [offset, 0],
            west: [-offset, 0],
        };
        map.panBy(offsets[direction], { duration: 250 });
    }

    function getMapContentSettings() {
        return {
            transit: els.showTransit.checked,
            poi: els.showPoi.checked,
            shields: els.showShields.checked,
            paths: els.showPaths.checked,
            minor_labels: els.showMinorLabels.checked,
        };
    }

    function applyMapContentSettings(settings) {
        if (!settings) return;
        els.showTransit.checked = !!settings.transit;
        els.showPoi.checked = !!settings.poi;
        els.showShields.checked = !!settings.shields;
        els.showPaths.checked = settings.paths !== false;
        els.showMinorLabels.checked = !!settings.minor_labels;
    }

    function getHiddenLayerCategories() {
        const hidden = [];
        const s = getMapContentSettings();
        if (!s.transit) hidden.push('transit');
        if (!s.poi) hidden.push('poi');
        if (!s.shields) hidden.push('shields');
        if (!s.paths) hidden.push('paths');
        if (!s.minor_labels) hidden.push('minor_labels');
        return hidden;
    }

    async function loadStyle(styleName) {
        const hidden = getHiddenLayerCategories();
        const query = hidden.length ? `?hide=${hidden.join(',')}` : '';
        const res = await fetch(`/api/styles/${styleName}${query}`);
        return res.json();
    }

    async function reloadMapStyle() {
        if (!map) return;
        const styleName = els.styleSelect.value;
        const style = await loadStyle(styleName);
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bearing = map.getBearing();
        const pitch = map.getPitch();
        map.setStyle(style);
        updateOverlayTheme();
        map.once('styledata', () => {
            map.jumpTo({ center, zoom, bearing, pitch });
            if (gpxLayerAdded) addGpxSource(window._gpxGeojson);
            updateOverlays();
        });
    }

    const DARK_OVERLAY_STYLES = new Set(['dark', 'blueprint']);

    async function initMap(center) {
        const style = await loadStyle(els.styleSelect.value);

        map = new maplibregl.Map({
            container: 'map',
            style: style,
            center: [center.lng, center.lat],
            zoom: center.zoom || 10,
            preserveDrawingBuffer: true,
            attributionControl: false,
        });

        map.on('load', () => {
            map.resize();
            updateOverlayTheme();
            syncZoomUi();
            updateOverlays();
        });

        map.on('moveend', () => {
            syncZoomUi();
            updateOverlays();
        });

        map.on('zoomend', syncZoomUi);
    }

    function updateOverlayTheme() {
        const isDark = DARK_OVERLAY_STYLES.has(els.styleSelect.value);
        els.posterOverlays.classList.toggle('overlay-theme-dark', isDark);
        els.posterOverlays.classList.toggle('overlay-theme-light', !isDark);
    }

    async function changeStyle(styleName) {
        const style = await loadStyle(styleName);
        map.setStyle(style);
        updateOverlayTheme();
        return new Promise(resolve => {
            map.once('styledata', () => {
                if (gpxLayerAdded) addGpxSource(window._gpxGeojson);
                updateOverlays();
                resolve();
            });
        });
    }

    let boxDrawActive = false;
    let boxStart = null;
    let boxLayerId = 'bounds-box';

    function startBoxDraw() {
        boxDrawActive = true;
        map.getCanvas().style.cursor = 'crosshair';
        showStatus('Click and drag to draw a bounding box');
        map.on('mousedown', onBoxMouseDown);
    }

    function onBoxMouseDown(e) {
        if (!boxDrawActive) return;
        e.preventDefault();
        boxStart = e.lngLat;
        map.on('mousemove', onBoxMouseMove);
        map.once('mouseup', onBoxMouseUp);
    }

    function onBoxMouseMove(e) {
        if (!boxStart) return;
        updateBoxLayer(boxStart, e.lngLat);
    }

    function onBoxMouseUp(e) {
        map.off('mousemove', onBoxMouseMove);
        map.getCanvas().style.cursor = '';
        boxDrawActive = false;
        map.off('mousedown', onBoxMouseDown);

        if (!boxStart) return;
        const sw = {
            lng: Math.min(boxStart.lng, e.lngLat.lng),
            lat: Math.min(boxStart.lat, e.lngLat.lat),
        };
        const ne = {
            lng: Math.max(boxStart.lng, e.lngLat.lng),
            lat: Math.max(boxStart.lat, e.lngLat.lat),
        };
        boxStart = null;

        lastDrawnBounds = [sw.lng, sw.lat, ne.lng, ne.lat];
        fitDrawnBounds(lastDrawnBounds);
    }

    function updateBoxLayer(a, b) {
        const coords = [[
            [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat)],
            [Math.max(a.lng, b.lng), Math.min(a.lat, b.lat)],
            [Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)],
            [Math.min(a.lng, b.lng), Math.max(a.lat, b.lat)],
            [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat)],
        ]];
        const geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } };

        if (map.getSource(boxLayerId)) {
            map.getSource(boxLayerId).setData(geojson);
        } else {
            map.addSource(boxLayerId, { type: 'geojson', data: geojson });
            map.addLayer({
                id: boxLayerId + '-fill',
                type: 'fill',
                source: boxLayerId,
                paint: { 'fill-color': '#3d8bfd', 'fill-opacity': 0.15 },
            });
            map.addLayer({
                id: boxLayerId + '-line',
                type: 'line',
                source: boxLayerId,
                paint: { 'line-color': '#3d8bfd', 'line-width': 2, 'line-dasharray': [3, 2] },
            });
        }
    }

    async function applyPreset(id) {
        const preset = presets.find(p => p.id === id);
        if (!preset) return;

        els.presetSelect.value = id;
        if (preset.title) els.titleInput.value = preset.title;
        if (preset.subtitle) els.subtitleInput.value = preset.subtitle;
        if (preset.style) {
            els.styleSelect.value = preset.style;
            await changeStyle(preset.style);
        }
        updateOverlayTheme();

        if (preset.bounds) {
            lastDrawnBounds = preset.bounds.slice();
            fitGeographicBounds(preset.bounds);
        } else {
            map.flyTo({
                center: [preset.center.lng, preset.center.lat],
                zoom: preset.zoom,
                duration: 1000,
            });
        }
    }

    function bindEvents() {
        els.paperSize.addEventListener('change', resizePosterFrame);
        els.dpi.addEventListener('change', resizePosterFrame);

        els.styleSelect.addEventListener('change', () => {
            changeStyle(els.styleSelect.value);
            updateOverlayTheme();
        });

        els.titleInput.addEventListener('input', updateOverlays);
        els.subtitleInput.addEventListener('input', updateOverlays);
        els.showScale.addEventListener('change', updateOverlays);
        els.showNorth.addEventListener('change', updateOverlays);
        els.showCoords.addEventListener('change', updateOverlays);
        els.showGrid.addEventListener('change', updateOverlays);

        [els.showTransit, els.showPoi, els.showShields, els.showPaths, els.showMinorLabels]
            .forEach(el => el.addEventListener('change', () => reloadMapStyle()));

        els.presetSelect.addEventListener('change', () => {
            if (els.presetSelect.value) applyPreset(els.presetSelect.value);
        });

        els.drawBoundsBtn.addEventListener('click', startBoxDraw);

        els.zoomIn.addEventListener('click', () => nudgeZoom(0.5));
        els.zoomOut.addEventListener('click', () => nudgeZoom(-0.5));
        els.zoomFineIn.addEventListener('click', () => nudgeZoom(0.25));
        els.zoomFineOut.addEventListener('click', () => nudgeZoom(-0.25));
        els.zoomSlider.addEventListener('input', () => setMapZoom(parseFloat(els.zoomSlider.value)));
        els.panNorth.addEventListener('click', () => panMap('north'));
        els.panSouth.addEventListener('click', () => panMap('south'));
        els.panWest.addEventListener('click', () => panMap('west'));
        els.panEast.addEventListener('click', () => panMap('east'));
        els.fitMichigan.addEventListener('click', () => fitGeographicBounds(michiganBounds));
        els.fitDrawn.addEventListener('click', () => {
            if (lastDrawnBounds) {
                fitDrawnBounds(lastDrawnBounds);
            } else {
                showStatus('Draw a bounding box first');
            }
        });
        els.resetBearing.addEventListener('click', () => {
            map.resetNorth({ duration: 400 });
            updateOverlays();
        });

        els.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const q = els.searchInput.value.trim();
            if (q.length < 3) {
                els.searchResults.classList.remove('active');
                return;
            }
            searchTimeout = setTimeout(() => searchLocation(q), 400);
        });

        els.exportPng.addEventListener('click', () => exportPoster('png'));
        els.exportPdf.addEventListener('click', () => exportPoster('pdf'));
        els.exportSvg.addEventListener('click', () => exportPoster('svg'));
        els.batchExport.addEventListener('click', batchExportAll);

        els.gpxInput.addEventListener('change', handleGpxUpload);
        els.insetInput.addEventListener('change', handleInsetUpload);
        els.insetSize.addEventListener('input', () => {
            insetSettings.size = parseInt(els.insetSize.value, 10);
            els.insetSizeVal.textContent = insetSettings.size + '%';
            applyInsetLayout();
        });
        els.insetPosition.addEventListener('change', () => {
            insetSettings.position = els.insetPosition.value;
            applyInsetLayout();
        });
        els.removeInsetBtn.addEventListener('click', removeInset);

        document.addEventListener('click', e => {
            if (!els.searchResults.contains(e.target) && e.target !== els.searchInput) {
                els.searchResults.classList.remove('active');
            }
        });
    }

    async function searchLocation(query) {
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Michigan, USA')}&format=json&limit=5&countrycodes=us`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            const results = await res.json();

            if (!results.length) {
                els.searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
            } else {
                els.searchResults.innerHTML = results.map(r => `
                    <div class="search-result-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${escapeAttr(r.display_name)}">
                        ${escapeHtml(r.display_name)}
                    </div>
                `).join('');

                els.searchResults.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = parseFloat(item.dataset.lat);
                        const lon = parseFloat(item.dataset.lon);
                        map.flyTo({ center: [lon, lat], zoom: 12, duration: 1000 });
                        if (!els.titleInput.value) {
                            els.titleInput.value = item.dataset.name.split(',')[0];
                        }
                        els.searchResults.classList.remove('active');
                        els.searchInput.value = '';
                        updateOverlays();
                    });
                });
            }
            els.searchResults.classList.add('active');
        } catch (e) {
            showStatus('Search failed — check network');
        }
    }

    function updateOverlays() {
        els.overlayTitle.textContent = els.titleInput.value;
        els.overlaySubtitle.textContent = els.subtitleInput.value;

        els.overlayScale.style.display = els.showScale.checked ? 'block' : 'none';
        els.overlayNorth.style.display = els.showNorth.checked ? 'block' : 'none';
        els.overlayCoords.style.display = els.showCoords.checked ? 'block' : 'none';
        els.overlayGrid.classList.toggle('visible', els.showGrid.checked);

        if (els.showScale.checked && map) updateScaleBar();
        if (els.showCoords.checked && map) updateCoords();
        if (els.showGrid.checked && map) drawGrid();
    }

    function updateScaleBar() {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const lat = center.lat;

        const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
        const targetMeters = niceRound(metersPerPixel * 80);

        const barWidthPx = targetMeters / metersPerPixel;
        const label = targetMeters >= 1000
            ? (targetMeters / 1000).toFixed(targetMeters >= 10000 ? 0 : 1) + ' km'
            : Math.round(targetMeters) + ' m';
        els.overlayScale.innerHTML =
            `<div class="scale-bar" style="width:${barWidthPx}px"></div>` +
            `<span class="scale-label">${label}</span>`;
    }

    function niceRound(meters) {
        const pow = Math.pow(10, Math.floor(Math.log10(meters)));
        const n = meters / pow;
        const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
        return nice * pow;
    }

    function updateCoords() {
        const c = map.getCenter();
        const b = map.getBounds();
        els.overlayCoords.innerHTML =
            `${c.lat.toFixed(4)}°N, ${Math.abs(c.lng).toFixed(4)}°W<br>` +
            `${b.getWest().toFixed(3)}° – ${b.getEast().toFixed(3)}°`;
    }

    function drawGrid() {
        const canvas = els.overlayGrid;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = els.posterInner.offsetWidth;
        const h = canvas.height = els.posterInner.offsetHeight;

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;

        const step = 40;
        for (let x = 0; x <= w; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y <= h; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    function handleGpxUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const geojson = gpxToGeoJSON(reader.result);
            window._gpxGeojson = geojson;
            addGpxSource(geojson);
            if (geojson.features.length) {
                const coords = geojson.features[0].geometry.coordinates;
                const lons = coords.map(c => c[0]);
                const lats = coords.map(c => c[1]);
                map.fitBounds([
                    [Math.min(...lons), Math.min(...lats)],
                    [Math.max(...lons), Math.max(...lats)]
                ], { padding: 40 });
            }
            showStatus('GPX route loaded');
        };
        reader.readAsText(file);
    }

    function gpxToGeoJSON(gpxText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(gpxText, 'text/xml');
        const points = [];

        doc.querySelectorAll('trkpt, rtept, wpt').forEach(pt => {
            points.push([
                parseFloat(pt.getAttribute('lon')),
                parseFloat(pt.getAttribute('lat')),
            ]);
        });

        return {
            type: 'FeatureCollection',
            features: points.length ? [{
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: points },
                properties: {},
            }] : [],
        };
    }

    function addGpxSource(geojson) {
        if (!map || !geojson) return;

        if (map.getSource('gpx-route')) {
            map.getSource('gpx-route').setData(geojson);
            return;
        }

        map.addSource('gpx-route', { type: 'geojson', data: geojson });
        map.addLayer({
            id: 'gpx-route-line',
            type: 'line',
            source: 'gpx-route',
            paint: { 'line-color': '#e74c3c', 'line-width': 3, 'line-opacity': 0.9 },
        });
        gpxLayerAdded = true;
    }

    function hasInsetImage() {
        return !!(els.insetPreview?.src && !els.overlayInset.hidden);
    }

    function getInsetSettings() {
        return { size: insetSettings.size, position: insetSettings.position };
    }

    function applyInsetSettings(settings) {
        if (!settings) {
            insetSettings = { ...DEFAULT_INSET };
        } else {
            insetSettings = {
                size: Math.min(45, Math.max(10, parseInt(settings.size, 10) || DEFAULT_INSET.size)),
                position: INSET_POSITIONS.includes(settings.position) ? settings.position : DEFAULT_INSET.position,
            };
        }
        els.insetSize.value = insetSettings.size;
        els.insetSizeVal.textContent = insetSettings.size + '%';
        els.insetPosition.value = insetSettings.position;
        applyInsetLayout();
    }

    function applyInsetLayout() {
        INSET_POSITIONS.forEach(pos => els.overlayInset.classList.remove('pos-' + pos));
        els.overlayInset.classList.add('pos-' + insetSettings.position);
        els.overlayInset.style.width = insetSettings.size + '%';
    }

    function showInsetControls(visible) {
        els.insetControls.hidden = !visible;
    }

    function handleInsetUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            els.insetPreview.src = reader.result;
            els.overlayInset.hidden = false;
            applyInsetSettings(insetSettings);
            showInsetControls(true);
            showStatus('Photo inset added');
        };
        reader.readAsDataURL(file);
    }

    function removeInset(silent = false) {
        els.insetPreview.removeAttribute('src');
        els.overlayInset.hidden = true;
        els.insetInput.value = '';
        insetSettings = { ...DEFAULT_INSET };
        applyInsetSettings(insetSettings);
        showInsetControls(false);
        if (!silent) showStatus('Photo inset removed');
    }

    async function exportPoster(format) {
        showStatus(`Exporting ${format.toUpperCase()}…`);

        const paper = PAPER_SIZES[els.paperSize.value];
        const dpi = parseInt(els.dpi.value, 10);
        const exportW = paper.w * dpi;
        const exportH = paper.h * dpi;
        const scale = exportW / els.posterInner.offsetWidth;

        try {
            await document.fonts.ready;
            map.triggerRepaint();
            await new Promise(r => setTimeout(r, 300));

            const canvas = await html2canvas(els.posterInner, {
                scale: scale,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                ignoreElements: el =>
                    el.classList?.contains('maplibregl-ctrl') ||
                    !!el.closest?.('.maplibregl-ctrl'),
            });

            const filename = sanitizeFilename(els.titleInput.value || 'map-poster');

            if (format === 'png') {
                downloadCanvas(canvas, `${filename}.png`);
            } else if (format === 'pdf') {
                exportPdf(canvas, paper, filename);
            } else if (format === 'svg') {
                exportSvg(canvas, exportW, exportH, filename);
            }

            showStatus(`${format.toUpperCase()} exported`);
        } catch (e) {
            console.error(e);
            showStatus('Export failed — try a lower DPI');
        }
    }

    function exportPdf(canvas, paper, filename) {
        const { jsPDF } = window.jspdf;
        const orientation = paper.w > paper.h ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
            orientation,
            unit: 'in',
            format: [paper.w, paper.h],
        });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, paper.w, paper.h);
        pdf.save(`${filename}.pdf`);
    }

    function exportSvg(canvas, w, h, filename) {
        const dataUrl = canvas.toDataURL('image/png');
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>${escapeAttr(els.titleInput.value || 'Map Poster')}</title>
  <image href="${dataUrl}" width="${w}" height="${h}"/>
</svg>`;
        downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${filename}.svg`);
    }

    async function batchExportAll() {
        const original = els.paperSize.value;
        const sizes = Object.keys(PAPER_SIZES);

        showStatus('Batch exporting…');
        for (const size of sizes) {
            els.paperSize.value = size;
            resizePosterFrame();
            await new Promise(r => setTimeout(r, 500));
            await exportPoster('png');
            await new Promise(r => setTimeout(r, 800));
        }
        els.paperSize.value = original;
        resizePosterFrame();
        showStatus('Batch export complete');
    }

    function downloadCanvas(canvas, filename) {
        canvas.toBlob(blob => downloadBlob(blob, filename), 'image/png');
    }

    function downloadBlob(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function sanitizeFilename(s) {
        return s.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'map-poster';
    }

    function showStatus(msg) {
        els.status.textContent = msg;
        els.status.classList.add('visible');
        clearTimeout(showStatus._timer);
        showStatus._timer = setTimeout(() => els.status.classList.remove('visible'), 3000);
    }

    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function escapeAttr(s) {
        return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    init().catch(err => {
        console.error(err);
        showStatus('Failed to initialize editor');
    });
})();
