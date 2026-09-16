# App Store launch materials

This directory keeps the small, reviewable source of truth for Nightshift's App Store listing. Public copy belongs here because it ships with the product and benefits from the same review history as the code.

## What is versioned here

- English App Store metadata and App Review notes
- A ready-to-enter App Store Connect field-by-field handoff
- Screenshot requirements, shot list, and production guidance
- Pointers to the canonical hosted privacy and support pages
- The launch checklist

## What is intentionally not versioned here

- Raw or final screenshot binaries
- App Store Connect API keys, signing certificates, provisioning profiles, passwords, or notarization credentials
- Internal launch schedules, pricing discussions, customer lists, or unreleased campaign plans

Screenshots are excluded by `screenshots/.gitignore`. Keep working captures in the private Fly Media asset store or a dedicated private marketing repository. App Store Connect becomes the distribution copy. If long-term source control for large artwork becomes useful, use Git LFS in that private repository rather than adding binaries to this source repository.

Before entering the listing, work through [`app-store-connect.md`](app-store-connect.md). It records the intended free price, public distribution, privacy answers, age-rating rationale, release choice, and the few App Store Connect fields that must be supplied by the Account Holder at submission time.

The app and extension icons are different: they are required build inputs, so their SVG masters and generated PNG renditions belong in this repository.
