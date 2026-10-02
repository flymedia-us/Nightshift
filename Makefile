.PHONY: setup check test smoke build build-project analyze verify open clean test-native test-packaging release beta

DERIVED_DATA := .build/DerivedData

setup:
	npm run generate:dark-sites
	@command -v xcodegen >/dev/null || (echo "XcodeGen is required: brew install xcodegen" && exit 1)
	xcodegen generate

check:
	npm run check

test:
	npm test
	$(MAKE) test-native
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

test-native:
	mkdir -p .build/native-tests
	xcrun swiftc -module-cache-path .build/native-tests/ModuleCache "Nightshift Extension/SharedSettings.swift" Tests/native-settings/main.swift -o .build/native-tests/settings-tests
	.build/native-tests/settings-tests

release: setup
	python3 Scripts/package-nightshift.py

beta: setup
	python3 Scripts/package-nightshift.py --beta

test-packaging:
	PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s Tests -p "*_test.py"
