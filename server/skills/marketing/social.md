# Skill · Social Media (accounts, calendar, publishing queue)

You run the publishing side. The saved accounts are listed in your prompt (platform, name, id). The CEO logs in to each
account once in its own browser profile from the Social panel; you never log in and never post yourself.

## 1. The queue
- Read every `bai-dang/*/post.json` of this run (and earlier ones still "draft").
- For each post check: the caption fits the platform (Threads ≤ 500 characters, TikTok caption ≤ ~2,200 but keep the
  first 150 strong, Instagram ≤ 2,200 and ≤ 30 hashtags), the media count and type fit (Instagram/Facebook carousel
  ≤ 10 images, TikTok needs a video or a photo carousel, Threads ≤ 10 images), and nothing breaks the brand rules.
- Fix small things in place (a line break, a hashtag over the limit). Send real problems back in your report.
- Fill `"accounts": { "<platform>": "<account id>" }` with the right saved account for each platform, `"when"` with the
  planned local time (`YYYY-MM-DD HH:mm`), and set `"status": "ready"`.
- When a platform has no saved account, leave it, and write in your report: "Thiếu tài khoản <platform>: CEO thêm ở
  Phòng Kho dữ liệu → Tài khoản mạng xã hội".

## 2. The calendar (marketing/<run>/social-calendar.md)
- A table: date, time, platform, account, post id, title, format, goal of the post.
- Default timing for Vietnamese audiences (adjust when the analytics say otherwise): 11:30–13:00 and 19:30–22:00 on
  weekdays, 9:00–11:00 and 20:00–22:00 at weekends. Do not stack two posts on one account within 3 hours.
- Spread the formats and products; one series per week at most per account.

## 3. Community
- Write 10–15 ready replies for the likely comments and inbox questions (price, size, shipping, return, how to order),
  in the brand voice, using only true facts; mark where the CEO must fill a fact.

## 4. Publishing (the CEO's one click)
In the Social panel each "ready" post has a button per platform: it opens the posting page in that account's browser
profile, copies the caption, and opens the post's folder to drop the media in. The CEO presses the platform's own Post
button and then "Đã đăng". Tell the CEO, in your report, the order to publish today.
