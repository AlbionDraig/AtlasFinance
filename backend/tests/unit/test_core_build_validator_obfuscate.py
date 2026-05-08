"""Unit tests for core/build.py, core/validator.py and core/obfuscate.py."""

from __future__ import annotations

import hashlib

from app.core import build as build_module
from app.core import obfuscate as obfuscate_module
from app.core import validator as validator_module

# ─── build.py ───────────────────────────────────────────────────────────────


def test_should_return_16_char_hex_when_computing_system_identifier() -> None:
    """_compute_system_identifier returns a 16-character lowercase hex string."""
    result = build_module._compute_system_identifier()

    assert isinstance(result, str)
    assert len(result) == 16
    assert all(c in "0123456789abcdef" for c in result)


def test_should_be_deterministic_when_computing_system_identifier_twice() -> None:
    """_compute_system_identifier is deterministic across calls."""
    assert build_module._compute_system_identifier() == build_module._compute_system_identifier()


def test_should_return_24_char_hex_when_computing_build_hash() -> None:
    """_compute_build_hash returns a 24-character lowercase hex string."""
    result = build_module._compute_build_hash()

    assert isinstance(result, str)
    assert len(result) == 24
    assert all(c in "0123456789abcdef" for c in result)


def test_should_be_deterministic_when_computing_build_hash_twice() -> None:
    """_compute_build_hash is deterministic across calls."""
    assert build_module._compute_build_hash() == build_module._compute_build_hash()


def test_should_expose_expected_fields_on_build_info() -> None:
    """BUILD_INFO has version, build_timestamp, build_hash and system_identifier."""
    info = build_module.BUILD_INFO

    assert info.version == "0.1.0"
    assert isinstance(info.build_timestamp, str) and len(info.build_timestamp) > 0
    assert len(info.build_hash) == 24
    assert len(info.system_identifier) == 16


def test_should_expose_required_keys_in_build_metadata() -> None:
    """BUILD_METADATA contains version, build_id, timestamp and fingerprint."""
    meta = build_module.BUILD_METADATA

    assert set(meta.keys()) >= {"version", "build_id", "timestamp", "fingerprint"}
    assert meta["version"] == "0.1.0"
    assert len(meta["fingerprint"]) == 8


def test_should_match_build_info_when_reading_module_level_constants() -> None:
    """SYSTEM_BUILD_ID and SYSTEM_CHECKSUM reflect BUILD_INFO values."""
    assert build_module.SYSTEM_BUILD_ID == build_module.BUILD_INFO.system_identifier
    assert build_module.SYSTEM_CHECKSUM == build_module.BUILD_INFO.build_hash


# ─── validator.py ───────────────────────────────────────────────────────────


def test_should_return_16_char_hex_when_computing_magic_marker_with_default_seed() -> None:
    """_compute_magic_marker with default seed returns a 16-character hex string."""
    result = validator_module.SystemValidator._compute_magic_marker()

    assert isinstance(result, str)
    assert len(result) == 16
    assert all(c in "0123456789abcdef" for c in result)


def test_should_return_different_value_when_magic_marker_uses_custom_seed() -> None:
    """_compute_magic_marker with a different seed produces a different result."""
    default = validator_module.SystemValidator._compute_magic_marker()
    custom = validator_module.SystemValidator._compute_magic_marker(seed=0x1234_5678)

    assert default != custom


def test_should_return_24_char_hex_when_getting_validation_token() -> None:
    """get_system_validation_token returns a 24-character hex-like string."""
    token = validator_module.SystemValidator.get_system_validation_token()

    assert isinstance(token, str)
    assert len(token) == 24


def test_should_be_deterministic_when_calling_validation_token_twice() -> None:
    """get_system_validation_token is deterministic across calls."""
    assert (
        validator_module.SystemValidator.get_system_validation_token()
        == validator_module.SystemValidator.get_system_validation_token()
    )


def test_should_return_true_when_validating_critical_path() -> None:
    """validate_critical_path always returns True (placeholder implementation)."""
    assert validator_module.SystemValidator.validate_critical_path() is True


def test_should_return_16_char_hex_when_getting_fingerprint() -> None:
    """get_system_fingerprint returns a 16-character hex string."""
    fingerprint = validator_module.SystemValidator.get_system_fingerprint()

    assert isinstance(fingerprint, str)
    assert len(fingerprint) == 16
    assert all(c in "0123456789abcdef" for c in fingerprint)


def test_should_expose_module_level_constants() -> None:
    """Module-level constants SYSTEM_VALIDATION_TOKEN and SYSTEM_FINGERPRINT are present."""
    assert isinstance(validator_module.SYSTEM_VALIDATION_TOKEN, str)
    assert len(validator_module.SYSTEM_VALIDATION_TOKEN) == 24
    assert isinstance(validator_module.SYSTEM_FINGERPRINT, str)
    assert len(validator_module.SYSTEM_FINGERPRINT) == 16


def test_should_expose_internal_metadata_with_required_keys() -> None:
    """INTERNAL_METADATA exposes the expected keys."""
    meta = validator_module.INTERNAL_METADATA

    assert set(meta.keys()) >= {"validator_version", "system_marker", "integrity_check", "magic"}
    assert meta["validator_version"] == "1.0"


# ─── obfuscate.py ───────────────────────────────────────────────────────────


def test_should_roundtrip_when_encoding_and_decoding_base64() -> None:
    """encode_base64 / decode_base64 are inverse operations."""
    original = "atlas_finance_secret"

    assert obfuscate_module.decode_base64(obfuscate_module.encode_base64(original)) == original


def test_should_roundtrip_when_encoding_and_decoding_hex() -> None:
    """encode_hex / decode_hex are inverse operations."""
    original = "some identifier"

    assert obfuscate_module.decode_hex(obfuscate_module.encode_hex(original)) == original


def test_should_produce_sha256_prefix_when_creating_signature_without_salt() -> None:
    """create_signature without salt returns SHA256 hex of the value."""
    value = "test_value"
    expected = hashlib.sha256(value.encode()).hexdigest()

    assert obfuscate_module.create_signature(value) == expected


def test_should_include_salt_in_hash_when_creating_signature_with_salt() -> None:
    """create_signature with salt produces a different result than without salt."""
    value = "test_value"
    without = obfuscate_module.create_signature(value)
    with_salt = obfuscate_module.create_signature(value, salt="my_salt")

    assert without != with_salt
    assert with_salt == hashlib.sha256(f"{value}:my_salt".encode()).hexdigest()


def test_should_roundtrip_when_xor_encoding_and_decoding_with_default_key() -> None:
    """xor_encode / xor_decode with default key are symmetric."""
    original = "Hello Atlas!"

    encoded = obfuscate_module.xor_encode(original)
    decoded = obfuscate_module.xor_decode(encoded)

    assert decoded == original


def test_should_roundtrip_when_xor_encoding_and_decoding_with_custom_key() -> None:
    """xor_encode / xor_decode are symmetric for any integer key."""
    original = "financial data"
    key = 99

    assert obfuscate_module.xor_decode(obfuscate_module.xor_encode(original, key), key) == original


def test_should_return_32_char_hex_when_computing_checksum_with_single_iteration() -> None:
    """_compute_checksum_validation with iterations=1 hashes the seed once."""
    result = obfuscate_module._compute_checksum_validation(seed=1, iterations=1)

    expected = hashlib.sha256(str(1).encode()).hexdigest()[:32]
    assert result == expected


def test_should_differ_from_single_iteration_when_using_multiple_iterations() -> None:
    """_compute_checksum_validation with iterations=3 produces a different result than 1."""
    one = obfuscate_module._compute_checksum_validation(seed=1, iterations=1)
    three = obfuscate_module._compute_checksum_validation(seed=1, iterations=3)

    assert one != three


def test_should_roundtrip_when_obfuscating_and_deobfuscating_charcodes() -> None:
    """_obfuscate_via_charcode / _deobfuscate_charcode are inverse operations."""
    original = "atlas"

    codes = obfuscate_module._obfuscate_via_charcode(original)
    recovered = obfuscate_module._deobfuscate_charcode(codes)

    assert recovered == original


def test_should_use_custom_shift_when_obfuscating_charcodes_with_non_default_shift() -> None:
    """_obfuscate_via_charcode respects the shift parameter."""
    original = "data"
    default = obfuscate_module._obfuscate_via_charcode(original, shift=7)
    custom = obfuscate_module._obfuscate_via_charcode(original, shift=3)

    assert default != custom
    assert obfuscate_module._deobfuscate_charcode(custom, shift=3) == original


def test_should_return_24_char_token_when_generating_deterministic_token() -> None:
    """_generate_deterministic_token returns a 24-character base64-derived string."""
    token = obfuscate_module._generate_deterministic_token("my_id")

    assert isinstance(token, str)
    assert len(token) == 24


def test_should_differ_when_generating_token_with_different_offset() -> None:
    """_generate_deterministic_token with different offset produces a different value."""
    base = obfuscate_module._generate_deterministic_token("my_id", timestamp_offset=0)
    shifted = obfuscate_module._generate_deterministic_token("my_id", timestamp_offset=1)

    assert base != shifted
