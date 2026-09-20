# Newsletter (beehiiv)

Homepage signup uses a beehiiv subscribe form embed. Popup and inline section both use the same form.

## Live form

Default form ID (already in the repo): `d769eb81-bf6c-442c-96b6-7097f59a9f52`

Embed style (beehiiv v3):

```html
<script async src="https://subscribe-forms.beehiiv.com/v3/loader.js" data-beehiiv-form="FORM_ID"></script>
```

Optional: set `PUBLIC_BEEHIIV_FORM_ID` in Vercel to override without a code change. Astro inlines `PUBLIC_*` at build time, so redeploy after changing the env var.

## Creating or rotating a form

1. In beehiiv: **Audience → Subscribe forms**.
2. Create or open a form → **Get embed code**.
3. Copy the UUID from `data-beehiiv-form="..."`.
4. Update the default in `NewsletterEmbed.astro`, or set `PUBLIC_BEEHIIV_FORM_ID` and redeploy.

## Behaviour

- **Inline block**: bottom of `/` (`section.nl`).
- **Popup**: homepage only, after 10 seconds. Dismiss with ×, Escape, or backdrop. Stored in `localStorage` as `nfc-nl-dismissed` for 30 days.

## Files

- `src/components/NewsletterEmbed.astro`
- `src/components/NewsletterPopup.astro`
- Wired from `src/pages/index.astro`
