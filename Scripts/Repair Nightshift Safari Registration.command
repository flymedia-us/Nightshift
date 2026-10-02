#!/bin/bash
# Refresh this beta's per-user registration without changing Safari security settings.
set -eu

app='/Applications/Nightshift.app'
extension="$app/Contents/PlugIns/Nightshift Extension.appex"
registrar='/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'

if [[ ! -d "$app" || ! -d "$extension" ]]; then
    printf '%s\n' 'Move the new Nightshift.app into Applications before running this repair.' >&2
    exit 1
fi

for bundle in "$app" "$extension"; do
    signature=$(/usr/bin/codesign -dv --verbose=2 "$bundle" 2>&1)
    if [[ "$signature" != *'Signature=adhoc'* ]]; then
        printf '%s\n' 'This repair is for the unsigned Nightshift beta. The installed app uses a different signature.' >&2
        exit 1
    fi
done
/usr/bin/codesign --verify --deep --strict "$app"

"$registrar" -f "$app"
/usr/bin/pluginkit -r "$extension" >/dev/null 2>&1 || true
/usr/bin/pluginkit -a "$extension"

printf '%s\n' 'Nightshift registration refreshed.' 'Keep Safari open with Allow unsigned extensions enabled, then click Open Safari Extension Settings in Nightshift.'
