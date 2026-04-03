import pytest

from devagent.core.security import decrypt_data, encrypt_data


def test_encrypt_decrypt_roundtrip():
    secret = "a" * 32
    data = {"api_key": "secret-value", "count": 42}
    encrypted = encrypt_data(data, secret)
    assert encrypted != str(data)
    decrypted = decrypt_data(encrypted, secret)
    assert decrypted == data


def test_different_secrets_fail():
    encrypted = encrypt_data({"key": "val"}, "a" * 32)
    with pytest.raises(Exception):
        decrypt_data(encrypted, "b" * 32)
