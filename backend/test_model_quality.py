"""
Model quality comparison script.
Compares rule-based vs Ollama (gemma3:4b) signal detection on test DOCX files.

Usage:
  1. Make sure Ollama is running: ollama serve
  2. Make sure gemma3:4b is pulled: ollama pull gemma3:4b
  3. Run: python test_model_quality.py

  Without Ollama, only rule-based results will be shown.
"""
import asyncio
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.parser import parse_docx
from app.services.detector import detect_rule_based, detect_llm

TEST_DIR = Path(__file__).parent.parent / "demo"
OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_MODEL = "gemma3:4b"


def print_header(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def print_signals(signals, label: str, max_show: int = 5):
    """Print signal summary for one detection run."""
    if not signals:
        print(f"  [{label}] No signals detected.")
        return

    levels = {}
    for s in signals:
        lv = s.level.value if hasattr(s.level, 'value') else str(s.level)
        levels[lv] = levels.get(lv, 0) + 1

    print(f"  [{label}] {len(signals)} signals: {levels}")

    # Show first few examples
    for i, s in enumerate(signals[:max_show]):
        lv = s.level.value if hasattr(s.level, 'value') else str(s.level)
        conf = f"{s.confidence:.2f}" if s.confidence else "?"
        subj = s.subject or "-"
        text_preview = s.text[:80].replace("\n", " ") + ("..." if len(s.text) > 80 else "")
        print(f"    {i+1}. [{lv}] conf={conf} subj={subj}")
        print(f"       {text_preview}")

    if len(signals) > max_show:
        print(f"    ... and {len(signals) - max_show} more")


async def test_ollama_available() -> bool:
    """Check if Ollama is reachable."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama", timeout=5.0)
        await client.models.list()
        return True
    except Exception as e:
        print(f"  Ollama not available: {e}")
        return False


async def run_comparison(file_path: Path, ollama_available: bool):
    """Run rule-based and optionally LLM detection on a single file."""
    print_header(file_path.name)

    # Parse
    try:
        anchors = parse_docx(file_path)
    except Exception as e:
        print(f"  Parse error: {e}")
        return None

    print(f"  Parsed: {len(anchors)} paragraphs")

    # Rule-based
    t0 = time.time()
    rule_signals = detect_rule_based(anchors)
    rule_time = time.time() - t0
    print_signals(rule_signals, f"Rule-based ({rule_time:.1f}s)")

    # LLM (Ollama)
    llm_signals = None
    if ollama_available:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama", timeout=120.0)

        t0 = time.time()
        try:
            llm_signals = await detect_llm(anchors, client, OLLAMA_MODEL)
            llm_time = time.time() - t0
            print_signals(llm_signals, f"Ollama/{OLLAMA_MODEL} ({llm_time:.1f}s)")
        except Exception as e:
            llm_time = time.time() - t0
            print(f"  [Ollama/{OLLAMA_MODEL}] Error after {llm_time:.1f}s: {e}")

    return {
        "file": file_path.name,
        "paragraphs": len(anchors),
        "rule_count": len(rule_signals),
        "llm_count": len(llm_signals) if llm_signals is not None else None,
    }


async def main():
    print_header("Mechela Signal Detection Quality Test")

    # Find test files
    if not TEST_DIR.exists():
        print(f"  Test directory not found: {TEST_DIR}")
        return

    docx_files = sorted(TEST_DIR.glob("*.docx"))
    if not docx_files:
        print(f"  No .docx files found in {TEST_DIR}")
        return

    print(f"  Found {len(docx_files)} test files")

    # Check Ollama
    print("\n  Checking Ollama...")
    ollama_ok = await test_ollama_available()
    if ollama_ok:
        print("  Ollama is available. Will compare both modes.")
    else:
        print("  Ollama not available. Showing rule-based only.")
        print(f"  To test LLM: install Ollama, run 'ollama pull {OLLAMA_MODEL}', then 'ollama serve'")

    # Run comparisons
    results = []
    for f in docx_files:
        r = await run_comparison(f, ollama_ok)
        if r:
            results.append(r)

    # Summary table
    print_header("Summary")
    print(f"  {'File':<45} {'Paras':>6} {'Rule':>6} {'LLM':>6}")
    print(f"  {'-'*45} {'-'*6} {'-'*6} {'-'*6}")
    for r in results:
        llm_str = str(r['llm_count']) if r['llm_count'] is not None else "N/A"
        print(f"  {r['file']:<45} {r['paragraphs']:>6} {r['rule_count']:>6} {llm_str:>6}")

    total_paras = sum(r['paragraphs'] for r in results)
    total_rule = sum(r['rule_count'] for r in results)
    total_llm = sum(r['llm_count'] for r in results if r['llm_count'] is not None)
    print(f"  {'-'*45} {'-'*6} {'-'*6} {'-'*6}")
    print(f"  {'TOTAL':<45} {total_paras:>6} {total_rule:>6} {total_llm:>6}")

    if ollama_ok and total_rule > 0:
        ratio = total_llm / total_rule if total_rule else 0
        print(f"\n  LLM/Rule ratio: {ratio:.2f}x")
        print(f"  (>1 = LLM finds more signals, <1 = LLM is more selective)")


if __name__ == "__main__":
    asyncio.run(main())
