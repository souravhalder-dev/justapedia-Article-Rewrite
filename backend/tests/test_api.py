import pytest
import sys
import os
from starlette.testclient import TestClient

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "default_wiki_endpoint" in data

def test_audit_endpoint():
    sample_wikitext = (
        "{{Infobox book | name = Test }}\n"
        "The colourful theatre organised a festive event. He took the lift to his flat.\n"
        "<ref>Author, 2020</ref>"
    )
    response = client.post("/api/audit/run", json={"wikitext": sample_wikitext})
    assert response.status_code == 200
    data = response.json()
    assert data["total_issues"] >= 4
    assert data["spelling_count"] >= 2
    assert data["vocab_count"] >= 2
    assert len(data["sections"]) >= 1

def test_rewrite_process_conversion_mode():
    sample_wikitext = (
        "{{Infobox book | name = Test }}\n"
        "The colourful theatre organised an event. He travelled by lorry.\n"
        "<ref>Citation</ref>"
    )
    response = client.post("/api/rewrite/process", json={
        "wikitext": sample_wikitext,
        "mode": "american_conversion",
        "use_ai": False
    })
    assert response.status_code == 200
    data = response.json()
    revised = data["revised_wikitext"]
    assert "colorful" in revised
    assert "theater" in revised
    assert "organized" in revised
    assert "truck" in revised
    # Templates and refs preserved exactly
    assert "{{Infobox book | name = Test }}" in revised
    assert "<ref>Citation</ref>" in revised
    assert data["validation"]["is_valid"] is True

def test_short_description_mode():
    sample_wikitext = "{{Short description|A colourful theatre guide}}\nProse..."
    response = client.post("/api/rewrite/process", json={
        "wikitext": sample_wikitext,
        "mode": "short_desc_improvement",
        "use_ai": False
    })
    assert response.status_code == 200
    data = response.json()
    assert "colorful" in data["revised_wikitext"]
    assert "theater" in data["revised_wikitext"]

def test_dry_run_save_no_conflict():
    response = client.post("/api/wiki/save", json={
        "title": "Test Page",
        "wikitext": "Some text",
        "summary": "Converted to American English",
        "is_dry_run": True,
        "endpoint": "https://justapedia.org/api.php"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_dry_run"] is True
    assert data["success"] is True

def test_fetch_article_from_justapedia():
    # Test real fetch from Justapedia API for Perfume (novel)
    response = client.post("/api/wiki/fetch", json={
        "title_or_url": "Perfume (novel)",
        "endpoint": "https://justapedia.org/api.php"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Perfume (novel)"
    assert data["pageid"] > 0
    assert len(data["wikitext"]) > 100
    assert data["revid"] is not None
