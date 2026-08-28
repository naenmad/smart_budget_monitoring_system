import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.user_service import USERNAME_REGEX, UserService


class TestUserValidation(unittest.TestCase):
    def test_username_regex_valid(self):
        self.assertIsNotNone(USERNAME_REGEX.match("admin"))
        self.assertIsNotNone(USERNAME_REGEX.match("budi_santoso"))
        self.assertIsNotNone(USERNAME_REGEX.match("user.123"))
        self.assertIsNotNone(USERNAME_REGEX.match("user-test"))

    def test_username_regex_invalid_spaces(self):
        # Spasi tidak diperbolehkan
        self.assertIsNone(USERNAME_REGEX.match("budi santoso"))
        self.assertIsNone(USERNAME_REGEX.match(" admin"))
        self.assertIsNone(USERNAME_REGEX.match("admin "))
        self.assertIsNone(USERNAME_REGEX.match("admin 123"))

    def test_username_regex_invalid_chars(self):
        self.assertIsNone(USERNAME_REGEX.match("user@123"))
        self.assertIsNone(USERNAME_REGEX.match("user#name"))
        self.assertIsNone(USERNAME_REGEX.match("ab"))       # min 3 chars
        self.assertIsNone(USERNAME_REGEX.match("a" * 31))   # max 30 chars


if __name__ == "__main__":
    unittest.main()
