import os  # Supply temporary process settings for the tests.
import tempfile  # Keep fake credentials away from the real .env file.
import unittest  # Use Python's built-in test runner.
from pathlib import Path  # Write a temporary settings file.
from unittest.mock import patch  # Point the backend at our test file.
from fastapi import HTTPException  # Check readable configuration errors.
from backend import main  # Test the same settings loader used during analysis.

class SettingsTests(unittest.TestCase):  # Cover the configuration failures behind the 503.
    def setUp(self):  # Give each test its own isolated file.
        directory = tempfile.TemporaryDirectory()  # Create a disposable folder.
        self.addCleanup(directory.cleanup)  # Remove only this temporary test folder afterward.
        self.path = Path(directory.name) / ".env"  # Keep the real key untouched.
        file_patch = patch.object(main, "ENV_FILE", self.path)  # Use our fake settings during the test.
        file_patch.start()  # Activate the file substitution.
        self.addCleanup(file_patch.stop)  # Restore the original path afterward.
        environment_patch = patch.dict(os.environ, {}, clear=True)  # Avoid inheriting any real credentials.
        environment_patch.start()  # Isolate process settings too.
        self.addCleanup(environment_patch.stop)  # Restore the environment after the test.

    def test_file_edits_replace_old_settings(self):  # Reproduce changing a key while the server stays running.
        os.environ["GEMINI_API_KEY"] = "stale-test-key"  # Simulate an outdated terminal setting.
        self.path.write_text("GEMINI_API_KEY=first-test-key\n", encoding="utf-8")  # Save an initial fake key.
        self.assertEqual(main.read_settings(), ("first-test-key", "gemini-3.5-flash-lite"))  # Prefer the root file.
        self.path.write_text("GEMINI_API_KEY=second-test-key\nGEMINI_MODEL=another-model\n", encoding="utf-8")  # Edit both settings.
        self.assertEqual(main.read_settings(), ("second-test-key", "another-model"))  # Pick up changes without restarting.

    def test_bad_keys_explain_the_problem(self):  # Check missing keys and comments stuck to values.
        for value in ("", "your_gemini_api_key_here", "fake-key#comment", "fake key"):  # Use only fake credentials.
            with self.subTest(value=value):  # Report which invalid form failed.
                self.path.write_text(f"GEMINI_API_KEY={value}\n", encoding="utf-8")  # Save the malformed value.
                with self.assertRaises(HTTPException) as caught:  # Require a controlled configuration error.
                    main.read_settings()  # Run the production settings reader.
                self.assertEqual(caught.exception.status_code, 503)  # Keep the local failure distinguishable.
                self.assertIn("GEMINI_API_KEY", caught.exception.detail)  # Point the user at the correct setting.

    def test_windows_bom_and_separate_comments(self):  # Support typical Windows file encodings.
        self.path.write_text("# A separate comment\nGEMINI_API_KEY=fake-key\n", encoding="utf-8-sig")  # Save a BOM-prefixed file.
        self.assertEqual(main.read_settings()[0], "fake-key")  # Read the key without including the BOM.

    def test_environment_fallback_without_file(self):  # Keep deployment environment variables supported.
        os.environ["GEMINI_API_KEY"] = "environment-test-key"  # Supply a fake key outside the file.
        self.assertEqual(main.read_settings()[0], "environment-test-key")  # Use it when .env is absent.

    def test_blank_model_is_rejected(self):  # Avoid passing an empty model name to Gemini.
        self.path.write_text("GEMINI_API_KEY=fake-key\nGEMINI_MODEL=\n", encoding="utf-8")  # Save a blank model.
        with self.assertRaises(HTTPException) as caught:  # Expect a useful configuration error.
            main.read_settings()  # Validate both settings.
        self.assertIn("GEMINI_MODEL", caught.exception.detail)  # Explain the setting that needs fixing.

if __name__ == "__main__":  # Allow running this test file directly as a module.
    unittest.main()  # Run the regression checks.
