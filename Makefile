.PHONY: setup build open clean

DERIVED_DATA := .build/DerivedData

setup:
	@command -v xcodegen >/dev/null || (echo "XcodeGen is required: brew install xcodegen" && exit 1)
	xcodegen generate

build: setup
	xcodebuild \
		-project Nightshift.xcodeproj \
		-scheme Nightshift \
		-configuration Debug \
		-derivedDataPath "$(DERIVED_DATA)" \
		CODE_SIGNING_ALLOWED=NO \
		build

open: setup
	open Nightshift.xcodeproj

clean:
	xcodebuild -project Nightshift.xcodeproj -scheme Nightshift clean

