"""
Diff computation utilities: Line-by-line and word-level diffs for side-by-side inspection.
"""

import difflib
import re
from typing import List, Dict, Any


def compute_unified_diff(original: str, revised: str, fromfile: str = "Original", tofile: str = "Revised") -> str:
    """Returns standard unified diff string."""
    orig_lines = original.splitlines(keepends=True)
    rev_lines = revised.splitlines(keepends=True)
    diff = difflib.unified_diff(orig_lines, rev_lines, fromfile=fromfile, tofile=tofile)
    return "".join(diff)


def compute_word_diff(orig_line: str, rev_line: str) -> Dict[str, List[Dict[str, str]]]:
    """Computes inline word additions and deletions between two corresponding lines."""
    # Split keeping whitespace and punctuation
    orig_words = re.findall(r'\S+|\s+', orig_line)
    rev_words = re.findall(r'\S+|\s+', rev_line)

    matcher = difflib.SequenceMatcher(None, orig_words, rev_words)
    orig_chunks: List[Dict[str, str]] = []
    rev_chunks: List[Dict[str, str]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        orig_part = "".join(orig_words[i1:i2])
        rev_part = "".join(rev_words[j1:j2])

        if tag == "equal":
            orig_chunks.append({"type": "equal", "text": orig_part})
            rev_chunks.append({"type": "equal", "text": rev_part})
        elif tag == "delete":
            orig_chunks.append({"type": "delete", "text": orig_part})
        elif tag == "insert":
            rev_chunks.append({"type": "insert", "text": rev_part})
        elif tag == "replace":
            orig_chunks.append({"type": "delete", "text": orig_part})
            rev_chunks.append({"type": "insert", "text": rev_part})

    return {"orig": orig_chunks, "rev": rev_chunks}


def compute_side_by_side_diff(original: str, revised: str) -> List[Dict[str, Any]]:
    """
    Computes aligned line diffs suitable for side-by-side or split diff views.
    """
    orig_lines = original.splitlines()
    rev_lines = revised.splitlines()

    matcher = difflib.SequenceMatcher(None, orig_lines, rev_lines)
    aligned_rows: List[Dict[str, Any]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for offset in range(i2 - i1):
                o_idx = i1 + offset
                r_idx = j1 + offset
                aligned_rows.append({
                    "type": "equal",
                    "orig_line_num": o_idx + 1,
                    "rev_line_num": r_idx + 1,
                    "orig_text": orig_lines[o_idx],
                    "rev_text": rev_lines[r_idx],
                    "word_diff": None
                })
        elif tag == "replace":
            max_len = max(i2 - i1, j2 - j1)
            for offset in range(max_len):
                has_orig = (i1 + offset) < i2
                has_rev = (j1 + offset) < j2
                o_text = orig_lines[i1 + offset] if has_orig else ""
                r_text = rev_lines[j1 + offset] if has_rev else ""
                o_num = (i1 + offset + 1) if has_orig else None
                r_num = (j1 + offset + 1) if has_rev else None

                word_diff = compute_word_diff(o_text, r_text) if (has_orig and has_rev) else None

                aligned_rows.append({
                    "type": "replace",
                    "orig_line_num": o_num,
                    "rev_line_num": r_num,
                    "orig_text": o_text,
                    "rev_text": r_text,
                    "word_diff": word_diff
                })
        elif tag == "delete":
            for offset in range(i2 - i1):
                o_idx = i1 + offset
                aligned_rows.append({
                    "type": "delete",
                    "orig_line_num": o_idx + 1,
                    "rev_line_num": None,
                    "orig_text": orig_lines[o_idx],
                    "rev_text": "",
                    "word_diff": None
                })
        elif tag == "insert":
            for offset in range(j2 - j1):
                r_idx = j1 + offset
                aligned_rows.append({
                    "type": "insert",
                    "orig_line_num": None,
                    "rev_line_num": r_idx + 1,
                    "orig_text": "",
                    "rev_text": rev_lines[r_idx],
                    "word_diff": None
                })

    return aligned_rows
