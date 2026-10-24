"""
Wikitext Structural and Markup Validator.
Validates syntax integrity, template parity, citation counts, and link safety.
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass, asdict


@dataclass
class ValidationWarning:
    severity: str  # 'error' | 'warning' | 'info'
    category: str  # 'template' | 'link' | 'reference' | 'html' | 'category' | 'table'
    message: str
    details: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WikitextValidator:
    def validate(self, original: str, revised: str) -> Dict[str, Any]:
        warnings: List[ValidationWarning] = []

        # 1. Bracket & Template Balances
        orig_open_curly = original.count("{{")
        orig_close_curly = original.count("}}")
        rev_open_curly = revised.count("{{")
        rev_close_curly = revised.count("}}")

        if rev_open_curly != rev_close_curly:
            warnings.append(ValidationWarning(
                severity="error",
                category="template",
                message="Unbalanced template braces in revised text.",
                details=f"Found {rev_open_curly} '{{{{' and {rev_close_curly} '}}}}'."
            ))
        elif orig_open_curly != rev_open_curly:
            diff = rev_open_curly - orig_open_curly
            warnings.append(ValidationWarning(
                severity="warning" if abs(diff) > 1 else "info",
                category="template",
                message=f"Template count changed by {diff:+d}.",
                details=f"Original had {orig_open_curly} templates; revised has {rev_open_curly}."
            ))

        # 2. Wikilinks Balances
        orig_open_sq = original.count("[[")
        orig_close_sq = original.count("]]")
        rev_open_sq = revised.count("[[")
        rev_close_sq = revised.count("]]")

        if rev_open_sq != rev_close_sq:
            warnings.append(ValidationWarning(
                severity="error",
                category="link",
                message="Unbalanced internal wikilink brackets in revised text.",
                details=f"Found {rev_open_sq} '[[' and {rev_close_sq} ']]'."
            ))

        # 3. Table Balances
        orig_table_open = original.count("{|")
        orig_table_close = original.count("|}")
        rev_table_open = revised.count("{|")
        rev_table_close = revised.count("|}")

        if rev_table_open != rev_table_close:
            warnings.append(ValidationWarning(
                severity="error",
                category="table",
                message="Unbalanced MediaWiki table markup in revised text.",
                details=f"Found {rev_table_open} '{{|' open table tags and {rev_table_close} '|}}' close tags."
            ))

        # 4. Citations & References
        orig_ref_open = len(re.findall(r'<ref\b[^>]*>', original, re.IGNORECASE))
        orig_ref_close = len(re.findall(r'<\/ref>', original, re.IGNORECASE))
        orig_self_ref = len(re.findall(r'<ref\b[^>]*\/>', original, re.IGNORECASE))

        rev_ref_open = len(re.findall(r'<ref\b[^>]*>', revised, re.IGNORECASE))
        rev_ref_close = len(re.findall(r'<\/ref>', revised, re.IGNORECASE))
        rev_self_ref = len(re.findall(r'<ref\b[^>]*\/>', revised, re.IGNORECASE))

        rev_unclosed = (rev_ref_open - rev_self_ref) - rev_ref_close
        if rev_unclosed != 0:
            warnings.append(ValidationWarning(
                severity="error",
                category="reference",
                message="Mismatched or unclosed <ref> tags detected in revised text.",
                details=f"Unpaired reference tags count: {abs(rev_unclosed)}."
            ))

        orig_total_refs = orig_ref_open
        rev_total_refs = rev_ref_open
        if orig_total_refs != rev_total_refs:
            warnings.append(ValidationWarning(
                severity="warning",
                category="reference",
                message=f"Reference count changed from {orig_total_refs} to {rev_total_refs}.",
                details="Verify no citations were inadvertently deleted or moved."
            ))

        # 5. Category Preservation
        orig_cats = set(re.findall(r'\[\[(?:Category|Категория|Kategorie):([^\]]+)\]\]', original, re.IGNORECASE))
        rev_cats = set(re.findall(r'\[\[(?:Category|Категория|Kategorie):([^\]]+)\]\]', revised, re.IGNORECASE))

        missing_cats = orig_cats - rev_cats
        if missing_cats:
            warnings.append(ValidationWarning(
                severity="warning",
                category="category",
                message="One or more categories from the original article appear to be missing.",
                details=f"Missing categories: {', '.join(list(missing_cats)[:3])}"
            ))

        # 6. HTML Tags Balance
        html_tags = ["div", "span", "gallery", "math", "code", "pre", "blockquote", "nowiki"]
        for tag in html_tags:
            open_count = len(re.findall(rf'<{tag}\b[^>]*>', revised, re.IGNORECASE))
            self_close_count = len(re.findall(rf'<{tag}\b[^>]*\/>', revised, re.IGNORECASE))
            close_count = len(re.findall(rf'<\/{tag}>', revised, re.IGNORECASE))

            effective_open = open_count - self_close_count
            if effective_open != close_count:
                warnings.append(ValidationWarning(
                    severity="error",
                    category="html",
                    message=f"Unbalanced <{tag}> HTML tags in revised text.",
                    details=f"Found {effective_open} opening and {close_count} closing <{tag}> tags."
                ))

        # Compile stats
        stats = {
            "original_templates": orig_open_curly,
            "revised_templates": rev_open_curly,
            "original_wikilinks": orig_open_sq,
            "revised_wikilinks": rev_open_sq,
            "original_references": orig_total_refs,
            "revised_references": rev_total_refs,
            "original_categories": len(orig_cats),
            "revised_categories": len(rev_cats),
            "original_tables": orig_table_open,
            "revised_tables": rev_table_open,
        }

        has_errors = any(w.severity == "error" for w in warnings)

        return {
            "is_valid": not has_errors,
            "warnings": [w.to_dict() for w in warnings],
            "stats": stats
        }
