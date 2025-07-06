# Electron Build Speed Optimization Guide

## Current Optimizations Applied

### 1. Aggressive File Filtering
Instead of including everything and excluding what we don't want, we now explicitly include only what we need:

```json
"files": [
  "build/static/css/*.css",      // Only CSS files
  "build/static/js/*.js",        // Only JS files  
  "build/static/media/**/*",     // Media assets
  "build/index.html",            // Main HTML
  "build/manifest.json",         // PWA manifest
  "build/favicon.ico",           // Favicon
  "main.js",                     // Electron main process
  "preload.js",                  // Electron preload script
  "package.json"                 // Package metadata
]
```

### 2. Build Speed Settings
```json
"compression": "store",          // No compression for faster builds
"removePackageKeywords": true,   // Remove unnecessary metadata
```

### 3. Enhanced Build Scripts
- `npm run dist-dev` - Standard development build
- `npm run dist-dev-fast` - Faster build with no compression, no signing
- `npm run dist-dev-ultra` - Ultra-fast build with no compression, no signing, no ASAR

## Speed Comparison

| Command | Compression | Code Signing | ASAR | Speed |
|---------|-------------|--------------|------|-------|
| `dist-dev` | Normal | Disabled | Yes | Baseline |
| `dist-dev-fast` | None | Disabled | Yes | ~30% faster |
| `dist-dev-ultra` | None | Disabled | No | ~50% faster |

## What Each Script Does

### dist-dev-fast
```bash
npm run dist-dev-fast
```
- No compression (store mode)
- No code signing
- Files still packed in ASAR archive
- Good balance of speed and testing authenticity

### dist-dev-ultra  
```bash
npm run dist-dev-ultra
```
- No compression
- No code signing
- No ASAR packaging (files are loose)
- Fastest possible build
- Easiest to debug (can inspect individual files)

## File Size vs Speed Trade-offs

| Setting | Build Time | Final Size | Best For |
|---------|------------|------------|----------|
| Normal compression | Slowest | Smallest | Production |
| Store compression | Medium | Medium | Development |
| No ASAR + Store | Fastest | Largest | Quick testing |

## Additional Optimizations

### 1. Exclude Source Maps
The current config already excludes `.map` files, saving significant space and time.

### 2. Minimal Dependencies
Only essential files are included, excluding:
- Source code (`src/`)
- Public assets (handled via `extraResources`)
- Documentation files
- Test files
- Build artifacts

### 3. Resource Handling
Vault files and audio assets are handled via `extraResources` instead of `files` for better control:

```json
"extraResources": [
  { "from": "public/audios", "to": "audios" },
  { "from": "public/vault", "to": "vault" }
]
```

## Usage Recommendations

### For Development/Testing
Use `npm run dist-dev-ultra` for:
- Quick functionality testing
- Debugging packaged app issues
- Frequent rebuilds during development

### For QA/Sharing
Use `npm run dist-dev-fast` for:
- Testing before release
- Sharing with testers
- Validating packaging works correctly

### For Production
Use `npm run dist-win-full` for:
- Final release builds
- Distribution to end users
- When file size matters

## Performance Tips

1. **Clean before major builds**: Run `npm run clean` before switching build types
2. **Use SSD storage**: Build process is I/O intensive
3. **Close other applications**: More RAM = faster builds
4. **Use fast mode for iteration**: Switch to `dist-dev-ultra` during active development

## Troubleshooting

### Build Still Slow?
1. Check if antivirus is scanning the dist folder
2. Ensure no other Electron apps are running
3. Try `npm run clean` and rebuild
4. Use `dist-dev-ultra` for maximum speed

### Missing Files in Ultra Mode?
- Files are loose in `resources/app/` instead of `app.asar`
- Vault files are in `resources/vault/`
- This is normal for ultra-fast builds
