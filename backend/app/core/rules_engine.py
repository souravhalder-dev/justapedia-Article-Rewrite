"""
Deterministic Rules Engine for American English Conversion and Auditing.
Operates 100% locally and offline without requiring an external AI API.
"""

import re
import os
import json
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, asdict


@dataclass
class AuditFinding:
    id: str
    original: str
    replacement: str
    category: str  # 'spelling' | 'vocabulary' | 'grammar' | 'style'
    confidence: float
    explanation: str
    source: str  # 'deterministic' | 'ai'
    line: int
    char_offset: int
    context: str
    accepted: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class RulesEngine:
    def __init__(
        self,
        spelling_dict_path: Optional[str] = None,
        vocab_dict_path: Optional[str] = None,
        proper_nouns_path: Optional[str] = None,
    ):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        spelling_path = spelling_dict_path or os.path.join(base_dir, "data", "spelling_dict.json")
        vocab_path = vocab_dict_path or os.path.join(base_dir, "data", "vocabulary_dict.json")
        pn_path = proper_nouns_path or os.path.join(base_dir, "data", "proper_nouns.json")

        self.spelling_map: Dict[str, str] = {}
        if os.path.exists(spelling_path):
            with open(spelling_path, "r", encoding="utf-8") as f:
                self.spelling_map = json.load(f)

        self.vocab_rules: List[Dict[str, Any]] = []
        if os.path.exists(vocab_path):
            with open(vocab_path, "r", encoding="utf-8") as f:
                self.vocab_rules = json.load(f)

        self.proper_nouns: List[str] = []
        if os.path.exists(pn_path):
            with open(pn_path, "r", encoding="utf-8") as f:
                self.proper_nouns = json.load(f)

    def _match_casing(self, original: str, replacement: str) -> str:
        """Transfers original word's casing (lower, Title, UPPER) to replacement."""
        if original.isupper():
            return replacement.upper()
        if original.istitle():
            return replacement.capitalize()
        return replacement

    def audit_text(self, text: str) -> List[AuditFinding]:
        """
        Scans prose for British spellings, vocabulary, punctuation, and style issues.
        Returns a list of AuditFinding objects.
        """
        findings: List[AuditFinding] = []
        finding_count = 0

        lines = text.split("\n")
        cumulative_offset = 0

        # Precompile proper noun set for fast exclusion
        pn_set = set(p.lower() for p in self.proper_nouns)

        for line_idx, line in enumerate(lines, start=1):
            line_offset = cumulative_offset
            cumulative_offset += len(line) + 1  # +1 for newline

            # Skip lines that are entirely tokens
            if line.strip().startswith("__MW_TOKEN_") and line.strip().endswith("__"):
                continue

            # 1. Spelling Checks
            # Match word tokens
            word_matches = list(re.finditer(r'\b[A-Za-z]+(?:\'[A-Za-z]+)?\b', line))
            for match in word_matches:
                word = match.group(0)
                word_lower = word.lower()

                # Ignore if token marker
                if "mw_token" in word_lower:
                    continue

                if word_lower in self.spelling_map:
                    us_equiv = self.spelling_map[word_lower]
                    if us_equiv.lower() == word_lower:
                        continue

                    # Context window for display
                    start_ctx = max(0, match.start() - 25)
                    end_ctx = min(len(line), match.end() + 25)
                    context_snippet = ("..." if start_ctx > 0 else "") + line[start_ctx:end_ctx] + ("..." if end_ctx < len(line) else "")

                    finding_count += 1
                    cased_replacement = self._match_casing(word, us_equiv)

                    findings.append(AuditFinding(
                        id=f"det_spell_{finding_count}",
                        original=word,
                        replacement=cased_replacement,
                        category="spelling",
                        confidence=0.98,
                        explanation=f"Convert British spelling '{word}' to American English '{cased_replacement}'.",
                        source="deterministic",
                        line=line_idx,
                        char_offset=line_offset + match.start(),
                        context=context_snippet,
                        accepted=True
                    ))

            # 2. Vocabulary Checks
            for rule in self.vocab_rules:
                # Check singular and plural terms
                candidates = [(rule["term"], rule["replacement"])]
                if "plural_term" in rule and "plural_replacement" in rule:
                    candidates.append((rule["plural_term"], rule["plural_replacement"]))

                for uk_term, us_equiv in candidates:
                    pattern = rf'\b{re.escape(uk_term)}\b'
                    for vmatch in re.finditer(pattern, line, flags=re.IGNORECASE):
                        term_found = vmatch.group(0)
                        
                        # Check context requirements if specified
                        context_reqs = rule.get("context_required", [])
                        if context_reqs:
                            # Search in wider window of the line
                            line_sub = line.lower()
                            has_context = any(req.lower() in line_sub for req in context_reqs)
                            if not has_context:
                                continue

                        start_ctx = max(0, vmatch.start() - 25)
                        end_ctx = min(len(line), vmatch.end() + 25)
                        context_snippet = ("..." if start_ctx > 0 else "") + line[start_ctx:end_ctx] + ("..." if end_ctx < len(line) else "")

                        finding_count += 1
                        cased_rep = self._match_casing(term_found, us_equiv)

                        findings.append(AuditFinding(
                            id=f"det_vocab_{finding_count}",
                            original=term_found,
                            replacement=cased_rep,
                            category="vocabulary",
                            confidence=rule.get("confidence", 0.90),
                            explanation=rule.get("explanation", f"Replace British term '{term_found}' with American '{cased_rep}'."),
                            source="deterministic",
                            line=line_idx,
                            char_offset=line_offset + vmatch.start(),
                            context=context_snippet,
                            accepted=True
                        ))

            # 3. Punctuation Style: Commas and periods outside quotes (e.g., "word", -> "word," and "word". -> "word.")
            # Note: American standard places period and comma inside the quotation mark
            quote_punct_pattern = r'("[^"\n]+?)"([,\.])'
            for qmatch in re.finditer(quote_punct_pattern, line):
                inner_text = qmatch.group(1)
                punct = qmatch.group(2)
                full_matched = qmatch.group(0)
                # Ignore if inner text looks like a token
                if "__MW_TOKEN_" in inner_text:
                    continue

                corrected = f'{inner_text}{punct}"'
                start_ctx = max(0, qmatch.start() - 20)
                end_ctx = min(len(line), qmatch.end() + 20)
                context_snippet = line[start_ctx:end_ctx]

                finding_count += 1
                findings.append(AuditFinding(
                    id=f"det_punct_{finding_count}",
                    original=full_matched,
                    replacement=corrected,
                    category="punctuation",
                    confidence=0.88,
                    explanation=f"Under American punctuation style, the {('comma' if punct == ',' else 'period')} goes inside quotation marks.",
                    source="deterministic",
                    line=line_idx,
                    char_offset=line_offset + qmatch.start(),
                    context=context_snippet,
                    accepted=True
                ))

            # 4. Serial Comma (Oxford Comma)
            # Pattern: item1, item2 and item3 -> item1, item2, and item3
            serial_comma_pattern = r'(\b\w+),\s+([a-zA-Z\s]+?)\s+(and|or)\s+(\b\w+)'
            for sc_match in re.finditer(serial_comma_pattern, line):
                full_phrase = sc_match.group(0)
                part1 = sc_match.group(1)
                part2 = sc_match.group(2).strip()
                conj = sc_match.group(3)
                part3 = sc_match.group(4)

                # Avoid triggering on token markers or very long phrases
                if "__MW_TOKEN_" in full_phrase or len(part2) > 40:
                    continue

                if not part2.endswith(","):
                    corrected_phrase = f"{part1}, {part2}, {conj} {part3}"
                    start_ctx = max(0, sc_match.start() - 15)
                    end_ctx = min(len(line), sc_match.end() + 15)
                    context_snippet = line[start_ctx:end_ctx]

                    finding_count += 1
                    findings.append(AuditFinding(
                        id=f"det_style_{finding_count}",
                        original=full_phrase,
                        replacement=corrected_phrase,
                        category="style",
                        confidence=0.82,
                        explanation="American editorial style recommends using the serial comma (Oxford comma) before the coordinating conjunction in a series.",
                        source="deterministic",
                        line=line_idx,
                        char_offset=line_offset + sc_match.start(),
                        context=context_snippet,
                        accepted=False  # Recommended as optional style choice
                    ))

        return findings

    def apply_rewrite(self, text: str, accepted_finding_ids: Optional[List[str]] = None) -> Tuple[str, List[AuditFinding]]:
        """
        Runs the deterministic audit and applies the changes.
        If accepted_finding_ids is provided, applies ONLY those findings.
        Otherwise, applies all high-confidence (confidence >= 0.85) findings.

        Returns:
            rewritten_text: Text with changes applied.
            findings: List of all findings identified.
        """
        findings = self.audit_text(text)

        # Sort findings in reverse order of character offset so substitutions don't shift positions
        valid_findings = []
        for f in findings:
            if accepted_finding_ids is not None:
                if f.id in accepted_finding_ids:
                    f.accepted = True
                    valid_findings.append(f)
                else:
                    f.accepted = False
            else:
                # By default accept all findings where accepted=True and confidence >= 0.85
                if f.accepted and f.confidence >= 0.85:
                    valid_findings.append(f)
                else:
                    f.accepted = False

        # Sort descending by char_offset
        valid_findings.sort(key=lambda x: x.char_offset, reverse=True)

        rewritten = text
        for f in valid_findings:
            start = f.char_offset
            end = start + len(f.original)
            # Verify exact slice matches original
            if rewritten[start:end] == f.original:
                rewritten = rewritten[:start] + f.replacement + rewritten[end:]
            else:
                # If offset drifted, do a safe word boundary replacement in context
                target_word = re.escape(f.original)
                rewritten = re.sub(rf'\b{target_word}\b', f.replacement, rewritten, count=1)

        return rewritten, findings
