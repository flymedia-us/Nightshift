# Contributing to Nightshift

Thanks for helping improve Nightshift.

## Before opening an issue

- Check that the behavior still occurs with the current build.
- Try disabling Nightshift for the affected website. Sites with their own dark theme or complex graphics can be a better fit for a per-site exception.
- For bugs, include your macOS and Safari versions, Nightshift version, selected appearance mode, website address, and a short description of what you expected and saw.

Do not include screenshots, page source, or browser data that contain private information.

## Development

Nightshift targets macOS 12.3 or later. The supported release matrix is macOS 15, 26, and 27. See the local-development section in [README.md](README.md), then run:

```sh
make verify
```

The icon masters live in `Artwork/`; regenerate their PNG renditions with `npm run icons` after changing either SVG. Run `npm run smoke:install` once, then `make smoke` for the opt-in WebKit compatibility run. Smoke screenshots are generated locally in `.build/smoke/` and are not committed.

## Pull requests

- Keep changes focused and include tests when behavior changes.
- Preserve the existing MIT license and original attribution.
- Do not add tracking, analytics, advertising SDKs, or network requests without a clear product discussion and corresponding updates to the privacy policy and App Store privacy declarations.
- Do not commit credentials, signing material, App Store screenshots, or generated build products.

By contributing, you agree that your contribution is licensed under the project’s [MIT License](LICENSE).
