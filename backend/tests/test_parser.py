import pytest
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.parser import WikitextProcessor, SectionInfo

def test_parser_roundtrip():
    processor = WikitextProcessor()
    sample = (
        "{{short description|A historical novel}}\n"
        "{{Infobox book\n"
        "| name = Perfume\n"
        "| author = Patrick Süskind\n"
        "}}\n"
        "The '''novel''' centres on a man with an extraordinary sense of smell. "
        "He travelled to [[Paris]] in the autumn to organise his flat, whilst admiring the colourful [[theatre]]. "
        'As he stated, "I colour my world with scent."\n'
        '<ref name="cite1">{{cite book |title=A Theatre Guide |year=1995}}</ref>\n\n'
        "== Background ==\n"
        "He lived in a flat near the [[centre|city centre]]. Members of the Labour Party visited the National Health Service.\n"
        '"This is a direct quotation with colour and honour."\n\n'
        "== References ==\n"
        "<references />\n"
        "[[Category:1985 novels]]\n"
    )

    masked, token_map = processor.mask_protected_tokens(sample)
    assert len(token_map) > 0
    # Ensure quotes are protected
    assert any('"I colour my world with scent."' in v for v in token_map.values())
    # Ensure template is protected
    assert any("Infobox book" in v for v in token_map.values())
    # Ensure proper noun Labour Party is protected
    assert any("Labour Party" in v for v in token_map.values())
    
    unmasked = processor.unmask_protected_tokens(masked, token_map)
    assert unmasked == sample

def test_sections_extraction():
    processor = WikitextProcessor()
    sample = (
        "Lead paragraph text.\n\n"
        "== First Section ==\n"
        "Content of first section.\n\n"
        "=== Sub Section ===\n"
        "Sub content.\n"
    )
    sections = processor.extract_sections(sample)
    assert len(sections) == 3
    assert sections[0].is_lead is True
    assert sections[0].title == "Lead Section"
    assert sections[1].title == "First Section"
    assert sections[1].level == 2
    assert sections[2].title == "Sub Section"
    assert sections[2].level == 3

    reconstructed = processor.reconstruct_from_sections(sections)
    assert reconstructed == sample

def test_short_description():
    processor = WikitextProcessor()
    sample = "{{Short description|British English test}}\nArticle content..."
    desc = processor.extract_short_description(sample)
    assert desc == "British English test"

    updated = processor.update_short_description(sample, "American English test")
    assert "American English test" in updated
