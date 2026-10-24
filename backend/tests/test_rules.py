import pytest
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.rules_engine import RulesEngine
from app.core.parser import WikitextProcessor

def test_spelling_conversion():
    engine = RulesEngine()
    text = "The colourful theatre was organised by the local centre."
    rewritten, findings = engine.apply_rewrite(text)
    
    assert "colorful" in rewritten
    assert "theater" in rewritten
    assert "organized" in rewritten
    assert "center" in rewritten
    assert len(findings) >= 4

def test_casing_preservation():
    engine = RulesEngine()
    text = "COLOUR, Colour, and colour are all variants."
    rewritten, findings = engine.apply_rewrite(text)
    
    assert "COLOR" in rewritten
    assert "Color" in rewritten
    assert "color" in rewritten

def test_vocabulary_conversion():
    engine = RulesEngine()
    text = "He took the lift up to his flat after studying maths in the autumn."
    rewritten, findings = engine.apply_rewrite(text)
    
    assert "elevator" in rewritten
    assert "apartment" in rewritten
    assert "math" in rewritten
    assert "fall" in rewritten

def test_lorry_and_petrol():
    engine = RulesEngine()
    text = "The lorry ran out of petrol near the car park."
    rewritten, findings = engine.apply_rewrite(text)
    
    assert "truck" in rewritten
    assert "gasoline" in rewritten
    assert "parking lot" in rewritten

def test_selective_accept_reject():
    engine = RulesEngine()
    text = "The organisation coloured the walls."
    findings = engine.audit_text(text)
    assert len(findings) == 2
    
    # Accept only the first finding (organisation -> organization)
    rewritten, _ = engine.apply_rewrite(text, accepted_finding_ids=[findings[0].id])
    assert "organization" in rewritten
    assert "coloured" in rewritten # Not accepted, so kept as coloured

def test_punctuation_and_serial_comma():
    engine = RulesEngine()
    text = 'He said "peace", and then bought apples, oranges and bananas.'
    findings = engine.audit_text(text)
    
    categories = [f.category for f in findings]
    assert "punctuation" in categories or "style" in categories
