# YouTube on-video QR tracking (UTM + GA4)

Track how often a QR code shown **on a YouTube video** is scanned by counting successful page loads on nofluffcruising.com.

## How a scan becomes a count

1. Viewer scans the on-video QR with their phone camera.
2. The phone opens the **full destination URL** (including UTM query string).
3. If GA4 is enabled on the site, that visit starts a GA4 session attributed to the UTM tags.
4. **Only loads that reach the site count.** Failed scans, camera apps that preview without opening, or users who never land on the page do not appear in GA4.

You are not counting “QR impressions” inside YouTube. You are counting **sessions (and page views) that arrived via the tagged URL**.

## UTM convention for on-video QR

Use this query string on every on-video QR destination:

```
utm_source=youtube&utm_medium=qr&utm_campaign=<youtubeVideoId>&utm_content=on_video
```

| Param | Value | Purpose |
| --- | --- | --- |
| `utm_source` | `youtube` | Channel / platform |
| `utm_medium` | `qr` | Distinguishes QR scans from other YouTube traffic |
| `utm_campaign` | YouTube video ID (e.g. `hVsaSdh5TD8`) | Ties scans to a specific video |
| `utm_content` | `on_video` | Marks codes burned into the video frame |
| `utm_term` | *(optional)* | A/B creative label later (e.g. `cta_v1`) |

Description-bar / comment links can use `utm_medium=video&utm_content=description` instead of `qr` / `on_video`.

## Example QR destination URLs

Replace `VIDEO_ID` with the YouTube video id the QR appears in (the characters after `v=` / `youtu.be/`).

**Homepage**

```
https://nofluffcruising.com/?utm_source=youtube&utm_medium=qr&utm_campaign=VIDEO_ID&utm_content=on_video
```

**Drink package guide**

```
https://nofluffcruising.com/guides/royal-caribbean-drink-package-worth-it/?utm_source=youtube&utm_medium=qr&utm_campaign=VIDEO_ID&utm_content=on_video
```

**Crown & Anchor tiers**

```
https://nofluffcruising.com/guides/royal-caribbean-crown-anchor-tiers/?utm_source=youtube&utm_medium=qr&utm_campaign=VIDEO_ID&utm_content=on_video
```

**2027 announcements**

```
https://nofluffcruising.com/guides/royal-caribbean-2027-announcements-most-cruisers-missed/?utm_source=youtube&utm_medium=qr&utm_campaign=VIDEO_ID&utm_content=on_video
```

## Build the QR

Encode the **full URL including the query string**. Do not encode a bare path and append UTMs later—most QR generators will not keep parameters you add after generation.

1. Copy one of the example URLs above.
2. Swap `VIDEO_ID` for the real video id.
3. Paste that complete URL into your QR tool (Canva, qr-code-generator, etc.).
4. Place the QR in the video frame; keep contrast high and hold it on screen long enough to scan.

## Read counts in GA4

After `PUBLIC_GA_MEASUREMENT_ID` is live on production:

1. Open **Reports → Acquisition → Traffic acquisition**.
2. Filter or break down by **Session source / medium** = `youtube / qr`.
3. Or use **Explorations** and dimension **Session campaign** = the video id (your `utm_campaign`).

Session counts for that source/medium (or campaign) are the practical “successful QR scan → page load” metric.

## Enable GA4 on Vercel

In the Vercel project for this site, add:

```
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

Redeploy after setting it. Until this env var is set, Base.astro injects no gtag and QR landings are not counted in GA4.

Optional local `.env`:

```
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

Do not commit a real measurement ID. Do not hardcode a fake `G-` id in the repo.
