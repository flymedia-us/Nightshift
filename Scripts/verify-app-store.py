#!/usr/bin/env python3
"""Inspect the exported Mac App Store package without installing it."""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TEAM = "BJZSH247Q9"


def run(*args):
    result = subprocess.run([str(arg) for arg in args], check=True, capture_output=True, text=True)
    return result.stdout + result.stderr


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def verify(package):
    signature = run("pkgutil", "--check-signature", package)
    require(f"3rd Party Mac Developer Installer: Fly Media LLC ({TEAM})" in signature,
            "The package must use Fly Media's Mac App Store installer identity")
    project = (ROOT / "project.yml").read_text()
    build = re.search(r'CURRENT_PROJECT_VERSION: "([^"]+)"', project)[1]
    minimum = re.search(r'MACOSX_DEPLOYMENT_TARGET: "([^"]+)"', project)[1]
    resources = ROOT / "Nightshift Extension/Resources"
    version = json.loads((resources / "manifest.json").read_text())["version"]
    with tempfile.TemporaryDirectory(prefix="nightshift-store-verify-") as temporary:
        expanded = Path(temporary) / "expanded"
        run("pkgutil", "--expand-full", package, expanded)
        apps = list(expanded.rglob("Nightshift.app"))
        require(len(apps) == 1, "The package must contain exactly one Nightshift app")
        app = apps[0]
        extension = app / "Contents/PlugIns/Nightshift Extension.appex"
        require(extension.is_dir(), "The Safari extension is missing")
        run("codesign", "--verify", "--deep", "--strict", app)
        for bundle in [app, extension]:
            info = plistlib.loads((bundle / "Contents/Info.plist").read_bytes())
            require(info["CFBundleShortVersionString"] == version and info["CFBundleVersion"] == build,
                    "Exported versions do not match the workspace")
            require(info["LSMinimumSystemVersion"] == minimum, "Exported OS requirement does not match the project")
            require(not info.get("NightshiftUnsignedBeta"), "A testing beta cannot be submitted to the App Store")
            binary = bundle / "Contents/MacOS" / info["CFBundleExecutable"]
            require(set(run("lipo", "-archs", binary).split()) == {"arm64", "x86_64"},
                    "Both app and extension must be universal")
            require(not list((bundle / "Contents/MacOS").glob("*.debug.dylib")), "Debug binaries must not ship")
            details = run("codesign", "-d", "--verbose=2", bundle)
            require(f"TeamIdentifier={TEAM}" in details, "Signing team mismatch")
            require(f"Authority=Apple Distribution: Fly Media LLC ({TEAM})" in details or
                    f"Authority=3rd Party Mac Developer Application: Fly Media LLC ({TEAM})" in details,
                    "App Store binaries require store distribution signing")
            result = subprocess.run(["codesign", "-d", "--entitlements", "-", "--xml", str(bundle)],
                                    check=True, capture_output=True)
            claims = plistlib.loads(result.stdout)
            require(claims.get("com.apple.security.app-sandbox") is True, "Sandbox entitlement missing")
            require(not claims.get("com.apple.security.get-task-allow"), "Debugger entitlement must not ship")
        shipped = extension / "Contents/Resources"
        for source in resources.iterdir():
            if not source.is_file():
                continue
            require((shipped / source.name).is_file(), f"Missing bundled resource: {source.name}")
            require(hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256((shipped / source.name).read_bytes()).digest(),
                    f"Bundled resource differs from current source: {source.name}")
        privacy = plistlib.loads((shipped / "PrivacyInfo.xcprivacy").read_bytes())
        require(not privacy["NSPrivacyTracking"] and not privacy["NSPrivacyCollectedDataTypes"], "Unexpected data collection declaration")
        require(any(item["NSPrivacyAccessedAPIType"] == "NSPrivacyAccessedAPICategoryUserDefaults" and
                    "CA92.1" in item["NSPrivacyAccessedAPITypeReasons"] for item in privacy["NSPrivacyAccessedAPITypes"]),
                "The UserDefaults migration requires its approved privacy reason")
    print(f"Verified App Store package {version} ({build}): installer and app signatures, team, sandbox, universal binaries, OS requirement, privacy, and exact workspace resources")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    args = parser.parse_args()
    verify(args.package.resolve())
