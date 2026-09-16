.PHONY: setup check test smoke build build-project analyze verify open clean

DERIVED_DATA := .build/DerivedData

setup:
	@command -v xcodegen >/dev/null || (echo "XcodeGen is required: brew install xcodegen" && exit 1)
	xcodegen generate

check:
	npm run check

test:
	npm test

smoke:
	npm run smoke

build: setup build-project

build-project:
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
