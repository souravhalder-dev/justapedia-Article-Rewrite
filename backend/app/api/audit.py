"""
API Router for American English Consistency Audit and Section Splitting.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.parser import WikitextProcessor
from app.core.rules_engine import RulesEngine
from app.core.diff_utils import compute_side_by_side_diff

router = APIRouter(prefix="/audit", tags=["Audit"])

processor = WikitextProcessor()
rules_engine = RulesEngine()


class AuditRequest(BaseModel):
    wikitext: str
    section_index: Optional[int] = None


@router.post("/run")
async def run_audit(req: AuditRequest):
    wikitext = req.wikitext
    if not wikitext.strip():
        raise HTTPException(status_code=400, detail="Wikitext cannot be empty.")

    sections = processor.extract_sections(wikitext)
    sections_summary = [
        {"index": s.index, "title": s.title, "level": s.level, "is_lead": s.is_lead, "length": len(s.wikitext)}
        for s in sections
    ]

    target_text = wikitext
    if req.section_index is not None and 0 <= req.section_index < len(sections):
        target_text = sections[req.section_index].wikitext

    # Mask protected tokens so audit does not flag templates, tags, quotes, proper nouns
    masked_text, token_map = processor.mask_protected_tokens(target_text)
    findings = rules_engine.audit_text(masked_text)

    # Compute breakdown counts
    spelling_count = sum(1 for f in findings if f.category == "spelling")
    vocab_count = sum(1 for f in findings if f.category == "vocabulary")
    punct_count = sum(1 for f in findings if f.category == "punctuation")
    style_count = sum(1 for f in findings if f.category == "style")

    # Word count estimation
    words = target_text.split()
    total_words = len(words)
    issues_count = len(findings)
    consistency_score = max(0, min(100, int((1 - (issues_count / max(1, total_words * 0.1))) * 100)))

    short_desc = processor.extract_short_description(wikitext)

    return {
        "findings": [f.to_dict() for f in findings],
        "total_issues": issues_count,
        "spelling_count": spelling_count,
        "vocab_count": vocab_count,
        "punct_count": punct_count,
        "style_count": style_count,
        "consistency_score": consistency_score,
        "sections": sections_summary,
        "short_description": short_desc
    }
