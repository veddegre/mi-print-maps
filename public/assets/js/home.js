(async function () {
    const container = document.getElementById('home-presets');
    if (!container) return;

    try {
        const res = await fetch('/api/presets');
        const data = await res.json();
        const featured = data.locations.slice(0, 8);

        container.innerHTML = featured.map(p => `
            <a href="/editor?preset=${p.id}" class="preset-card">
                <h4>${escapeHtml(p.name)}</h4>
                <span>${escapeHtml(p.subtitle || p.category)}</span>
            </a>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p class="empty-state">Could not load presets.</p>';
    }

    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }
})();
