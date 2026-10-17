# Newsletter

Two signup paths. They do not share a form.

## Inline signup (beehiiv)

The block at the bottom of `/` (`section.nl`) embeds a beehiiv subscribe form. It is not a popup. There is no Klaviyo onsite script (`klaviyo.js`) on the site.

Default form ID: `d769eb81-bf6c-442c-96b6-7097f59a9f52`

```html
<script async src="https://subscribe-forms.beehiiv.com/v3/loader.js" data-beehiiv-form="FORM_ID"></script>
```

Optional: set `PUBLIC_BEEHIIV_FORM_ID` in Vercel to override without a code change. Astro inlines `PUBLIC_*` at build time, so redeploy after changing it.

File: `src/components/NewsletterEmbed.astro`

## Popup (Klaviyo)

`Your Cruise Briefing` is mounted from `src/layouts/Base.astro`, so it can appear on any page.

- Appears after the visitor has stayed on that page for 10 seconds.
- Shown at most 3 times total. The count is stored in `localStorage` (`nfc-briefing-shows`) and mirrored to the cookie `nfc_briefing`.
- No thanks, the close button, Escape, and the backdrop all dismiss it. The display is counted when it opens, so No thanks counts as one of the three.
- At most once per browser session (`sessionStorage` key `nfc-briefing-seen`, plus session cookie `nfc_briefing_seen`).
- After a successful subscribe, `nfc-briefing-subscribed` is set and the popup does not return.

Submission uses Klaviyo's client subscriptions API from the browser. There is no server route and no private API key.

`POST https://a.klaviyo.com/client/subscriptions/?company_id=PUBLIC_KEY`

Header: `revision: 2026-10-15`

The email is subscribed to the Email List with email marketing consent `SUBSCRIBED`.

### Env vars

Both values are public by design. Defaults live in `src/utils/briefingPopup.js` and are used when the env var is unset.

| Env var | Default | What it is |
| --- | --- | --- |
| `PUBLIC_KLAVIYO_COMPANY_ID` | `VAgS5Z` | Klaviyo public API key / site ID (`company_id`) |
| `PUBLIC_KLAVIYO_LIST_ID` | `Tx8Htx` | List ID for "Email List" |

Set either var in Vercel only to override the default, then redeploy. `PUBLIC_*` values are inlined at build time.

Files:

- `src/components/NewsletterPopup.astro`
- `src/utils/briefingPopup.js`
