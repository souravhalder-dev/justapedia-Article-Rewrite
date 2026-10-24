"""
Wikitext Parser & Protection Engine
Preserves MediaWiki templates, infoboxes, citations, refs, links, categories,
tables, HTML elements, and quotations while isolating editable prose.
"""

import re
import json
import os
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, asdict
import mwparserfromhell
from mwparserfromhell.nodes import Template, Wikilink, ExternalLink, Tag, Heading, Text, Comment


@dataclass
class SectionInfo:
    index: int
    title: str
    level: int
    wikitext: str
    is_lead: bool = False


@dataclass
class ProseSpan:
    start: int
    end: int
    text: str
    section_index: int


class WikitextProcessor:
    def __init__(self, proper_nouns_path: Optional[str] = None):
        self.proper_nouns: List[str] = []
        if not proper_nouns_path:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            proper_nouns_path = os.path.join(base_dir, "data", "proper_nouns.json")
        
        if os.path.exists(proper_nouns_path):
            try:
                with open(proper_nouns_path, "r", encoding="utf-8") as f:
                    self.proper_nouns = json.load(f)
            except Exception:
                self.proper_nouns = []

    def parse(self, wikitext: str) -> mwparserfromhell.wikicode.Wikicode:
        """Parses wikitext into an AST using mwparserfromhell."""
        return mwparserfromhell.parse(wikitext)

    def extract_sections(self, wikitext: str) -> List[SectionInfo]:
        """
        Splits wikitext into sections (Lead Section + subsequent H2, H3 sections).
        """
        wikicode = self.parse(wikitext)
        raw_sections = wikicode.get_sections(include_lead=True, flat=True)
        
        sections: List[SectionInfo] = []
        for i, sec in enumerate(raw_sections):
            headings = sec.filter_headings()
            sec_text = str(sec)
            
            if i == 0 and not headings:
                sections.append(SectionInfo(
                    index=0,
                    title="Lead Section",
                    level=0,
                    wikitext=sec_text,
                    is_lead=True
                ))
            elif headings:
                h = headings[0]
                h_title = str(h.title).strip()
                h_level = h.level
                sections.append(SectionInfo(
                    index=i,
                    title=h_title,
                    level=h_level,
                    wikitext=sec_text,
                    is_lead=(i == 0)
                ))
            else:
                sections.append(SectionInfo(
                    index=i,
                    title=f"Section {i}",
                    level=2,
                    wikitext=sec_text,
                    is_lead=(i == 0)
                ))
        return sections

    def reconstruct_from_sections(self, sections: List[SectionInfo]) -> str:
        """Combines sections back into full wikitext."""
        return "".join(s.wikitext for s in sections)

    def extract_short_description(self, wikitext: str) -> Optional[str]:
        """Extracts existing {{Short description|...}} value if present."""
        wikicode = self.parse(wikitext)
        for t in wikicode.filter_templates():
            if t.name.strip().lower() in ("short description", "shortdescription"):
                if t.has(1):
                    return str(t.get(1).value).strip()
                elif t.params:
                    return str(t.params[0].value).strip()
        return None

    def update_short_description(self, wikitext: str, new_description: str) -> str:
        """
        Updates or prepends {{Short description|...}} template.
        """
        wikicode = self.parse(wikitext)
        found = False
        for t in wikicode.filter_templates():
            if t.name.strip().lower() in ("short description", "shortdescription"):
                if t.has(1):
                    t.get(1).value = f" {new_description.strip()} "
                else:
                    t.add(1, f" {new_description.strip()} ")
                found = True
                break
        
        if not found:
            new_tpl = f"{{{{Short description|{new_description.strip()}}}}}\n"
            return new_tpl + wikitext
        
        return str(wikicode)

    def mask_protected_tokens(self, text: str) -> Tuple[str, Dict[str, str]]:
        """
        Masks sensitive MediaWiki tokens, HTML tags, references, categories,
        file links, external link URLs, and direct quotations so they are
        NEVER altered during prose rewrites or audits.

        Returns:
            masked_text: Text with placeholders like __MW_TOKEN_00001__
            token_map: Dict mapping placeholder to original raw string
        """
        token_map: Dict[str, str] = {}
        token_counter = 0

        def create_token(original: str) -> str:
            nonlocal token_counter
            token_counter += 1
            placeholder = f"__MW_TOKEN_{token_counter:05d}__"
            token_map[placeholder] = original
            return placeholder

        # 1. Protect Comments <!-- ... -->
        text = re.sub(r'<!--[\s\S]*?-->', lambda m: create_token(m.group(0)), text)

        # 2. Protect sensitive extension tags (<ref>, <math>, <code>, <pre>, <nowiki>, <gallery>, <syntaxhighlight>)
        tag_pattern = r'<(ref|math|code|pre|nowiki|gallery|syntaxhighlight)\b[^>]*>[\s\S]*?<\/\1>|<(ref|math|code|pre|nowiki|gallery|syntaxhighlight)\b[^>]*\/>'
        text = re.sub(tag_pattern, lambda m: create_token(m.group(0)), text, flags=re.IGNORECASE)

        # 3. Protect other HTML void tags and specific containers
        html_pattern = r'<(div|span|table|tr|td|th|tbody|thead|tfoot|p|br|hr|b|i|u|s|small|big|sup|sub)\b[^>]*\/?>|<\/(div|span|table|tr|td|th|tbody|thead|tfoot|p|b|i|u|s|small|big|sup|sub)>'
        text = re.sub(html_pattern, lambda m: create_token(m.group(0)), text, flags=re.IGNORECASE)

        # 4. Protect Wiki Tables syntax lines: {| ... |}
        text = re.sub(r'^\{\|[\s\S]*?^\|\}', lambda m: create_token(m.group(0)), text, flags=re.MULTILINE)

        # 5. Protect Categories: [[Category:Something]]
        text = re.sub(r'\[\[(?:Category|Категория|Kategorie):[^\]]+\]\]', lambda m: create_token(m.group(0)), text, flags=re.IGNORECASE)

        # 6. Protect Files and Images: [[File:...]] or [[Image:...]]
        text = re.sub(r'\[\[(?:File|Image|Файл|Bild):[^\]]+\]\]', lambda m: create_token(m.group(0)), text, flags=re.IGNORECASE)

        # 7. Protect All MediaWiki Templates: {{TemplateName|...}}
        # We handle nested templates by repeatedly matching innermost templates until none remain
        while True:
            subbed = re.sub(r'\{\{[^{}]+?\}\}', lambda m: create_token(m.group(0)), text)
            if subbed == text:
                break
            text = subbed

        # 8. Protect External Links URLs: [http://... display] -> protect URL part, leave display
        def mask_ext_link(match):
            full = match.group(0)
            url = match.group(1)
            rest = match.group(2) if match.group(2) else ""
            url_token = create_token(url)
            return f"[{url_token}{rest}]"

        text = re.sub(r'\[(https?:\/\/[^\s\]]+)(\s+[^\]]+)?\]', mask_ext_link, text)

        # 9. Protect Bare URLs
        text = re.sub(r'https?:\/\/[^\s<>"\'{}|\\^`\[\]]+', lambda m: create_token(m.group(0)), text)

        # 10. Protect Wikilink Targets: [[Target|Display]] -> Target is protected, Display is prose
        def mask_wikilink(match):
            target = match.group(1)
            display = match.group(2)
            target_token = create_token(target)
            if display:
                return f"[[{target_token}|{display}]]"
            else:
                return f"[[{target_token}]]"

        text = re.sub(r'\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]', mask_wikilink, text)

        # 11. Protect Headings formatting (protect the == markers so they don't break)
        text = re.sub(r'^(={1,6})\s*(.*?)\s*\1\s*$', lambda m: f"{create_token(m.group(1))} {m.group(2)} {create_token(m.group(1))}", text, flags=re.MULTILINE)

        # 12. Protect Direct Quotations: "...", “...”, '...' (when clearly a quote)
        quote_pattern = r'("[\s\S]*?"|“[\s\S]*?”|«[\s\S]*?»)'
        text = re.sub(quote_pattern, lambda m: create_token(m.group(0)), text)

        # 13. Protect known Proper Nouns from proper_nouns list
        for pn in self.proper_nouns:
            pn_pattern = rf'\b{re.escape(pn)}\b'
            text = re.sub(pn_pattern, lambda m: create_token(m.group(0)), text)

        return text, token_map

    def unmask_protected_tokens(self, text: str, token_map: Dict[str, str]) -> str:
        """
        Recursively restores all protected tokens to their exact original form.
        """
        # Because templates can be nested, unmasking must iterate until all __MW_TOKEN_...__ are replaced
        pattern = re.compile(r'__MW_TOKEN_\d{5}__')
        while True:
            matches = pattern.findall(text)
            if not matches:
                break
            replaced_any = False
            for token in matches:
                if token in token_map:
                    text = text.replace(token, token_map[token])
                    replaced_any = True
            if not replaced_any:
                break
        return text
