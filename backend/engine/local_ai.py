import json
import logging
from typing import Dict, Any

from engine.models import AIAnalysisResult, AIFlag, Severity

logger = logging.getLogger("veriflow.local_ai")

_pipeline = None

def _get_pipeline():
    """Lazily load the HuggingFace model pipeline."""
    global _pipeline
    if _pipeline is None:
        try:
            import torch
            from transformers import pipeline
            device_type = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Initializing Local LLM pipeline (Qwen2.5-0.5B-Instruct) on {device_type.upper()}...")
            
            # Use pipeline to load the model and tokenizer
            _pipeline = pipeline(
                "text-generation", 
                model="Qwen/Qwen2.5-0.5B-Instruct", 
                device=device_type,
                torch_dtype=torch.float32,
            )
            logger.info("Local LLM initialized successfully.")
        except ImportError as e:
            logger.error(f"Failed to import transformers: {e}")
            _pipeline = False
        except Exception as e:
            logger.error(f"Failed to load local LLM model: {e}")
            _pipeline = False
            
    return _pipeline if _pipeline is not False else None


def analyze_extracted_data(extracted_data: Dict[str, Any], document_names: list[str]) -> AIAnalysisResult:
    """
    Run the completely offline local LLM to analyze the document extracted data.
    """
    pipe = _get_pipeline()
    if not pipe:
        return AIAnalysisResult(
            summary="Offline AI Analysis unavailable. Could not load local LLM.",
            suspicion_score=0,
            flags=[],
            is_suspicious=False
        )

    prompt = f"""You are a strict, robotic fraud detection system. You analyze extracted document data and output ONLY raw JSON. Do not explain your reasoning.

EXAMPLE INPUT:
{{
  "salary_slip.pdf": [{{"Net Pay": "50000"}}, {{"Gross": "55000"}}, {{"Deductions": "1000"}}]
}}
EXAMPLE OUTPUT:
{{
  "summary": "Math discrepancy found in salary slip: Gross (55000) - Deductions (1000) does not equal Net Pay (50000).",
  "suspicion_score": 80,
  "flags": [
    {{
      "severity": "high",
      "description": "Math error: 55000 - 1000 != 50000",
      "affected_document": "salary_slip.pdf"
    }}
  ],
  "is_suspicious": true
}}

REAL INPUT TO ANALYZE:
{json.dumps(extracted_data, indent=2)}

CRITICAL: Output ONLY a valid JSON object. No backticks. No markdown. No other text."""

    messages = [
        {"role": "system", "content": "You are a JSON-only bot. You never use markdown."},
        {"role": "user", "content": prompt}
    ]

    try:
        logger.info("Running offline AI inference...")
        response = pipe(
            messages,
            max_new_tokens=300,
            do_sample=False, # deterministic
            temperature=0.0,
            repetition_penalty=1.1
        )
        
        output_text = response[0]['generated_text'][-1]['content']
        logger.debug(f"Local AI Raw Output: {output_text}")
        
        # Clean up possible markdown backticks
        if output_text.startswith("```json"):
            output_text = output_text[7:]
        if output_text.startswith("```"):
            output_text = output_text[3:]
        if output_text.endswith("```"):
            output_text = output_text[:-3]
            
        parsed = json.loads(output_text.strip())
        
        flags = []
        for f in parsed.get("flags", []):
            try:
                flags.append(AIFlag(
                    severity=Severity(f.get("severity", "low")),
                    description=f.get("description", "Unknown flag"),
                    affected_document=f.get("affected_document")
                ))
            except Exception:
                pass

        return AIAnalysisResult(
            summary=parsed.get("summary", "Analysis complete."),
            suspicion_score=parsed.get("suspicion_score", 0),
            flags=flags,
            is_suspicious=parsed.get("is_suspicious", False)
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"Local AI JSON parse error: {e}")
        return AIAnalysisResult(
            summary="AI failed to generate valid JSON.",
            suspicion_score=50,
            flags=[AIFlag(severity=Severity.MEDIUM, description="AI parsing failed", affected_document=None)],
            is_suspicious=True
        )
    except Exception as e:
        logger.error(f"Local AI Error: {e}")
        return AIAnalysisResult(
            summary=f"Offline AI error: {str(e)}",
            suspicion_score=0,
            flags=[],
            is_suspicious=False
        )
