"""Regression checks for safe release handoffs; no Apple tools or credentials needed."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("nightshift_package", Path(__file__).parents[1] / "Scripts/package-nightshift.py")
packaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packaging)


class PackagingTests(unittest.TestCase):
    def test_missing_notarization_credentials_cannot_build_or_publish_a_release(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "Nightshift.app"
            with patch.object(packaging, "run") as apple_tool:
                with self.assertRaisesRegex(RuntimeError, "notarized release requires"):
                    packaging.package(output=output)
                apple_tool.assert_not_called()
            self.assertFalse(output.exists())
            self.assertFalse(output.with_suffix(".zip").exists())

    def test_development_identity_cannot_substitute_for_release_identity(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "Nightshift.app"
            with patch.object(packaging, "run", return_value='Apple Development: Test (TEST)') as apple_tool:
                with self.assertRaisesRegex(RuntimeError, "Developer ID identity is unavailable"):
                    packaging.package(profile="configured-profile", output=output)
                self.assertEqual(apple_tool.call_count, 1)
            self.assertFalse(output.exists())

    def test_a_new_beta_cannot_overwrite_an_existing_app_or_transfer_archive(self):
        for existing_is_zip in [False, True]:
            with self.subTest(existing_is_zip=existing_is_zip), tempfile.TemporaryDirectory() as folder:
                output = Path(folder) / "Nightshift.app"
                existing = output.with_suffix(".zip") if existing_is_zip else output
                existing.write_bytes(b"preserve this old version")
                with patch.object(packaging, "run") as apple_tool:
                    with self.assertRaisesRegex(RuntimeError, "Output already exists"):
                        packaging.package(beta=True, output=output)
                    apple_tool.assert_not_called()
                self.assertEqual(existing.read_bytes(), b"preserve this old version")


if __name__ == "__main__":
    unittest.main()
