<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($appName ?? 'MI Print Maps') ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
    <header class="site-header">
        <div class="header-inner">
            <a href="/" class="logo">
                <span class="logo-icon">🗺</span>
                <span class="logo-text"><?= htmlspecialchars($appName ?? 'MI Print Maps') ?></span>
            </a>
            <nav class="site-nav">
            <a href="/">Home</a>
            <a href="/editor">New Map</a>
            </nav>
        </div>
    </header>
    <main>
        <?php require $contentTemplate; ?>
    </main>
    <footer class="site-footer">
        <p>Self-hosted printable map studio · Michigan OSM tiles via TileServer GL</p>
    </footer>
</body>
</html>
