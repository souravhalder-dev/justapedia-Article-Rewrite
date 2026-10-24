"""
API Router for Rewrite Modes (1-8) and AST-Safe Transformations.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.parser import WikitextProcessor, SectionInfo
from app.core.rules_engine import RulesEngine, AuditFinding
from app.core.ai_engine import AIEngine
from app.core.validator import WikitextValidator
from app.core.diff_utils import compute_side_by_side_diff, compute_unified_diff

router = APIRouter(prefix="/rewrite", tags=["Rewrite"])

processor = WikitextProcessor()
rules_engine = RulesEngine()
validator = WikitextValidator()


class RewriteRequest(BaseModel):
    wikitext: str
    mode: str = "american_conversion"
    # Modes:
    # 1. american_conversion
    # 2. proofreading
    # 3. full_improvement
    # 4. lead_improvement
    # 5. short_desc_improvement
    # 6. section_rewrite
    # 7. consistency_audit
    # 8. reference_review
    section_index: Optional[int] = None
    use_ai: bool = False
    gemini_api_key: Optional[str] = None
    accepted_finding_ids: Optional[List[str]] = None
    custom_short_desc: Optional[str] = None
    user_instructions: Optional[str] = None


@router.post("/process")
async def process_rewrite(req: RewriteRequest):
    wikitext = req.wikitext
    if not wikitext.strip():
        raise HTTPException(status_code=400, detail="Wikitext cannot be empty.")

    engine_used = "deterministic"
    findings: List[Dict[str, Any]] = []

    # Handle Mode 5: Short Description Improvement directly
    if req.mode == "short_desc_improvement":
        existing_desc = processor.extract_short_description(wikitext)
        target_desc = req.custom_short_desc
        
        if not target_desc:
            if existing_desc:
                # Apply rules to existing description
                rev_desc, f_list = rules_engine.apply_rewrite(existing_desc)
                findings.extend([f.to_dict() for f in f_list])
                target_desc = rev_desc
            else:
                target_desc = "Article topic description"

        # Apply standard MOS formatting (lowercase initial unless proper noun)
        if target_desc and len(target_desc) > 0:
            words = target_desc.strip().split()
            first_word = words[0]
            # Don't lowercase acronyms like BBC or US
            if not first_word.isupper():
                first_word = first_word.lower()
            words[0] = first_word
            target_desc = " ".join(words)

        revised_wikitext = processor.update_short_description(wikitext, target_desc)
        validation_res = validator.validate(wikitext, revised_wikitext)
        diff_res = compute_side_by_side_diff(wikitext, revised_wikitext)

        return {
            "mode": req.mode,
            "engine_used": engine_used,
            "original_wikitext": wikitext,
            "revised_wikitext": revised_wikitext,
            "short_description": target_desc,
            "findings": findings,
            "diff": diff_res,
            "validation": validation_res
        }

    # Handle Mode 8: Citation and Reference Review
    if req.mode == "reference_review":
        # Extract <ref> tags and templates to review without modifying factual text
        ref_findings = []
        import re
        ref_tags = re.findall(r'<ref\b[^>]*>(.*?)<\/ref>', wikitext, re.IGNORECASE | re.DOTALL)
        for i, ref_content in enumerate(ref_tags):
            if "date=" in ref_content:
                # Check for British date format like 24 October 2026 -> October 24, 2026
                uk_date_match = re.search(r'\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b', ref_content)
                if uk_date_match:
                    day, month, year = uk_date_match.groups()
                    us_date = f"{month} {day}, {year}"
                    ref_findings.append({
                        "id": f"ref_date_{i}",
                        "original": uk_date_match.group(0),
                        "replacement": us_date,
                        "category": "style",
                        "confidence": 0.85,
                        "explanation": f"Optional American date format: '{us_date}' instead of '{uk_date_match.group(0)}'.",
                        "source": "deterministic",
                        "line": 0,
                        "char_offset": 0,
                        "context": ref_content[:60],
                        "accepted": False
                    })

        # Apply or return audit
        validation_res = validator.validate(wikitext, wikitext)
        return {
            "mode": req.mode,
            "engine_used": engine_used,
            "original_wikitext": wikitext,
            "revised_wikitext": wikitext,
            "findings": ref_findings,
            "diff": [],
            "validation": validation_res
        }

    # Section-targeted processing
    sections = processor.extract_sections(wikitext)
    target_section_idx = None

    if req.mode == "lead_improvement":
        target_section_idx = 0
    elif req.mode == "section_rewrite" and req.section_index is not None:
        target_section_idx = req.section_index
    elif req.section_index is not None and req.section_index >= 0:
        target_section_idx = req.section_index

    if target_section_idx is not None and 0 <= target_section_idx < len(sections):
        target_text = sections[target_section_idx].wikitext
    else:
        target_text = wikitext

    # Mask protected elements
    masked_text, token_map = processor.mask_protected_tokens(target_text)

    # Execute rewrite
    ai_engine = AIEngine(api_key=req.gemini_api_key)
    if req.use_ai and ai_engine.is_available():
        try:
            revised_masked, ai_meta = ai_engine.rewrite_prose(
                masked_text,
                mode=req.mode,
                user_instructions=req.user_instructions
            )
            engine_used = "ai"
            # Unmask AI result
            revised_target = processor.unmask_protected_tokens(revised_masked, token_map)
            # Run audit on diff to provide structured findings
            det_findings = rules_engine.audit_text(target_text)
            findings = [f.to_dict() for f in det_findings]
        except Exception as e:
            # Fallback cleanly to deterministic rules if AI fails
            revised_masked, det_findings = rules_engine.apply_rewrite(
                masked_text,
                accepted_finding_ids=req.accepted_finding_ids
            )
            revised_target = processor.unmask_protected_tokens(revised_masked, token_map)
            findings = [f.to_dict() for f in det_findings]
            engine_used = "deterministic (fallback)"
    else:
        # Deterministic rules execution
        revised_masked, det_findings = rules_engine.apply_rewrite(
            masked_text,
            accepted_finding_ids=req.accepted_finding_ids
        )
        revised_target = processor.unmask_protected_tokens(revised_masked, token_map)
        findings = [f.to_dict() for f in det_findings]
        engine_used = "deterministic"

    # Reconstruct article if section was targeted
    if target_section_idx is not None and 0 <= target_section_idx < len(sections):
        sections[target_section_idx].wikitext = revised_target
        final_revised_wikitext = processor.reconstruct_from_sections(sections)
    else:
        final_revised_wikitext = revised_target

    # Structural validation
    validation_res = validator.validate(wikitext, final_revised_wikitext)

    # Compute diff
    diff_res = compute_side_by_side_diff(wikitext, final_revised_wikitext)
    unified_diff_str = compute_unified_diff(wikitext, final_revised_wikitext)

    return {
        "mode": req.mode,
        "engine_used": engine_used,
        "original_wikitext": wikitext,
        "revised_wikitext": final_revised_wikitext,
        "findings": findings,
        "diff": diff_res,
        "unified_diff": unified_diff_str,
        "validation": validation_res,
        "section_targeted": target_section_idx
    }
