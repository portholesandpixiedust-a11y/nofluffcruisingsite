# Newsletter (beehiiv)

Homepage signup uses a beehiiv subscribe form embed. Popup and inline section both read the same env var.

## One-time setup

1. In beehiiv: **Audience → Subscribe forms**. Create a form (or open an existing one).
2. Copy the form ID. It is the UUID in the embed URL:
   `https://subscribe-forms.beehiiv.com/<FORM_ID>`
3. In Vercel: Project → Settings → Environment Variables.
4. Add `PUBLIC_BEEHIIV_FORM_ID` = that UUID (Production, Preview, Development as you prefer).
5. Redeploy. Astro inlines `PUBLIC_*` at build time, so a new deploy is required after changing the value.

## Behaviour

- **Inline block**: replaces the old first-timer checklist on `/` (`section.nl`).
- **Popup**: homepage only, after 10 seconds. Dismiss with ×, Escape, or backdrop click. Dismissal is stored in `localStorage` under `nfc-nl-dismissed` for 30 days.
- **Unset env**: chrome still renders with a disabled email field and "Signup opens soon" so design can be reviewed before the form is live.

## Files

- `src/components/NewsletterEmbed.astro` — iframe or fallback
- `src/components/NewsletterPopup.astro` — modal + client timer
- Wired from `src/pages/index.astro`
