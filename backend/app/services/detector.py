"""
Signal detector — dual mode:
- Rule-based: keyword scoring, returns candidates with low confidence
- LLM mode: OpenAI GPT-4o, returns structured L1/L2/L3 with confidence
"""
import re
from dataclasses import dataclass
from app.models.signal import SignalLevel, SignalType, SignalStatus
from app.services.parser import ParsedAnchor


def _kw_match(text: str, keywords: set) -> int:
    """Match keywords using word boundaries to avoid substring false positives."""
    lower = text.lower()
    count = 0
    for kw in keywords:
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, lower):
            count += 1
    return count

# ── Rule-based keyword lists ──────────────────────────────────────────────────

ACTIVITY_VERBS = {
    "participated", "attended", "held", "organized", "hosted",
    "conducted", "visited", "presented", "submitted", "published",
    "posted", "sent", "drafted", "prepared", "compiled", "produced",
    "completed activity", "finalized report",
}

# If an intent keyword is followed by an activity object, it's not a signal
ACTIVITY_OBJECTS = {
    "event", "meeting", "workshop", "conference", "seminar", "webinar",
    "session", "forum", "report", "document", "presentation", "survey",
    "interview", "training", "capacity-building",
}

L1_KEYWORDS = {
    # Institutional action — confirmed, past tense
    "mandated", "institutionalized", "enacted", "formalized", "ratified",
    "gazetted", "came into force", "entered into force", "took effect",
    "formally adopted", "officially adopted", "formally incorporated",
    "officially incorporated", "formally established", "officially established",
    "formally launched", "officially launched", "officially endorsed",
    "formally endorsed", "officially recognized", "formally recognized",
    "officially gazetted", "signed into law",
    # Membership / coalition
    "agreed to join", "joined the coalition", "agreed to cooperate",
    # Agreement language
    "both sides agreed", "legislators agreed", "has been adopted",
    "has adopted", "have adopted", "has established", "have established",
    # Legacy / mandate
    "now requires", "now mandates", "approved",
    # Chinese
    "制度化", "正式採納", "通過", "確立", "同意加入",
}

L2_KEYWORDS = {
    # Commitment / intent with concrete action
    "committed to", "agreed to establish", "agreed to develop",
    "agreed to implement", "agreed to integrate", "agreed to produce",
    "agreed to start", "agreed to collaborate", "agreed to work",
    "agreed to create", "agreed to conduct",
    # MOU / formal agreement signed
    "signed a memorandum", "signed an mou", "memorandum of understanding",
    "signed a letter of intent", "signed an agreement",
    # Planning / in progress
    "planning to", "in process of", "piloting", "aiming to adopt",
    "intends to adopt", "will begin adopting", "preparing to implement",
    "moving toward", "expressed commitment", "committed to establish",
    "committed to develop",
    # Chinese
    "計畫導入", "承諾", "試行", "初步同意",
}

L3_KEYWORDS = {
    # Interest / awareness without commitment
    "expressed interest", "expressed strong interest", "showed interest",
    "indicated interest", "expressed interest in adopting",
    "growing awareness of", "beginning to understand",
    "beginning to recognize", "showing interest in",
    "recognition of the need", "raised awareness about",
    "starting to consider", "considering", "exploring the possibility",
    "legislators are now", "stakeholders acknowledge",
    # Chinese
    "表達興趣", "開始意識到", "討論中",
}

CONTEXT_SECTION_NAMES = {"background", "context"}

# Sections where signals are unlikely to be valid
SKIP_SECTIONS = {"proposed activities", "challenges", "lessons"}


@dataclass
class DetectedSignal:
    anchor_index: int
    text: str
    subject: str | None
    level: SignalLevel
    signal_type: SignalType | None
    status: SignalStatus
    confidence: float
    llm_mode: bool


def _is_heading(text: str) -> bool:
    """Filter out section headings and short label-like texts."""
    stripped = text.strip()
    if len(stripped.split()) < 6:
        return True
    if stripped[0].isdigit() and stripped[1] in ".):":
        return True
    return False


def _has_activity_object(text: str) -> bool:
    """Check if intent keywords are directed at activities rather than state changes."""
    lower = text.lower()
    return any(obj in lower for obj in ACTIVITY_OBJECTS)


def _has_external_subject(text: str) -> bool:
    """Prefer signals where the subject is an external actor, not the reporting org."""
    from app.core.settings_store import get_internal_keywords
    lower = text.lower()
    internal = {"we ", "our ", "the organization", "the team"}
    custom = get_internal_keywords()
    if custom:
        internal = internal | {k.lower() for k in custom}
    external_hints = {
        "legislator", "government", "ministry", "company", "companies",
        "stakeholder", "partner", "coalition", "community", "both sides",
        "lawmakers", "policy", "law ", "regulation", "amendment",
    }
    has_internal = any(p in lower for p in internal)
    has_external = any(p in lower for p in external_hints)
    return has_external or not has_internal


def _score_rule(
    text: str,
    l1_kw: set = L1_KEYWORDS,
    l2_kw: set = L2_KEYWORDS,
    l3_kw: set = L3_KEYWORDS,
) -> tuple[SignalLevel | None, float]:
    lower = text.lower()

    if _is_heading(text):
        return None, 0.0

    activity_hits = _kw_match(text, ACTIVITY_VERBS)
    l1_hits = _kw_match(text, l1_kw)
    l2_hits = _kw_match(text, l2_kw)
    l3_hits = _kw_match(text, l3_kw)

    if activity_hits > 0 and (l1_hits + l2_hits + l3_hits) == 0:
        return None, 0.0

    # L2/L3 pointing at activity objects → not a real signal
    if l1_hits == 0 and _has_activity_object(text):
        return None, 0.0

    external_bonus = 0.1 if _has_external_subject(text) else 0.0

    if l1_hits > 0:
        return SignalLevel.L1, min(0.55 + l1_hits * 0.1 + external_bonus, 0.85)
    if l2_hits > 0:
        return SignalLevel.L2, min(0.45 + l2_hits * 0.1 + external_bonus, 0.70)
    if l3_hits > 0:
        return SignalLevel.L3, min(0.35 + l3_hits * 0.1 + external_bonus, 0.60)

    return None, 0.0


def _merge_custom_keywords() -> tuple[set, set, set]:
    """Merge built-in keywords with user-defined custom keywords."""
    from app.core.settings_store import get_custom_keywords
    custom = get_custom_keywords()
    l1 = L1_KEYWORDS | {k.lower() for k in custom.get("L1", [])}
    l2 = L2_KEYWORDS | {k.lower() for k in custom.get("L2", [])}
    l3 = L3_KEYWORDS | {k.lower() for k in custom.get("L3", [])}
    return l1, l2, l3


def detect_rule_based(anchors: list[ParsedAnchor]) -> list[DetectedSignal]:
    custom_l1, custom_l2, custom_l3 = _merge_custom_keywords()
    results = []
    for anchor in anchors:
        # Skip sections where signals are unlikely
        if anchor.section in SKIP_SECTIONS:
            continue

        is_context_section = anchor.section in CONTEXT_SECTION_NAMES
        level, confidence = _score_rule(anchor.text, custom_l1, custom_l2, custom_l3)

        if level is None:
            continue

        status = SignalStatus.CONTEXT if is_context_section else SignalStatus.CANDIDATE

        results.append(DetectedSignal(
            anchor_index=anchor.paragraph_index,
            text=anchor.text,
            subject=None,
            level=level,
            signal_type=None,
            status=status,
            confidence=confidence,
            llm_mode=False,
        ))
    return results


async def detect_llm(
    anchors: list[ParsedAnchor],
    client: "AsyncOpenAI",
    model: str = "gpt-4o-mini",
) -> list[DetectedSignal]:
    import json
    import re
    from openai import AsyncOpenAI

    results = []

    SYSTEM_PROMPT = """You are an M&E analyst. Analyze each paragraph and determine if it describes a Change Signal.

A Change Signal describes a DURABLE STATE CHANGE in an identifiable actor (person, organization, policy, practice).

IS a signal: a new policy adopted, a commitment signed, an institution restructured, a practice formally changed.
NOT a signal: an activity performed, an event held, a document produced, a meeting attended, a plan proposed without action, a section heading, a reflection or lesson learned, a statistic or headcount.

When in doubt, set is_signal to false. Only mark true when the paragraph clearly describes a state that has changed or is changing.

Level definitions (do NOT inflate — choose the lowest level that fits):
- L1: Confirmed/institutionalized — the change is done (adopted, enacted, formally established, integrated)
- L2: Committed intent or trial — concrete commitment exists (agreed to start, signed MOU, piloting)
- L3: Awareness/interest only — no commitment yet (discussing, expressing interest, growing awareness)

You MUST respond with valid JSON only. Do NOT wrap the JSON in markdown code fences or add any other text.

{
  "is_signal": true/false,
  "is_context_signal": true/false,
  "level": "L1"/"L2"/"L3"/null,
  "subject": "who/what is changing",
  "signal_type": "capability"/"institutional"/"relational"/null,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}"""

    for anchor in anchors:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Paragraph:\n{anchor.context_text}"},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            raw = response.choices[0].message.content.strip()
            # Strip markdown code fences that smaller models sometimes add
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            # Fix trailing commas before closing braces (common small-model error)
            raw = re.sub(r",\s*}", "}", raw)
            data = json.loads(raw)

            if not data.get("is_signal"):
                continue

            level_map = {"L1": SignalLevel.L1, "L2": SignalLevel.L2, "L3": SignalLevel.L3}
            level = level_map.get(data.get("level"), SignalLevel.PENDING)
            status = SignalStatus.CONTEXT if data.get("is_context_signal") else SignalStatus.CANDIDATE

            type_map = {
                "capability": SignalType.CAPABILITY,
                "institutional": SignalType.INSTITUTIONAL,
                "relational": SignalType.RELATIONAL,
            }

            results.append(DetectedSignal(
                anchor_index=anchor.paragraph_index,
                text=anchor.text,
                subject=data.get("subject"),
                level=level,
                signal_type=type_map.get(data.get("signal_type")),
                status=status,
                confidence=float(data.get("confidence", 0.7)),
                llm_mode=True,
            ))
        except Exception:
            continue

    # Post-processing: filter obvious false positives from LLM output
    anchor_map = {a.paragraph_index: a for a in anchors}
    filtered = []
    for s in results:
        anchor = anchor_map.get(s.anchor_index)
        # Skip headings / very short text
        if _is_heading(s.text):
            continue
        # Skip signals from sections unlikely to contain real changes
        if anchor and anchor.section in SKIP_SECTIONS:
            continue
        filtered.append(s)
    return filtered


def calculate_output_ratio(total_anchors: int, signal_count: int) -> float:
    if total_anchors == 0:
        return 0.0
    return signal_count / total_anchors
