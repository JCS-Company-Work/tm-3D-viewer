# Tailormade Three Viewer Prototype

WordPress shortcode prototype for a GLB-first Three.js product viewer.

## Shortcode

```text
[tm_model_viewer model="prototype"]
```

Optional initial material selections:

```text
[tm_model_viewer model="prototype" top="arabescato" base="american-walnut" metal="brushed-bronze" height="520px"]
```

Converted OBJ/PHP test model:

```text
[tm_model_viewer model="tt02-metal-bp101"]
```

## Prototype Notes

- `assets/config/models.json` maps model IDs to GLB files and mesh names.
- `assets/config/materials.json` maps material slugs to JPG textures and Three.js material settings.
- `assets/models/prototype.glb` is a generated placeholder table with named meshes: `top`, `base`, and `metal`. The `base` mesh contains all four legs, and the `metal` mesh contains exterior tabletop banding.
- `assets/models/tt02-metal-bp101.glb` is a converted legacy OBJ/PHP model with preserved mesh names: `TOP_BANDING`, `TOP_TILE`, `TOP_BASE`, `LEG`, and `SHADOWGAP`.
- `assets/textures/*.jpg` are generated placeholder textures. Replace them with production texture files using the same filenames or update `materials.json`.
- Existing PHP/OBJ/MTL assets are intentionally untouched.
