"""Tests for agent.i18n -- catalog parity, fallback, language resolution."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from agent import i18n


LOCALES_DIR = Path(__file__).resolve().parents[2] / "locales"


def _load_raw(lang: str) -> dict:
    with (LOCALES_DIR / f"{lang}.yaml").open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _flatten(d, prefix="") -> dict:
    flat = {}
    for k, v in (d or {}).items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            flat.update(_flatten(v, key))
        else:
            flat[key] = v
    return flat


# ---------------------------------------------------------------------------
# Catalog completeness -- this is the key invariant test.  If someone adds a
# new key to en.yaml they MUST add it to every other locale, else runtime
# falls back to English for those users and defeats the feature.
# ---------------------------------------------------------------------------



@pytest.mark.parametrize("lang", [l for l in i18n.SUPPORTED_LANGUAGES if l != "en"])
def test_catalog_keys_match_english(lang: str):
    """Every non-English catalog must have exactly the same key set as English."""
    en_keys = set(_flatten(_load_raw("en")).keys())
    lang_keys = set(_flatten(_load_raw(lang)).keys())
    missing = en_keys - lang_keys
    extra = lang_keys - en_keys
    assert not missing, f"{lang}.yaml missing keys: {sorted(missing)}"
    assert not extra, f"{lang}.yaml has keys not in en.yaml: {sorted(extra)}"


@pytest.mark.parametrize("lang", list(i18n.SUPPORTED_LANGUAGES))
def test_catalog_placeholders_match_english(lang: str):
    """Every translated value must use the same {placeholder} tokens as English.

    A mistranslated placeholder (e.g. ``{description}`` typoed as ``{descricao}``)
    would either raise KeyError at runtime or silently drop the interpolated
    value.  Pin parity at the test layer.
    """
    import re
    placeholder_re = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")
    en_flat = _flatten(_load_raw("en"))
    lang_flat = _flatten(_load_raw(lang))
    for key, en_value in en_flat.items():
        en_placeholders = set(placeholder_re.findall(en_value))
        lang_value = lang_flat.get(key, "")
        lang_placeholders = set(placeholder_re.findall(lang_value))
        assert en_placeholders == lang_placeholders, (
            f"{lang}.yaml key={key!r}: placeholders {lang_placeholders} "
            f"don't match English {en_placeholders}"
        )


def test_simplified_chinese_localizes_gateway_context_and_status_copy():
    """High-traffic gateway diagnostics must not fall through to English."""
    assert i18n.t("gateway.context.header", lang="zh") == "🧠 **上下文窗口**"
    assert i18n.t("gateway.context.model", lang="zh", model="gpt") == "模型：`gpt`"
    assert i18n.t("gateway.context.window", lang="zh", total=4096) == "窗口：4096 个词元"
    assert i18n.t("gateway.context.in_use", lang="zh", used=12, total=100, pct=12) == "已使用：12 / 100（12%）"
    assert i18n.t("gateway.context.headroom", lang="zh", headroom=88) == "距离上限还剩：88 个词元"
    assert i18n.t("gateway.context.compressions", lang="zh", count=3) == "本会话压缩次数：3"
    assert i18n.t("gateway.context.totals_header", lang="zh", calls=4) == "会话总计（累计 4 次 API 调用）"
    assert i18n.t("gateway.context.estimated", lang="zh", count=1200, messages=8) == "估计上下文：约 1200 个词元，分布在 8 条消息中"
    assert i18n.t("gateway.status.matrix_scope_header", lang="zh") == "**Matrix 作用域：**"
    assert i18n.t("gateway.status.matrix_scope_room", lang="zh", room="room-a") == "  房间：room-a"
    assert i18n.t("gateway.status.matrix_scope_room_id", lang="zh", room_id="r1") == "  房间 ID：r1"
    assert i18n.t("gateway.status.matrix_scope_thread", lang="zh", thread_id="t1") == "  线程 ID：t1"
    assert i18n.t("gateway.status.matrix_scope_mode", lang="zh", scope="room") == "  会话作用域：room"
    assert i18n.t("gateway.status.matrix_scope_key", lang="zh", session_key="k1") == "  会话键：k1"
    assert i18n.t("gateway.status.model", lang="zh", model="gpt") == "**模型：** `gpt`"
    assert i18n.t("gateway.status.model_provider", lang="zh", model="gpt", provider="OpenAI") == "**模型：** `gpt`（OpenAI）"
    assert i18n.t("gateway.status.context", lang="zh", used=12, total=100, pct=12) == "**上下文：** 12 / 100（12%）"
    assert i18n.t("gateway.status.context_used", lang="zh", used=12) == "**上下文：** 约 12 个词元"
    assert i18n.t("gateway.status.tokens", lang="zh", tokens=500) == "**累计计费词元：** 500 _（不是当前上下文大小；使用 `/context` 查看）_"


# ---------------------------------------------------------------------------
# Language resolution
# ---------------------------------------------------------------------------











def test_default_when_nothing_set(monkeypatch):
    """With no env var and no config override, falls back to English."""
    monkeypatch.delenv("HERMES_LANGUAGE", raising=False)
    # Force config lookup to return None -- patch the cached reader.
    i18n.reset_language_cache()
    monkeypatch.setattr(i18n, "_config_language_cached", lambda: None)
    assert i18n.get_language() == "en"


# ---------------------------------------------------------------------------
# t() semantics
# ---------------------------------------------------------------------------







def test_t_missing_key_in_non_english_falls_back_to_english(tmp_path, monkeypatch):
    """If a key exists in English but not in the target locale, fall back."""
    # Stand up a fake incomplete locale under a temp locales dir.
    fake_locales = tmp_path / "locales"
    fake_locales.mkdir()
    (fake_locales / "en.yaml").write_text("foo: English Foo\n", encoding="utf-8")
    (fake_locales / "zh.yaml").write_text("# intentionally empty\n", encoding="utf-8")
    monkeypatch.setattr(i18n, "_locales_dir", lambda: fake_locales)
    i18n.reset_language_cache()
    try:
        assert i18n.t("foo", lang="zh") == "English Foo"
    finally:
        # Clear the cache on teardown so subsequent tests don't see the
        # fake "foo: English Foo" catalog instead of the real locales/*.yaml.
        i18n.reset_language_cache()




# ---------------------------------------------------------------------------
# _locales_dir resolution ladder -- regression for #23943 / #27632 / #35374.
# Sealed installs (Nix store venv, pip wheel) have no source tree next to
# agent/, so _locales_dir must resolve via env override or the data scheme.
# ---------------------------------------------------------------------------



def test_locales_dir_env_override_ignored_when_missing(tmp_path, monkeypatch):
    """A bogus HERMES_BUNDLED_LOCALES falls through to source/wheel resolution
    instead of returning a path that doesn't exist."""
    monkeypatch.setenv("HERMES_BUNDLED_LOCALES", str(tmp_path / "does-not-exist"))
    result = i18n._locales_dir()
    assert result != tmp_path / "does-not-exist"
    # In a source checkout this is the repo-root locales dir.
    assert result.name == "locales"

