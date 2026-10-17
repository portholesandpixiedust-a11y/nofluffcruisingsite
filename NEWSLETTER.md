# Newsletter (Klaviyo)

Signup uses Klaviyo's client subscriptions API from the browser. There is no server route and no private API key. The site does not load Klaviyo's onsite script (`klaviyo.js`).

`POST https://a.klaviyo.com/client/subscriptions/?company_id=PUBLIC_KEY`

Header: `revision: 2026-10-15`

The email is subscribed to the Email List with email marketing consent `SUBSCRIBED`.

## Env vars

Both values are public by design. Defaults live in `src/utils/briefingPopup.js` and are used when the env var is unset.

| Env var | Default | What it is |
| --- | --- | --- |
| `PUBLIC_KLAVIYO_COMPANY_ID` | `VAgS5Z` | Klaviyo public API key / site ID (`company_id`) |
| `PUBLIC_KLAVIYO_LIST_ID` | `Tx8Htx` | List ID for "Email List" |

Set either var in Vercel only to override the default, then redeploy. Astro inlines `PUBLIC_*` at build time.

## Inline form

Bottom of `/` (`section.nl`). It stays in the page. It does not pop up. A successful subscribe sets `nfc-briefing-subscribed`, so the popup does not appear afterward.

File: `src/components/NewsletterForm.astro`

## Popup

`Your Cruise Briefing` is mounted from `src/layouts/Base.astro`, so it can appear on any page.

- Appears after the visitor has stayed on that page for 10 seconds.
- Shown at most 3 times total. The count is stored in `localStorage` (`nfc-briefing-shows`) and mirrored to the cookie `nfc_briefing`.
- No thanks, the close button, Escape, and the backdrop all dismiss it. The display is counted when it opens, so No thanks counts as one of the three.
- At most once per browser session (`sessionStorage` key `nfc-briefing-seen`, plus session cookie `nfc_briefing_seen`).
- After a successful subscribe, `nfc-briefing-subscribed` is set and the popup does not return.

File: `src/components/NewsletterPopup.astro`

## Removed

The previous signup was a Beehiiv slide-in. `subscribe-forms.beehiiv.com/v3/loader.js` (form `d769eb81-bf6c-442c-96b6-7097f59a9f52`) injected a fixed panel at `z-index: 2147483647` with its own close button. That script lived in the homepage newsletter section, so the "inline" embed was the popup. It is removed. An earlier homepage-only popup component (`NewsletterPopup.astro` from September 2026) had already been unmounted; its leftover CSS and the `nfc-nl-dismissed` privacy note are gone too.
