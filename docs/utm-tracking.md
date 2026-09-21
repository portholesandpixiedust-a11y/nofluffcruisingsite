# UTM tracking

UTM parameters **label** where a visit came from. They travel on the URL query string. **Google Analytics 4** (when enabled) **counts** those labeled visits.

This site does not ship analytics unless you set a measurement ID. To turn GA4 on in production:

1. Create a GA4 property and copy the Measurement ID (`G-XXXXXXXX`).
2. In Vercel → Project → Settings → Environment Variables, add:
   - **Name:** `PUBLIC_GA_MEASUREMENT_ID`
   - **Value:** your `G-…` ID
   - Scope: Production (and Preview only if you want test traffic separated carefully)
3. Redeploy so the build picks up the env var.

When `PUBLIC_GA_MEASUREMENT_ID` is unset, `Base.astro` injects no gtag scripts.

## Naming convention

Keep values lowercase, hyphenated, and stable so reports stay comparable over time.

### QR codes (offline)

```
utm_source=qr
utm_medium=offline
utm_campaign=<campaign-slug>
utm_content=<optional-placement>
```

Examples of campaign slugs: `flyer-spring-2026`, `booth-cruise-show`, `business-card`.  
Examples of content (placement): `front`, `back`, `table-tent`, `poster`.

### YouTube description links

```
utm_source=youtube
utm_medium=video
utm_campaign=<videoId>
utm_content=description
```

Use the YouTube video ID (the `v=` value) as `utm_campaign` so each video is separable in reports.

## How to view in GA4

1. Open your GA4 property.
2. Go to **Reports → Acquisition → Traffic acquisition**.
3. Add a secondary dimension such as **Session source / medium** or **Session campaign** (Campaign) to split QR vs YouTube and see campaign slugs.

Allow a day or so for standard reports to populate after first traffic. Realtime can confirm a tagged hit sooner.

## Example URLs

Base site: `https://nofluffcruising.com`

### Homepage

QR (flyer front):

```
https://nofluffcruising.com/?utm_source=qr&utm_medium=offline&utm_campaign=flyer-spring-2026&utm_content=front
```

YouTube description (replace `VIDEO_ID`):

```
https://nofluffcruising.com/?utm_source=youtube&utm_medium=video&utm_campaign=VIDEO_ID&utm_content=description
```

### Drink package guide

```
https://nofluffcruising.com/guides/royal-caribbean-drink-package-worth-it/?utm_source=qr&utm_medium=offline&utm_campaign=flyer-spring-2026&utm_content=front
```

```
https://nofluffcruising.com/guides/royal-caribbean-drink-package-worth-it/?utm_source=youtube&utm_medium=video&utm_campaign=VIDEO_ID&utm_content=description
```

### Crown & Anchor tiers guide

```
https://nofluffcruising.com/guides/royal-caribbean-crown-anchor-tiers/?utm_source=qr&utm_medium=offline&utm_campaign=booth-cruise-show&utm_content=handout
```

```
https://nofluffcruising.com/guides/royal-caribbean-crown-anchor-tiers/?utm_source=youtube&utm_medium=video&utm_campaign=VIDEO_ID&utm_content=description
```

### 2027 announcements guide

```
https://nofluffcruising.com/guides/royal-caribbean-2027-announcements-most-cruisers-missed/?utm_source=qr&utm_medium=offline&utm_campaign=flyer-spring-2026&utm_content=back
```

```
https://nofluffcruising.com/guides/royal-caribbean-2027-announcements-most-cruisers-missed/?utm_source=youtube&utm_medium=video&utm_campaign=VIDEO_ID&utm_content=description
```

## Making a QR code

1. Build the full URL including UTMs (copy one of the examples and edit the campaign/content).
2. Paste that exact URL into any QR generator.
3. Print or place the QR. Do not shorten in a way that strips query parameters unless the shortener preserves them.

The QR must encode the **full tagged URL**, not a bare path.

## What is and is not countable

- **Countable:** Someone opens the tagged URL in a browser and the site loads (GA4 then records the session with those campaign parameters).
- **Not countable:** A camera “scans” the QR but never opens a browser, or the visit uses a URL without UTMs. Those never reach the site as labeled traffic.

UTMs alone do not send data anywhere; they only label the request. Counting requires GA4 (or another analytics product) to be configured and loaded on the page.
