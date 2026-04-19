"""Diagnostic: run detect_llm on a test report and log every decision."""
import asyncio
import sys, io, json
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')

from openai import AsyncOpenAI
from app.services.parser import parse_docx
from app.services.detector import (
    _is_heading, _is_structural, _kw_match,
    ACTIVITY_VERBS, L1_KEYWORDS, L2_KEYWORDS, L3_KEYWORDS, SKIP_SECTIONS,
)
import re


SYSTEM_PROMPT = """You are an M&E analyst. Analyze each paragraph and determine if it describes a Change Signal.

A Change Signal describes a DURABLE STATE CHANGE in an identifiable actor (person, organization, policy, practice).

IS a signal: a new policy adopted, a commitment signed, an institution restructured, a practice formally changed.
NOT a signal: an activity performed, an event held, a document produced, a meeting attended, a plan proposed without action, a section heading, a reflection or lesson learned, a statistic or headcount.

When in doubt, set is_signal to false. Only mark true when the paragraph clearly describes a state that has changed or is changing.

Level definitions:
- L1: Confirmed/institutionalized
- L2: Committed intent or trial
- L3: Awareness/interest only

Respond with valid JSON only:
{"is_signal": true/false, "is_context_signal": true/false, "level": "L1"/"L2"/"L3"/null, "subject": "...", "signal_type": "capability"/"institutional"/"relational"/null, "confidence": 0.0-1.0, "reasoning": "..."}"""


async def main():
    report_path = Path(r'c:\Users\Cordura87\mechela\demo\MEL test report\B__test_3rd Quarterly Report.docx')
    print(f"=== Running on: {report_path.name} ===\n")

    anchors = parse_docx(report_path)
    print(f"Total anchors: {len(anchors)}\n")

    client = AsyncOpenAI(base_url='http://localhost:11434/v1', api_key='ollama', timeout=120)
    model = 'gemma4:e4b'

    stats = {
        'total': 0,
        'skipped_heading': 0,
        'skipped_structural': 0,
        'llm_called': 0,
        'llm_parse_error': 0,
        'llm_said_no': 0,
        'llm_said_yes': 0,
        'post_heading': 0,
        'post_skip_section': 0,
        'post_low_conf': 0,
        'final_signals': 0,
    }
    yes_signals = []

    for i, anchor in enumerate(anchors):
        stats['total'] += 1
        if _is_heading(anchor.text):
            stats['skipped_heading'] += 1
            continue
        if _is_structural(anchor.text):
            stats['skipped_structural'] += 1
            continue
        stats['llm_called'] += 1

        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Paragraph:\n{anchor.context_text}"},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            raw = resp.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            raw = re.sub(r",\s*}", "}", raw)
            data = json.loads(raw)

            is_sig = data.get("is_signal")
            if not is_sig:
                stats['llm_said_no'] += 1
                continue
            stats['llm_said_yes'] += 1
            conf = float(data.get("confidence", 0.7))
            level = data.get("level")
            print(f"[¶{anchor.paragraph_index}] LLM YES  level={level} conf={conf:.2f}")
            print(f"  text: {anchor.text[:90]}...")

            # Simulate post-processing filter
            if _is_heading(anchor.text):
                stats['post_heading'] += 1
                print(f"  → POST-FILTER: heading")
                continue
            if anchor.section in SKIP_SECTIONS:
                stats['post_skip_section'] += 1
                print(f"  → POST-FILTER: skip section")
                continue
            if conf < 0.4:
                stats['post_low_conf'] += 1
                print(f"  → POST-FILTER: low confidence")
                continue
            stats['final_signals'] += 1
            yes_signals.append((anchor.paragraph_index, level, conf))
            print(f"  → KEPT")
        except json.JSONDecodeError as e:
            stats['llm_parse_error'] += 1
            print(f"[¶{anchor.paragraph_index}] JSON ERROR: {e}")
            print(f"  raw: {raw[:200]}")
        except Exception as e:
            print(f"[¶{anchor.paragraph_index}] ERROR: {type(e).__name__}: {e}")

        if i % 20 == 0:
            print(f"\n[progress {i+1}/{len(anchors)} stats so far: {stats}]\n")

    print(f"\n=== Final Stats ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"\nFinal signals: {len(yes_signals)}")


if __name__ == "__main__":
    asyncio.run(main())
