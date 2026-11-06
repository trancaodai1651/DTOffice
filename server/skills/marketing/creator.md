# Skill · Social Content Creator

## 1. Ideas before writing
- From the brief and the product facts, write 8–12 ideas in a table: angle, hook (first line / first 2 seconds), format
  (single image, carousel, short video, text-only for Threads), platform, why it should work for this buyer.
- Mix the angles: problem → solution, benefit in use, detail close-up, comparison (without naming competitors),
  customer question answered, behind the scenes / packing, offer or deadline (only if the CEO gave one), series.
- Pick the best ideas for the number of posts asked (default: 3 posts per platform asked). Say why you picked them.

## 2. Writing each post
- Hook in the first line (under ~90 characters): a question, a pain, a surprising detail, or a clear benefit.
- Body: 2–5 short lines, one benefit per line, concrete (size, material, how it is used), from thong-tin.md only.
- CTA: one clear action (inbox, comment a keyword, link in bio, order on Shopee / TikTok Shop).
- Hashtags: 3–8, relevant, mix of broad and specific Vietnamese tags; no banned or unrelated trending tags.
- Fit each platform:
  - Facebook: up to ~600 characters is fine, line breaks, 1 CTA, carousel or single image.
  - Instagram: first line strong, hashtags at the end, square 1080×1080 or portrait 1080×1350 image.
  - Threads: under 500 characters, conversational, a question that invites replies, 0–2 hashtags.
  - TikTok: caption under ~150 characters + 3–5 hashtags; the video script/idea goes in a "script" field.
- Read it aloud in your head: no repeated words, no clichés ("chất lượng hàng đầu", "giá cả phải chăng" without proof).

## 3. The post package (what Social Media and the CEO use)
For each post create `bai-dang/<YYYYMMDD>-<product>-<platform>-<n>/post.json` in the asset library:

```json
{
  "title": "Áo thun basic trắng · lợi ích chất vải",
  "product": "ao-thun/ao-thun-basic-trang",
  "platforms": ["facebook", "instagram"],
  "caption": "…the full text, ready to paste…",
  "hashtags": ["#aothun", "#aothunbasic"],
  "media": ["01.jpg", "02.jpg"],
  "when": "",
  "status": "draft",
  "run": "<the run id>"
}
```
- `platforms`: from facebook, instagram, threads, tiktok, shopee, tiktokshop, zalo.
- `media`: files in the same folder (copy the chosen images or video from bo-anh/ or san-pham/…/goc/ into it), in the
  order they should be uploaded. No absolute paths.
- Leave `when` empty and `status` "draft": Social Media fills the account and time and sets "ready".
- One package per platform when the caption differs; one package for several platforms when it is the same text.

## 4. Check before you finish
Every post.json parses as JSON; every media file exists; no "[CẦN BỔ SUNG]" left unless reported; the number of posts
matches the goal.
