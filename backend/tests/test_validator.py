import pytest
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.validator import WikitextValidator

def test_validator_detects_unclosed_template():
    validator = WikitextValidator()
    orig = "{{Infobox book | name = Test}}\nProse content."
    broken = "{{Infobox book | name = Test\nProse content."
    
    res = validator.validate(orig, broken)
    assert res["is_valid"] is False
    assert any(w["category"] == "template" and w["severity"] == "error" for w in res["warnings"])

def test_validator_detects_unclosed_wikilink():
    validator = WikitextValidator()
    orig = "This is a [[link]] to something."
    broken = "This is a [[link to something."
    
    res = validator.validate(orig, broken)
    assert res["is_valid"] is False
    assert any(w["category"] == "link" and w["severity"] == "error" for w in res["warnings"])

def test_validator_detects_missing_ref():
    validator = WikitextValidator()
    orig = "Fact supported here.<ref>Source 1</ref> Another fact.<ref>Source 2</ref>"
    revised = "Fact supported here. Another fact.<ref>Source 2</ref>" # Source 1 accidentally removed
    
    res = validator.validate(orig, revised)
    assert any(w["category"] == "reference" and "changed" in w["message"] for w in res["warnings"])

def test_validator_passes_valid_transformation():
    validator = WikitextValidator()
    orig = "{{Infobox book}}\nThe colourful theatre was organised.<ref>Source</ref>"
    rev = "{{Infobox book}}\nThe colorful theater was organized.<ref>Source</ref>"
    
    res = validator.validate(orig, rev)
    assert res["is_valid"] is True
    assert len(res["warnings"]) == 0
