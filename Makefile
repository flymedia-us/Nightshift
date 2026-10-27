.PHONY: setup check test smoke build build-project analyze verify open clean test-packaging release beta app-store-archive app-store-export

DERIVED_DATA := .build/DerivedData
APP_STORE_ARCHIVE := .build/AppStore/Nightshift.xcarchive

setup:
	npm run generate:dark-sites
	@command -v xcodegen >/dev/null || (echo "XcodeGen is required: brew install xcodegen" && exit 1)
	xcodegen generate

check:
	npm run check

test:
	npm test
	$(MAKE) test-packaging

smoke:
	npm run smoke

build: setup build-project

build-project:
	npm run generate:dark-sites
	xcodebuild \
		-project Nightshift.xcodeproj \
		-scheme Nightshift \
		-configuration Debug \
		-derivedDataPath "$(DERIVED_DATA)" \
		CODE_SIGNING_ALLOWED=NO \
		build

analyze: setup
	xcodebuild \
		-project Nightshift.xcodeproj \
		-scheme Nightshift \
		-configuration Debug \
		-derivedDataPath "$(DERIVED_DATA)" \
		CODE_SIGNING_ALLOWED=NO \
		analyze

verify: check test build analyze

open: setup
	open Nightshift.xcodeproj

clean:
	xcodebuild -project Nightshift.xcodeproj -scheme Nightshift -derivedDataPath "$(DERIVED_DATA)" clean

release: setup
	python3 Scripts/package-nightshift.py

beta: setup
	python3 Scripts/package-nightshift.py --beta

# App Store distribution uses Apple's store signing/export flow, separately
# from Developer ID notarization and the explicitly unsigned testing beta.
app-store-archive: setup
	@test ! -e "$(APP_STORE_ARCHIVE)" || (echo "Preserve the existing App Store archive before replacing it." && exit 1)
	xcodebuild -project Nightshift.xcodeproj -scheme Nightshift -configuration Release \
		-destination 'generic/platform=macOS' -derivedDataPath .build/AppStore/DerivedData \
		-archivePath "$(APP_STORE_ARCHIVE)" 'ARCHS=arm64 x86_64' ONLY_ACTIVE_ARCH=NO \
		CODE_SIGN_IDENTITY='Apple Development' archive

app-store-export:
	xcodebuild -exportArchive -archivePath "$(APP_STORE_ARCHIVE)" \
		-exportOptionsPlist AppStore/ExportOptions.plist -exportPath .build/AppStore/Export \
		-allowProvisioningUpdates
	python3 Scripts/verify-app-store.py .build/AppStore/Export/Nightshift.pkg

test-packaging:
	PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s Tests -p "*_test.py"
