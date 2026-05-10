# ============================================
# services/scraper.py — Ekstrak Teks dari URL
# ============================================

import trafilatura
import requests
from bs4 import BeautifulSoup


def scrape_url(url: str) -> dict:
    """
    Ekstrak headline dan isi berita dari URL.

    Args:
        url: URL berita (misal https://www.kompas.com/...)

    Returns:
        {"headline": "...", "content": "...", "source": "kompas.com"}
        atau {"error": "..."} jika gagal
    """
    try:
        # Download halaman
        downloaded = trafilatura.fetch_url(url)

        if not downloaded:
            # Fallback: pakai requests + BeautifulSoup
            return _scrape_with_bs4(url)

        # Ekstrak teks utama
        content = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )

        if not content:
            return _scrape_with_bs4(url)

        # Ekstrak metadata (judul)
        metadata = trafilatura.extract(
            downloaded,
            output_format="json",
            include_comments=False,
        )

        headline = ""
        if metadata:
            import json
            try:
                meta_dict = json.loads(metadata)
                headline = meta_dict.get("title", "")
            except (json.JSONDecodeError, TypeError):
                pass

        # Fallback headline dari HTML jika kosong
        if not headline:
            headline = _extract_title_bs4(downloaded)

        # Ekstrak domain sebagai source
        from urllib.parse import urlparse
        source = urlparse(url).netloc

        return {
            "headline": headline.strip(),
            "content": content.strip(),
            "source": source,
        }

    except Exception as e:
        return {"error": f"Gagal mengekstrak URL: {str(e)}"}


def _scrape_with_bs4(url: str) -> dict:
    """Fallback scraper menggunakan BeautifulSoup."""
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Ambil judul
        headline = ""
        title_tag = soup.find("title")
        if title_tag:
            headline = title_tag.get_text(strip=True)

        # Ambil konten dari paragraf
        paragraphs = soup.find_all("p")
        content = " ".join(
            p.get_text(strip=True) for p in paragraphs
            if len(p.get_text(strip=True)) > 30
        )

        if not content:
            return {"error": "Tidak dapat mengekstrak konten dari URL"}

        from urllib.parse import urlparse
        source = urlparse(url).netloc

        return {
            "headline": headline,
            "content": content,
            "source": source,
        }

    except requests.exceptions.RequestException as e:
        return {"error": f"Gagal mengakses URL: {str(e)}"}


def _extract_title_bs4(html: str) -> str:
    """Ekstrak title dari HTML string."""
    try:
        soup = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("title")
        return title_tag.get_text(strip=True) if title_tag else ""
    except Exception:
        return ""
