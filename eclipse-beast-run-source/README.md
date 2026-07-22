# Eclipse Beast Run

A mobile-first 2.5D endless runner rebuilt from the former Launch & Land prototype.

## Visual approach

The game uses a custom high-performance Canvas 2D renderer with pseudo-3D perspective, layered parallax jungle silhouettes, dynamic lighting, particles, screen shake, speed lines, animated orb/lion characters, and premium DOM HUD overlays. This approach was chosen over unstable low-quality browser 3D so the first playable experience stays smooth and visually coherent on portrait Android devices.

## Controls

- Swipe left/right: switch lanes
- Swipe up: jump
- Swipe down: slide; while airborne, ground slam
- Tap in lion form: lion power leap/dash
- Desktop: arrows/WASD, Space, E, Escape, R

## Development

```bash
npm install
npm run validate
npm run dev
npm run build
```

The production build uses the `/launch-land-3d/` base path so the existing published game URL remains unchanged.
