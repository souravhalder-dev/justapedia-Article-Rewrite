# American English Article Rewrite & Localization Tool for MediaWiki

A production-ready web application designed to rewrite, localize, proofread, and improve MediaWiki articles into natural, consistent, professional American English while strictly preserving MediaWiki wikitext markup, templates, infoboxes, citations, links, and factual accuracy.

Configured by default to integrate with **[Justapedia](https://justapedia.org/api.php)** and fully compatible with Wikipedia, Wikivoyage, and any MediaWiki 1.35+ action API.

---

## 🚀 Key Features

### 1. Context-Aware American English Localization
- **American Spelling Conversion**: Converts non-American spellings (`-our` → `-or`, `-ise` → `-ize`, `-re` → `-er`, `-yse` → `-yze`, `-ogue` → `-og`, `-ence` → `-ense`, double-consonant inflections like `travelled` → `traveled`, `cancelled` → `canceled`, `programme` → `program`, `grey` → `gray`, etc.).
- **Vocabulary Localization**: Replaces British expressions with natural American equivalents (`lift` → `elevator`, `flat` → `apartment`, `lorry` → `truck`, `petrol` → `gasoline`, `mobile phone` → `cell phone`, `holiday` → `vacation`, `queue` → `line`, `maths` → `math`, `autumn` → `fall`, `pavement` → `sidewalk`, etc.) with strict context validation.
- **American Grammar and Editorial Style**:
  - Punctuation inside quotation marks (`"word,"` and `"word."`).
  - Serial comma (Oxford comma) detection and guidance.
  - Phrasing improvements (`whilst` → `while`, `amongst` → `among`, `towards` → `toward`, `afterwards` → `afterward`).
- **Entity & Proper Noun Immunity**: Protected database ensures British institutions, official titles, place names, trademarks (e.g. `Labour Party`, `Bank of England`, `Royal Navy`, `House of Lords`, `Tate Modern`, `National Health Service`) and historical names are **never** Americanized.
- **Quotation Protection**: All direct quotations (`"..."`, `“...”`, `{{quote|...}}`, `<blockquote>`) are preserved verbatim.

### 2. Mandatory MediaWiki Wikitext Preservation
- **AST Parser Isolation**: Uses `mwparserfromhell` to parse articles into structured abstract syntax trees.
- **Protected Components**:
  - Infoboxes and templates (parameter keys, delimiters, and logic are untouched).
  - Citations and reference tags (`<ref>`, `{{cite book}}`, `{{cite web}}`, `<references />`).
  - Internal wikilinks: Targets `[[Target|Label]]` are locked to prevent breaking links; only labels are safely audited.
  - Categories (`[[Category:...]]`) and Files (`[[File:...]]`, `[[Image:...]]`).
  - Tables (`{| ... |}`), headings (`== ... ==`), extension tags (`<gallery>`, `<math>`, `<code>`, `<pre>`, `<nowiki>`).
  - Comments (`<!-- ... -->`).
- **Structural Integrity Validator**: Compares revision against original to verify template brace balance (`{{` vs `}}`), wikilink balance (`[[` vs `]]`), tag parity (`<ref>` count), and category retention before saving.

### 3. Eight Dedicated Rewrite Modes
1. **American English Conversion**: Converts British/Commonwealth prose to standard American English while maintaining meaning.
2. **American English Proofreading**: Focused pass on spelling, typos, punctuation, and vocabulary.
3. **Full Article Improvement**: Enhances readability, sentence structure, flow, and encyclopedic clarity.
4. **Lead Section Improvement**: Targets and refines opening lead paragraphs.
5. **Short Description Improvement**: Generates or edits concise, MOS-compliant `{{Short description|...}}`.
6. **Section Rewrite**: Targets an individual selected section (H2/H3) without touching other sections.
7. **American English Consistency Audit**: Comprehensive scan reporting issues with confidence scores and explanations.
8. **Citation and Reference Review**: Audits reference formatting (e.g. date styles) without altering factual citations.

### 4. Interactive Dashboard & Comparison
- **Side-by-Side Editor**: Original wikitext alongside editable proposed revision with word counts and syntax sync.
- **Visual Diff Viewer**: Aligned line diffs with inline word-level deletions (red strikethrough) and additions (green bold).
- **Consistency Audit Panel**: Interactive cards with Accept/Reject toggles, category filtering, and batch adoption.
- **Live Wiki HTML Preview**: Renders real MediaWiki HTML directly from the target wiki using `action=parse`.

### 5. Safe Saving & Conflict Detection
- **No Automatic Publishing**: All updates require explicit user confirmation.
- **User Attribution**: Saves through the user's authenticated MediaWiki account or Bot Password via CSRF token.
- **Edit Conflict Detection**: Checks `expected_revid` and `basetimestamp` against the live page before saving.
- **Dry-Run Test Mode**: Validates tokens, conflicts, and syntax without writing to live articles.

---

## 🛠 Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, mwparserfromhell, httpx, pydantic, difflib, google-genai (optional AI).
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Integration**: MediaWiki Action API (`https://justapedia.org/api.php` or any custom endpoint).

---

## 📦 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher & npm

### 1. Start the FastAPI Backend
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run the backend server
python run.py
```
The FastAPI backend runs on `http://127.0.0.1:8000`.
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 2. Start the Next.js Frontend
```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Run development server
npm run dev
```
The Next.js frontend will open on `http://localhost:3000`.

---

## 🧪 Automated Testing

Run the comprehensive pytest suite covering the AST parser, rules engine, validation, and live Justapedia API client:

```bash
python -m pytest backend/tests
```

Test coverage includes:
- `test_parser.py`: Round-trip AST preservation, template isolation, quote masking, section splitting.
- `test_rules.py`: British-to-American spelling, vocabulary replacement, casing preservation, serial comma, punctuation inside quotes.
- `test_validator.py`: Bracket balancing, citation count parity, unclosed tag detection.
- `test_api.py`: FastAPI endpoints, real live fetch from Justapedia (`Perfume (novel)`), rewrite modes, dry-run save.

---

## ⚙️ Configuration & Customization

- **MediaWiki Endpoint**: Can be changed on the fly in the UI (Settings / Header) or defaults to `https://justapedia.org/api.php`.
- **AI Semantic Engine**: Under UI Settings, toggle between **Deterministic Rules** (100% offline, zero API keys required) and **AI Semantic Rewriter** (powered by Google Gemini). Provide an optional API key or set the `GEMINI_API_KEY` environment variable.
- **Spelling & Vocabulary Rules**: Extensible JSON files located in `backend/app/data/`:
  - `spelling_dict.json`
  - `vocabulary_dict.json`
  - `proper_nouns.json`
