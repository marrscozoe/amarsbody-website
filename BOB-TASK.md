# Bob Task: AMarsBody — Consult ALL admin customer wording

## Repo
`/Users/openclawassistant/.openclaw/workspace/amarsbody-website`

## Base SHA
`e06cfe0` — you are already on branch `consult-all-wording-v2` (just created from this SHA).

## What to build

### Admin Consult Settings — add these new editable fields, all persisted in KV (GET/POST round-trip with existing settings):

1. `ctaText` — already exists in KV. Ensure homepage consult button label uses it (not hardcoded "Book a Free Consultation" or "call").
2. `offerLine` — e.g. "Free 30-minute call" or "$55 / 30-min session — profits to SWAT"
3. `confirmTitle` — e.g. "Confirm Your Consultation" → "Confirm your session"
4. `waiverText` — editable waiver copy (session/fundraiser wording); shown on waiver step
5. `successTitle` — e.g. "You're Booked!"
6. `successBody` — follow-up copy after successful booking
7. `closedEmptyMessage` — shown when noTimeAvailable (closed state)

### Customer UI — no hardcoded call/Free Consultation
- All customer-facing references to "call", "Free Consultation", "consultation" in the consult flow must come from these admin fields (or derive from ctaText where appropriate).
- Admin preview shows the same strings customers see.

### Homepage button
- Label = ctaText (not hardcoded)
- Consult QR next to the button is OK if QR goes to /calendar/consult (amarsbody-consult.png). NO homepage QR (amarsbody.com) next to that button.

### KV persistence
- All fields round-trip GET/POST with existing settings on the Consult Settings admin card.
- noTimeAvailable, bookAheadEndDate, noEndDate, ctaText already exist — add offerLine, confirmTitle, waiverText, successTitle, successBody, closedEmptyMessage.
- Persist in KV; ensure UI saves and reloads correctly.

### Consult UI changes needed
- Waiver step uses waiverText
- Confirm step uses confirmTitle
- Success step uses successTitle + successBody
- Closed/empty state uses closedEmptyMessage
- No hardcoded "call" or "Free Consultation" strings remaining in any customer-facing component

## Workflow
1. Explore the codebase to find: Consult Settings admin component, KV store wrapper, consult flow pages (waiver, confirm, success), homepage CTA button
2. Add the new KV fields (offerLine, confirmTitle, waiverText, successTitle, successBody, closedEmptyMessage) to the settings card — GET/POST round-trip with existing settings
3. Update consult flow pages to read from these KV fields
4. Update homepage CTA to use ctaText from KV (not hardcoded)
5. Remove all hardcoded "call", "Free Consultation", "consultation" from customer-facing components — replace with KV-derived values
6. `git add . && git commit -m "feat: consult all admin wording fields persisted in KV"`
7. `git push origin consult-all-wording-v2`
8. Wait for Vercel preview to be Ready at https://amarsbody-website-btzn8zdff-marrscozoes-projects.vercel.app
9. Write proof to `/Users/openclawassistant/.openclaw/workspace/jobs/proof/20260917-1037-consult-all-wording-bob.md`
10. Reply with: branch name, commit SHA, and preview URL

**Do NOT run --prod. Leave consult CLOSED. Bridgett/BNI untouched.**
