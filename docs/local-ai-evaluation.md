# Local AI Provider Evaluation

Evaluated 2026-04-02. Three approaches were tested for privacy-preserving local LLM inference in Mechela.

> **Note (2026-04-04):** The default chat model has been changed from `phi4-mini` to `gemma3:4b` for better structured output quality. Test results below reflect the original phi4-mini evaluation.
> **Note (2026-04-07):** Default upgraded to `gemma4:e4b` — better reasoning at similar resource cost (~5 GB RAM at 4-bit quantization, 128K context).
> **Note (2026-04-19):** Default downgraded to `gemma4:e2b` for typical 8 GB GPUs (e.g. RX 7600) — e4b's 9.8 GB weights don't fit VRAM, causing CPU fallback and ~10x slowdown. e2b fits fully in VRAM at the cost of slightly weaker reasoning, still adequate for signal detection.

## Decision: Ollama

Ollama was selected as the sole local AI provider. Nexa SDK and llama-cpp-python branches were evaluated and rejected.

## Candidates Tested

### Ollama (selected)
- **Architecture**: External service at localhost:11434, OpenAI-compatible API
- **Install**: winget (Windows) / curl (Mac/Linux) + `ollama pull phi4-mini`
- **Speed**: ~4s per paragraph (CPU, auto-detects GPU)
- **Quality**: 16 signals detected on 19-paragraph report vs 3 for rule-based
- **Stability**: Stable across all tests, zero errors
- **Python version**: No dependency (independent binary)

### llama-cpp-python (rejected)
- **Architecture**: In-process Python library, no external service
- **Install**: `pip install llama-cpp-python` (needs `--only-binary` on Windows)
- **Speed**: ~9.5s per paragraph (CPU only with prebuilt wheel)
- **Quality**: Same as Ollama (same model: phi4-mini Q4_K_M)
- **Stability**: Stable, zero errors
- **Rejected because**: Prebuilt wheels only support Python 3.10-3.12. Users with 3.13+ cannot install without C++ build tools. 2.5x slower than Ollama on CPU. No automatic GPU detection.

### Nexa SDK (rejected)
- **Architecture**: In-process Python library with NPU support
- **Install**: `pip install nexaai` (1.9GB wheel)
- **Stability**: **Unstable** — token ID overflow errors, access violations on Windows, API documentation does not match actual SDK
- **Rejected because**: Runtime crashes, default model repo is private (HTTP 401), import paths in docs are wrong. Not viable for non-developer users.

## Quality Test Results (demo_final_report_en.docx, 19 paragraphs)

| Mode | Signals | L1 | L2 | L3 | Time |
|------|---------|----|----|-----|------|
| Rule-based | 3 | 3 | 0 | 0 | instant |
| Ollama/phi4-mini | 16 | 10 | 6 | 0 | 72s |
| llama-cpp/phi4-mini | 16 | ~10 | ~6 | 0 | 184s |
| Nexa SDK | N/A | - | - | - | crashed |

## Ollama Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| OpenAI-compat API marked experimental | High | Version-pin recommendation in README; auto-fallback to rule-based |
| Breaking changes on upgrade | Medium | Setup script does not auto-upgrade; README recommends specific version |
| Ollama service not running | Medium | Health check endpoint + UI hint to run setup script |
| Model renamed/removed | Low | Update repo default; users git pull |
| Company acquisition | Low | MIT license protects existing code |
| RAM insufficient (<8GB) | Medium | Degrades gracefully; rule-based always available |

## Models Used

- **Chat**: phi4-mini (3.8B params, ~2.5GB) — good structured JSON output
- **Embedding**: nomic-embed-text (137M params, ~270MB) — fast, 768-dim vectors

## Project Health (as of 2026-04-02)

- GitHub stars: 167,000
- Release cadence: every 1-3 days
- License: MIT
- Backed by: Ollama Inc (Y Combinator)
- New model support: within weeks of release (e.g., Llama 3.2)
