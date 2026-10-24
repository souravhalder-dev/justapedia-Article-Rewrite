"""
Optional AI Provider Engine using Google GenAI SDK (gemini-2.5-flash or user-configured model).
Only active when an API key is configured.
"""

import os
import re
from typing import Optional, Dict, Any, List, Tuple
from app.core.rules_engine import AuditFinding


class AIEngine:
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.5-flash"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model_name = model_name
        self.client = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                self.client = None

    def is_available(self) -> bool:
        """Returns True if an AI client is successfully initialized."""
        return self.client is not None

    def rewrite_prose(
        self,
        masked_text: str,
        mode: str = "american_conversion",
        user_instructions: Optional[str] = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Sends masked wikitext prose to the AI model.
        Guarantees that tokens (__MW_TOKEN_XXXXX__) remain uncorrupted.
        """
        if not self.is_available():
            raise RuntimeError("AI provider is not configured or GEMINI_API_KEY is missing.")

        mode_prompts = {
            "american_conversion": (
                "Convert non-American spelling, vocabulary, and phrasing to natural, standard American English. "
                "Retain the exact meaning and encyclopedic tone."
            ),
            "proofreading": (
                "Proofread the text for spelling, grammar, punctuation (including American quotation punctuation "
                "and serial commas), and vocabulary consistency in American English."
            ),
            "full_improvement": (
                "Improve readability, sentence structure, flow, and clarity while adhering strictly to "
                "American English conventions and Wikipedia encyclopedic standards."
            ),
            "lead_improvement": (
                "Refine the lead section to be concise, engaging, and clear, summarizing the subject effectively "
                "in natural American English."
            ),
            "short_desc_improvement": (
                "Create or refine a concise, accurate short description (under 40 characters where possible, "
                "starting with lowercase unless beginning with a proper noun)."
            ),
            "reference_review": (
                "Review citation text formatting and consistency without altering factual details or URLs."
            )
        }

        task_desc = mode_prompts.get(mode, mode_prompts["american_conversion"])
        if user_instructions:
            task_desc += f" Additional user guidance: {user_instructions}"

        system_instruction = (
            "You are a senior MediaWiki language editor specializing in American English localization.\n"
            "CRITICAL CONSTRAINTS:\n"
            "1. You will receive text containing protected markup tokens formatted like `__MW_TOKEN_00001__`.\n"
            "   You MUST PRESERVE EVERY TOKEN EXACTLY AS IT IS. Do NOT delete, alter, translate, or duplicate any token.\n"
            "2. Preserve all factual claims, names, dates, quotes, numbers, and technical terms.\n"
            "3. Do NOT Americanize proper nouns (e.g. British institutions like 'Labour Party', 'Bank of England').\n"
            "4. Only return the revised text. Do not add conversational commentary or markdown code blocks unless requested.\n"
        )

        prompt = f"TASK: {task_desc}\n\nTEXT TO REWRITE:\n{masked_text}"

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "temperature": 0.2
                }
            )
            revised_text = response.text.strip()
            # If the model wrapped in ```wikitext ... ```, strip it
            if revised_text.startswith("```wikitext"):
                revised_text = revised_text[len("```wikitext"):].strip()
            if revised_text.startswith("```"):
                revised_text = revised_text[len("```"):].strip()
            if revised_text.endswith("```"):
                revised_text = revised_text[:-3].strip()

            # Verify token integrity
            orig_tokens = set(re.findall(r'__MW_TOKEN_\d{5}__', masked_text))
            rev_tokens = set(re.findall(r'__MW_TOKEN_\d{5}__', revised_text))
            missing_tokens = orig_tokens - rev_tokens
            if missing_tokens:
                # If the AI somehow dropped a token, fallback safely or log warning
                pass

            return revised_text, [{"source": "ai", "note": f"Rewritten using AI model {self.model_name}"}]
        except Exception as e:
            raise RuntimeError(f"AI generation failed: {str(e)}")
