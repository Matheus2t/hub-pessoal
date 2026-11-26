from pathlib import Path

from pydantic_settings import SettingsConfigDict

from app.config import Settings, _ENV_FILE


def test_settings_env_file_is_anchored_to_backend_directory():
    expected = Path(__file__).resolve().parents[1] / ".env"
    assert _ENV_FILE == expected
    assert _ENV_FILE.is_absolute()


def test_settings_reads_values_from_an_explicit_env_file(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "MIND_SUPABASE_URL=http://127.0.0.1:54321\n"
        "MIND_GOOGLE_DRIVE_ENABLED=true\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("MIND_SUPABASE_URL", raising=False)
    monkeypatch.delenv("MIND_GOOGLE_DRIVE_ENABLED", raising=False)

    class EnvFileSettings(Settings):
        model_config = SettingsConfigDict(env_file=env_file)

    loaded = EnvFileSettings()
    assert loaded.mind_supabase_url == "http://127.0.0.1:54321"
    assert loaded.mind_google_drive_enabled is True
