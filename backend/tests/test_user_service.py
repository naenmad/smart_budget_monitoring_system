import pytest
from services.user_service import USERNAME_REGEX, UserService

class TestUserValidation:
    def test_username_regex_valid(self):
        assert USERNAME_REGEX.match("admin") is not None
        assert USERNAME_REGEX.match("budi_santoso") is not None
        assert USERNAME_REGEX.match("user.123") is not None
        assert USERNAME_REGEX.match("user-test") is not None

    def test_username_regex_invalid_spaces(self):
        # Spasi tidak diperbolehkan
        assert USERNAME_REGEX.match("budi santoso") is None
        assert USERNAME_REGEX.match(" admin") is None
        assert USERNAME_REGEX.match("admin ") is None
        assert USERNAME_REGEX.match("admin 123") is None

    def test_username_regex_invalid_chars(self):
        assert USERNAME_REGEX.match("user@123") is None
        assert USERNAME_REGEX.match("user#name") is None
        assert USERNAME_REGEX.match("ab") is None # min 3 chars
        assert USERNAME_REGEX.match("a" * 31) is None # max 30 chars
