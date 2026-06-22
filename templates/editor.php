<section class="editor-page">
    <aside class="editor-sidebar">
        <div class="sidebar-section">
            <h2>Location</h2>
            <div class="form-group">
                <label for="search-input">Search</label>
                <input type="text" id="search-input" placeholder="City, park, address…">
                <div id="search-results" class="search-results"></div>
            </div>
            <div class="form-group">
                <label>Michigan Presets</label>
                <select id="preset-select">
                    <option value="">Choose a preset…</option>
                </select>
            </div>
            <button type="button" id="draw-bounds-btn" class="btn btn-secondary btn-block">Draw Bounding Box</button>
        </div>

        <div class="sidebar-section">
            <h2>Framing</h2>
            <div class="zoom-controls">
                <label for="zoom-slider">Zoom level <span id="zoom-value">6.0</span></label>
                <div class="zoom-buttons-row">
                    <button type="button" id="zoom-out" class="btn btn-secondary" title="Zoom out">−</button>
                    <input type="range" id="zoom-slider" min="2" max="18" step="0.05" value="6">
                    <button type="button" id="zoom-in" class="btn btn-secondary" title="Zoom in">+</button>
                </div>
                <div class="form-row zoom-fine-row">
                    <button type="button" id="zoom-fine-out" class="btn btn-secondary">−0.25</button>
                    <button type="button" id="zoom-fine-in" class="btn btn-secondary">+0.25</button>
                </div>
                <div class="form-row zoom-fine-row">
                    <button type="button" id="pan-north" class="btn btn-secondary">↑</button>
                    <button type="button" id="pan-west" class="btn btn-secondary">←</button>
                    <button type="button" id="pan-east" class="btn btn-secondary">→</button>
                    <button type="button" id="pan-south" class="btn btn-secondary">↓</button>
                </div>
                <button type="button" id="fit-michigan" class="btn btn-secondary btn-block">Fit all of Michigan</button>
                <button type="button" id="fit-drawn" class="btn btn-secondary btn-block">Fit to drawn box</button>
                <button type="button" id="reset-bearing" class="btn btn-secondary btn-block">Reset north up</button>
            </div>
            <p class="hint">Scroll/pinch on the map, or use controls above. Zoom buttons stay out of exports.</p>
        </div>

        <div class="sidebar-section">
            <h2>Print Settings</h2>
            <div class="form-row">
                <div class="form-group">
                    <label for="paper-size">Paper Size</label>
                    <select id="paper-size">
                        <option value="8x10">8×10"</option>
                        <option value="11x14" selected>11×14"</option>
                        <option value="16x20">16×20"</option>
                        <option value="24x36">24×36"</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="dpi">DPI</label>
                    <select id="dpi">
                        <option value="150">150</option>
                        <option value="300" selected>300</option>
                        <option value="600">600</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="style-select">Map Style</label>
                <select id="style-select">
                    <option value="minimalist">Minimalist</option>
                    <option value="topo">Topographic</option>
                    <option value="dark">Dark</option>
                    <option value="vintage">Vintage</option>
                    <option value="blueprint">Blueprint</option>
                    <option value="black-white">Black & White</option>
                </select>
            </div>
            <p class="hint" id="export-dimensions">Export: 3300 × 4200 px</p>
        </div>

        <div class="sidebar-section">
            <h2>Map Content</h2>
            <p class="hint">Hide clutter for cleaner poster prints.</p>
            <div class="checkbox-group">
                <label><input type="checkbox" id="show-transit"> Transit &amp; bus stops</label>
                <label><input type="checkbox" id="show-poi"> Points of interest</label>
                <label><input type="checkbox" id="show-shields"> Highway shields</label>
                <label><input type="checkbox" id="show-paths" checked> Walking paths</label>
                <label><input type="checkbox" id="show-minor-labels"> Minor road names</label>
            </div>
        </div>

        <div class="sidebar-section">
            <h2>Labels & Overlays</h2>
            <div class="form-group">
                <label for="title-input">Title</label>
                <input type="text" id="title-input" placeholder="Sleeping Bear Dunes">
            </div>
            <div class="form-group">
                <label for="subtitle-input">Subtitle</label>
                <input type="text" id="subtitle-input" placeholder="Empire, Michigan">
            </div>
            <div class="checkbox-group">
                <label><input type="checkbox" id="show-scale" checked> Scale bar</label>
                <label><input type="checkbox" id="show-north" checked> North arrow</label>
                <label><input type="checkbox" id="show-coords" checked> Coordinates</label>
                <label><input type="checkbox" id="show-grid"> Grid lines</label>
            </div>
        </div>

        <div class="sidebar-section">
            <h2>Extras</h2>
            <div class="form-group">
                <label for="gpx-input">GPX Route</label>
                <input type="file" id="gpx-input" accept=".gpx">
            </div>
            <div class="form-group">
                <label for="inset-input">Photo Inset</label>
                <input type="file" id="inset-input" accept="image/*">
            </div>
            <div class="inset-controls" id="inset-controls" hidden>
                <div class="form-group">
                    <label for="inset-size">Size <span class="inset-size-val" id="inset-size-val">22%</span></label>
                    <input type="range" id="inset-size" min="10" max="45" value="22" step="1">
                </div>
                <div class="form-group">
                    <label for="inset-position">Placement</label>
                    <select id="inset-position">
                        <option value="top-left">Top left</option>
                        <option value="top-right">Top right</option>
                        <option value="bottom-left">Bottom left</option>
                        <option value="bottom-right">Bottom right</option>
                        <option value="center">Center</option>
                    </select>
                </div>
                <button type="button" id="remove-inset" class="btn btn-secondary btn-block">Remove photo</button>
            </div>
        </div>

        <div class="sidebar-section sidebar-actions">
            <div class="export-buttons">
                <button type="button" id="export-png" class="btn btn-primary">Export PNG</button>
                <button type="button" id="export-pdf" class="btn btn-primary">Export PDF</button>
                <button type="button" id="export-svg" class="btn btn-primary">Export SVG</button>
            </div>
            <button type="button" id="batch-export" class="btn btn-secondary btn-block">Batch Export All Sizes</button>
        </div>
    </aside>

    <div class="editor-canvas" id="editor-canvas">
        <div class="poster-frame" id="poster-frame">
            <div class="poster-inner" id="poster-inner">
                <div id="map"></div>
                <div class="poster-overlays overlay-theme-light" id="poster-overlays">
                    <div class="overlay-north overlay-badge" id="overlay-north">
                        <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
                            <polygon points="20,2 26,28 20,22 14,28" fill="currentColor"/>
                            <text x="20" y="38" text-anchor="middle" font-size="8" fill="currentColor">N</text>
                        </svg>
                    </div>
                    <div class="overlay-scale overlay-badge" id="overlay-scale"></div>
                    <div class="overlay-coords overlay-badge" id="overlay-coords"></div>
                    <div class="poster-title-block">
                        <h1 id="overlay-title"></h1>
                        <p id="overlay-subtitle"></p>
                    </div>
                    <canvas class="overlay-grid" id="overlay-grid"></canvas>
                    <div class="overlay-inset pos-top-left" id="overlay-inset" hidden>
                        <img id="inset-preview" alt="Photo inset">
                    </div>
                </div>
            </div>
        </div>
        <div class="editor-status" id="editor-status"></div>
    </div>
</section>

<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"></script>
<script src="/assets/js/editor.js"></script>
