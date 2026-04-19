"""Diagnostic: run detect_llm on a test report and log every decision.

Writes progressively to diagnose_output.txt so progress is visible even
while the script is still running (avoids stdout buffering issues under
shell redirect)."""
import asyncio
import sys, io, json, re
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')

from openai import AsyncOpenAI
from app.services.parser import parse_docx
from app.services.detector import (
    _is_heading, _is_structural,
    SKIP_SECTIONS,
)


OUT = Path('diagnose_output.txt')

def log(line: str = ""):
    with OUT.open('a', encoding='utf-8') as f:
        f.write(line + "\n")
        f.flush()
    print(line, flush=True)


# Import the live SYSTEM_PROMPT from detector (keep in sync)
from app.services.detector import detect_llm as _dl  # noqa
# Extract prompt from function's local string via textual read instead
SYSTEM_PROMPT_SOURCE = Path('app/services/detector.py').read_text(encoding='utf-8')
_m = re.search(r'SYSTEM_PROMPT = """(.*?)"""', SYSTEM_PROMPT_SOURCE, re.DOTALL)
SYSTEM_PROMPT = _m.group(1) if _m else ""
assert SYSTEM_PROMPT, "Failed to extract SYSTEM_PROMPT"


async def main():
    OUT.write_text("", encoding='utf-8')  # reset
    report_path = Path(r'c:\Users\Cordura87\mechela\demo\MEL test report\B__test_3rd Quarterly Report.docx')
    log(f"=== Running on: {report_path.name} ===")

    anchors = parse_docx(report_path)
    log(f"Total anchors: {len(anchors)}\n")

    client = AsyncOpenAI(base_url='http://localhost:11434/v1', api_key='ollama', timeout=120)
    model = 'gemma4:e2b'

    stats = {
        'total': 0,
        'skipped_heading': 0,
        'skipped_structural': 0,
        'llm_called': 0,
        'llm_parse_error': 0,
        'llm_other_error': 0,
        'llm_said_no': 0,
        'llm_said_yes': 0,
        'post_heading': 0,
        'post_skip_section': 0,
        'post_low_conf': 0,
        'final_signals': 0,
    }

    for i, anchor in enumerate(anchors):
        stats['total'] += 1
        if _is_heading(anchor.text):
            stats['skipped_heading'] += 1
            continue
        if _is_structural(anchor.text):
            stats['skipped_structural'] += 1
            continue
        stats['llm_called'] += 1

        raw = ""
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Paragraph:\n{anchor.text}"},
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
            conf = float(data.get("confidence", 0.7))
            level = data.get("level")

            if not is_sig:
                stats['llm_said_no'] += 1
                log(f"[¶{anchor.paragraph_index}] NO   conf={conf:.2f} | reason: {data.get('reasoning','')[:80]}")
                continue
            stats['llm_said_yes'] += 1
            log(f"[¶{anchor.paragraph_index}] YES  level={level} conf={conf:.2f}")
            log(f"  text: {anchor.text[:100]}...")

            if _is_heading(anchor.text):
                stats['post_heading'] += 1
                log(f"  → FILTERED: heading")
                continue
            if anchor.section in SKIP_SECTIONS:
                stats['post_skip_section'] += 1
                log(f"  → FILTERED: skip-section ({anchor.section})")
                continue
            if conf < 0.4:
                stats['post_low_conf'] += 1
                log(f"  → FILTERED: low-conf ({conf:.2f})")
                continue
            stats['final_signals'] += 1
            log(f"  → KEPT")
        except json.JSONDecodeError as e:
            stats['llm_parse_error'] += 1
            log(f"[¶{anchor.paragraph_index}] JSON ERROR: {e}")
            log(f"  raw (first 200 chars): {raw[:200]}")
        except Exception as e:
            stats['llm_other_error'] += 1
            log(f"[¶{anchor.paragraph_index}] ERROR: {type(e).__name__}: {e}")

    log("")
    log("=== Final Stats ===")
    for k, v in stats.items():
        log(f"  {k}: {v}")
    log(f"\nFinal signals: {stats['final_signals']}")


if __name__ == "__main__":
    asyncio.run(main())
