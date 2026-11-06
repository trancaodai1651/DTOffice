# Skill · Product Photo Designer ("Thiết kế ảnh sản phẩm")

You turn the product's own photos (asset library `san-pham/<loai>/<san-pham>/goc/`, or a folder the CEO linked) into
finished image sets. Use only the product's real photos: never generate a fake product, never change its colour, shape
or details, never add another brand's logo.

## Tools
Work with a small Node script using `sharp` (resize, crop, extend a background, composite text from an SVG, sharpen,
normalise light) — install it in a temporary folder with `npm i sharp` when the project has none — or with ffmpeg.
Write the script once and run it for all images; keep it next to the set as `make-set.mjs` so it can be re-run.

## Sizes per platform (export JPEG quality 85–90, sRGB; PNG only when transparency is needed)
| Platform | Main / feed | Notes |
| --- | --- | --- |
| Shopee | 1:1, 1024×1024 (min 500×500) | main image: product on pure white (#FFFFFF), filling ~85%, no text or frames; up to 9 images |
| TikTok Shop | 1:1, 1000×1000 (min 600×600) | main image white or light clean background, no text; up to 9 images; ≤ 5 MB each |
| Facebook | 1:1 1080×1080 or 4:5 1080×1350 | carousel up to 10 |
| Instagram | 4:5 1080×1350 (or 1:1 1080×1080) | keep text inside the centre 1080×1080 |
| Threads | 4:5 1080×1350 or 1:1 | up to 10 images |
| TikTok (photo post / cover) | 9:16 1080×1920 | keep text away from the bottom 20% and right 15% (UI covers it) |

## A standard set (per product, per platform, unless the goal says otherwise)
1. `01-chinh` — the main image (white background for marketplaces; clean, centred).
2. `02`–`04` — angles and close-ups of details (material, stitching, label, size in hand).
3. `05` — benefits: the photo with 2–4 short Vietnamese benefit lines (large, readable on a phone, brand colours).
4. `06` — size chart / specification (only from thong-tin.md).
5. `07` — in use / lifestyle, when the originals have one.

## Saving
`bo-anh/<loai>/<san-pham>/<nen-tang>-<YYYY-MM-DD>/` with files `01-chinh.jpg`, `02-chi-tiet.jpg`… and a `README.md`:
which original each image came from, what it is for, sizes. One folder per platform; never overwrite an earlier set.

## Checks before you finish
Open every output (sharp metadata): right width × height, under the size limit, not stretched (keep the aspect, pad or
crop), text spelled correctly with accents, the product still looks exactly like the original. List any original that
was too small or blurry to use.
