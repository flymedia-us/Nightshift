#!/usr/bin/env python3
"""Package a notarized release or an explicitly unsigned Safari beta.

Never hand off an unnotarized Developer ID build as a portable release.
"""
import argparse
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
IDENTITY = "120D2200993750D65F7CC0BC117EDE47DEA94AEC"
TEAM = "BJZSH247Q9"
EXTENSION = Path("Contents/PlugIns/Nightshift Extension.appex")


def run(*args, capture=False):
    result = subprocess.run([str(arg) for arg in args], cwd=ROOT, check=True,
                            text=True, capture_output=capture)
    return result.stdout if capture else None


def entitlements(bundle):
    result = run("codesign", "-d", "--entitlements", "-", "--xml", bundle, capture=True)
    return plistlib.loads(result.encode())


def verify(bundle, beta=False):
    run("codesign", "--verify", "--deep", "--strict", bundle)
    extension = bundle / EXTENSION
    with (bundle / "Contents/Info.plist").open("rb") as file:
        app_info = plistlib.load(file)
    with (extension / "Contents/Info.plist").open("rb") as file:
        extension_info = plistlib.load(file)
    with (extension / "Contents/Resources/manifest.json").open() as file:
        manifest = json.load(file)
    versions = [app_info["CFBundleShortVersionString"], extension_info["CFBundleShortVersionString"], manifest["version"]]
    if len(set(versions)) != 1 or app_info["CFBundleVersion"] != extension_info["CFBundleVersion"]:
        raise RuntimeError("App, extension, and manifest versions do not match")
    if extension_info["NSExtension"]["NSExtensionPointIdentifier"] != "com.apple.Safari.web-extension":
        raise RuntimeError("The app does not embed a Safari Web Extension")
    for item, info in [(bundle, app_info), (extension, extension_info)]:
        binary = item / "Contents/MacOS" / info["CFBundleExecutable"]
        architectures = set(run("lipo", "-archs", binary, capture=True).split())
        if not {"arm64", "x86_64"}.issubset(architectures):
            raise RuntimeError(f"{item.name} must support both Apple Silicon and Intel Macs")
        claims = entitlements(item)
        if claims.get("com.apple.security.app-sandbox") is not True:
            raise RuntimeError(f"{item.name} is missing its sandbox entitlement")
        if claims.get("com.apple.security.get-task-allow") is True:
            raise RuntimeError(f"{item.name} contains a debugger entitlement")
        signature = subprocess.run(["codesign", "-dv", "--verbose=2", str(item)],
                                   check=True, text=True, capture_output=True).stderr
        if beta:
            if "Signature=adhoc" not in signature or "Authority=" in signature:
                raise RuntimeError("Unsigned betas must be ad-hoc signed throughout, without Developer ID or development certificates")
            if (item / "Contents/embedded.provisionprofile").exists():
                raise RuntimeError("Unsigned betas must not contain a device-specific provisioning profile")
        elif "Authority=Developer ID Application: Fly Media LLC (BJZSH247Q9)" not in signature:
            raise RuntimeError("Releases must use the Fly Media Developer ID Application identity")
    if not beta:
        run("xcrun", "stapler", "validate", bundle)
        run("spctl", "--assess", "--type", "execute", "--verbose=2", bundle)
    return app_info


def package(beta=False, profile=None, output=None):
    output = Path(output or ROOT / ".build" / ("Beta" if beta else "Distribution") / "Nightshift.app").resolve()
    archive = output.with_suffix(".zip")
    if output.exists() or archive.exists():
        raise RuntimeError(f"Output already exists: {output} or {archive}; preserve it before building a replacement")
    if not beta:
        if not profile:
            raise RuntimeError("A notarized release requires NIGHTSHIFT_NOTARY_PROFILE or --notary-profile. Configure it with notarytool store-credentials. For the user's explicitly requested unsigned beta, use --beta; do not ship an unnotarized Developer ID app.")
        identities = run("security", "find-identity", "-v", "-p", "codesigning", capture=True)
        if IDENTITY not in identities:
            raise RuntimeError("The required Fly Media Developer ID identity is unavailable")
        # Authenticate before spending time building or touching the output.
        run("xcrun", "notarytool", "history", "--keychain-profile", profile, capture=True)

    (ROOT / ".build").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="nightshift-package-", dir=ROOT / ".build") as temporary:
        staging = Path(temporary)
        derived = staging / "DerivedData"
        build_log = staging / "build.log"
        command = ["xcodebuild", "-project", "Nightshift.xcodeproj", "-scheme", "Nightshift",
                   "-configuration", "Release", "-derivedDataPath", str(derived),
                   "ARCHS=arm64 x86_64", "ONLY_ACTIVE_ARCH=NO", "CODE_SIGNING_ALLOWED=NO", "build"]
        with build_log.open("w") as log:
            result = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            saved_log = ROOT / ".build" / "packaging-failure.log"
            shutil.copyfile(build_log, saved_log)
            raise RuntimeError(f"Xcode build failed; see {saved_log}")
        app = staging / "Nightshift.app"
        run("ditto", derived / "Build/Products/Release/Nightshift.app", app)
        if beta:
            info_path = app / "Contents/Info.plist"
            with info_path.open("rb") as file:
                beta_info = plistlib.load(file)
            beta_info["NightshiftUnsignedBeta"] = True
            with info_path.open("wb") as file:
                plistlib.dump(beta_info, file)
        # Sign from the inside out, with each executable's own entitlements.
        # The ad-hoc beta is Apple's unsigned-testing path, not a release.
        for item, claims in [(app / EXTENSION, ROOT / "Nightshift Extension/Nightshift_Extension.entitlements"),
                             (app, ROOT / "Nightshift/Nightshift.entitlements")]:
            embedded_profile = item / "Contents/embedded.provisionprofile"
            if embedded_profile.exists():
                embedded_profile.unlink()
            arguments = ["codesign", "--force", "--sign", "-" if beta else IDENTITY,
                         "--entitlements", str(claims)]
            if not beta:
                arguments += ["--timestamp", "--options", "runtime"]
            run(*arguments, item)
        run("codesign", "--verify", "--deep", "--strict", app)
        if not beta:
            submission = staging / "submission.zip"
            run("ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", app, submission)
            reply = json.loads(run("xcrun", "notarytool", "submit", submission,
                                   "--keychain-profile", profile, "--wait", "--output-format", "json", capture=True))
            if reply.get("status") != "Accepted":
                raise RuntimeError(f"Notarization did not succeed: {reply.get('status')}; submission {reply.get('id')}")
            run("xcrun", "stapler", "staple", app)
        info = verify(app, beta=beta)
        output.parent.mkdir(parents=True, exist_ok=True)
        # Prepare both deliverables before making either one available.
        packaged_zip = staging / "Nightshift.zip"
        if beta:
            transfer = staging / "Nightshift Beta"
            transfer.mkdir()
            run("ditto", app, transfer / "Nightshift.app")
            repair = transfer / "Repair Nightshift Safari Registration.command"
            shutil.copyfile(ROOT / "Scripts" / repair.name, repair)
            repair.chmod(0o755)
            instructions = transfer / "Nightshift Beta Instructions.txt"
            instructions.write_text(
                f"Nightshift {info['CFBundleShortVersionString']} (build {info['CFBundleVersion']}) — unsigned Safari testing beta\n\n"
                "1. Transfer Nightshift.zip to the other Mac and double-click it. Open the extracted Nightshift Beta folder, which contains the app, these instructions, and the registration repair.\n"
                "2. Quit Safari. Preserve your previous app, then move the new Nightshift.app into Applications. Replace the entire bundle.\n"
                "3. Open Applications/Nightshift.app. If macOS requires app approval, use System Settings > Privacy & Security for this app.\n"
                "4. Start Safari. Under Settings > Advanced, enable Show features for web developers if needed.\n"
                "5. Under Settings > Developer, enable Allow unsigned extensions. Do this after starting Safari: quitting Safari resets it.\n"
                "6. Return to Nightshift and click Open Safari Extension Settings.\n"
                "7. If Nightshift is missing, keep Safari open and double-click Repair Nightshift Safari Registration.command from the extracted folder. It refreshes only Nightshift's registration without changing any security settings. Then click the app's settings button again.\n"
                "8. Select Nightshift in Safari Extensions and enable it for the desired profiles and websites. After each Safari restart, repeat step 5, and step 7 if needed.\n\n"
                "This beta uses ad-hoc signatures on both the app and its embedded extension. It is intentionally not a Developer ID release.\n"
                "A normal public release requires Developer ID signing, notarization, and a stapled ticket.\n"
            )
            run("ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", transfer, packaged_zip)
            shutil.copyfile(repair, output.parent / repair.name)
            (output.parent / repair.name).chmod(0o755)
            shutil.copyfile(instructions, output.parent / instructions.name)
        else:
            run("ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", app, packaged_zip)
        run("ditto", app, output)
        shutil.copyfile(packaged_zip, archive)
        print(f"Created {'unsigned testing beta' if beta else 'notarized Developer ID release'} {info['CFBundleShortVersionString']} ({info['CFBundleVersion']}): {output}")
        print(f"Transfer archive: {archive}")
        if beta:
            print("Requires Safari Settings > Developer > Allow unsigned extensions after each Safari restart. This is not a public release.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--beta", action="store_true", help="Explicitly package the unsigned Safari testing build")
    parser.add_argument("--notary-profile", default=os.environ.get("NIGHTSHIFT_NOTARY_PROFILE"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--verify", type=Path, metavar="APP", help="Verify an existing deliverable against the selected release/beta requirements")
    args = parser.parse_args()
    try:
        if args.verify:
            info = verify(args.verify.resolve(), beta=args.beta)
            print(f"Verified {info['CFBundleShortVersionString']} ({info['CFBundleVersion']})")
        else:
            package(beta=args.beta, profile=args.notary_profile, output=args.output)
    except (RuntimeError, subprocess.CalledProcessError, OSError, ValueError) as error:
        print(f"Packaging failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
