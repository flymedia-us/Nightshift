# Nightshift

Nightshift is a macOS Safari extension that applies a dark appearance to websites. This Fly Media fork is based on [unmade/Nightshift](https://github.com/unmade/Nightshift) and is being prepared for a modernized release.

The current implementation uses CSS filters to invert page colors while restoring images and video. Dark mode can be enabled or disabled per site.

## Local development

Requirements:

- macOS 15 or later
- Xcode 26 or later
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)

Generate the Xcode project and verify an unsigned debug build:

```sh
make build
```

To open the generated project in Xcode:

```sh
make open
```

Select the **Nightshift** scheme and your Fly Media development team, then build and run. In Safari, open **Settings → Extensions** and enable Nightshift.

The checked-in `Nightshift.xcodeproj` is generated from [`project.yml`](project.yml). Update `project.yml` when changing targets or build settings, then run `make setup` to regenerate the project.

## Repository setup

- `origin` — Fly Media fork: `git@github.com:flymedia-us/Nightshift.git`
- `upstream` — original project: `https://github.com/unmade/Nightshift.git`

Fetch future upstream changes with:

```sh
git fetch upstream
```

## Modernization status

This first setup pass preserves the original Safari App Extension architecture and raises the deployment target so it builds on the current toolchain. A later pass should evaluate migration to a Safari Web Extension, replace the legacy storyboard/XIB shell, refresh the visual identity, and add automated tests.

## License

Nightshift is available under the MIT License. See [`LICENSE`](LICENSE). The original copyright and license notice are retained.
