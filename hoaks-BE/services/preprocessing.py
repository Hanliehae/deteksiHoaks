# ============================================
# services/preprocessing.py — Pipeline Preprocessing
# ============================================
# Pipeline sesuai kode Colab:
# 1. Case folding (lowercase)
# 2. Remove URL
# 3. Remove mention (@) dan hashtag (#)
# 4. Remove simbol dan tanda baca
# 5. Remove kata leakage (hoaks, fakta, cek fakta, dll)
# 6. Trim whitespace
# ============================================

import re


# Kata-kata yang bisa menyebabkan leakage
# (model belajar dari kata-kata ini, bukan dari konten)
LEAKAGE_WORDS = [
    "hoaks", "hoax", "fakta", "cek fakta", "fact check",
    "disinformasi", "misinformasi", "tidak benar", "bohong",
    "palsu", "salah", "benar", "valid", "invalid",
    "turnbackhoax", "stophoax",
]


def case_folding(text: str) -> str:
    """Ubah semua huruf jadi lowercase."""
    return text.lower().strip()


def remove_urls(text: str) -> str:
    """Hapus semua URL (http, https, www)."""
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"www\.\S+", "", text)
    return text


def remove_mentions_hashtags(text: str) -> str:
    """Hapus mention (@user) dan hashtag (#topic)."""
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#\w+", "", text)
    return text


def remove_punctuation(text: str) -> str:
    """Hapus simbol dan tanda baca, sisakan huruf, angka, spasi."""
    return re.sub(r"[^\w\s]", "", text)


def remove_leakage_words(text: str) -> str:
    """Hapus kata-kata yang bisa menyebabkan data leakage."""
    for word in LEAKAGE_WORDS:
        text = re.sub(r"\b" + re.escape(word) + r"\b", "", text, flags=re.IGNORECASE)
    return text


def normalize_whitespace(text: str) -> str:
    """Normalize spasi berlebih."""
    return re.sub(r"\s+", " ", text).strip()


def preprocess_text(text: str) -> str:
    """
    Jalankan full pipeline preprocessing.
    Input: teks mentah
    Output: teks bersih siap untuk IndoBERT
    """
    if not text or not isinstance(text, str):
        return ""

    text = case_folding(text)
    text = remove_urls(text)
    text = remove_mentions_hashtags(text)
    text = remove_punctuation(text)
    text = remove_leakage_words(text)
    text = normalize_whitespace(text)
    return text


def preprocess_with_steps(text: str) -> dict:
    """
    Jalankan preprocessing dengan output tiap tahap.
    Digunakan untuk demo preprocessing di admin panel.

    Returns:
        dict dengan key: original, steps (list), final
    """
    if not text or not isinstance(text, str):
        return {"original": text, "steps": [], "final": ""}

    steps = []
    original = text

    # Step 1: Case folding
    text = case_folding(text)
    steps.append({
        "step": 1,
        "name": "Case Folding",
        "description": "Ubah semua huruf menjadi lowercase",
        "result": text,
    })

    # Step 2: Remove URLs
    text = remove_urls(text)
    steps.append({
        "step": 2,
        "name": "Remove URLs",
        "description": "Hapus semua link URL",
        "result": text,
    })

    # Step 3: Remove mentions & hashtags
    text = remove_mentions_hashtags(text)
    steps.append({
        "step": 3,
        "name": "Remove Mentions & Hashtags",
        "description": "Hapus @mention dan #hashtag",
        "result": text,
    })

    # Step 4: Remove punctuation
    text = remove_punctuation(text)
    steps.append({
        "step": 4,
        "name": "Remove Punctuation",
        "description": "Hapus simbol dan tanda baca",
        "result": text,
    })

    # Step 5: Remove leakage words
    text = remove_leakage_words(text)
    steps.append({
        "step": 5,
        "name": "Remove Leakage Words",
        "description": "Hapus kata yang bisa menyebabkan kebocoran data (hoaks, fakta, dll)",
        "result": text,
    })

    # Step 6: Normalize whitespace
    text = normalize_whitespace(text)
    steps.append({
        "step": 6,
        "name": "Normalize Whitespace",
        "description": "Rapikan spasi berlebih",
        "result": text,
    })

    return {
        "original": original,
        "steps": steps,
        "final": text,
    }
