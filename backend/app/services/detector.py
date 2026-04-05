"""
Signal detector — dual mode:
- Rule-based: keyword scoring, returns candidates with low confidence
- LLM mode: OpenAI or Ollama, returns structured L1/L2/L3 with confidence
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
    # ── Adopt / Enact (政策通過) ──
    "formally adopted", "officially adopted", "was adopted", "were adopted",
    "has adopted", "have adopted", "has been adopted",
    "enacted", "was enacted", "has been enacted",
    "ratified", "was ratified", "has been ratified",
    "signed into law", "passed into law", "codified",
    # ── Establish / Institutionalize (制度建立) ──
    "formally established", "officially established",
    "was established", "were established", "has been established",
    "has established", "have established",
    "institutionalized", "was institutionalized",
    "operationalized", "was operationalized",
    "mainstreamed", "was mainstreamed",
    # ── Formalize / Incorporate (正式納入) ──
    "formalized", "was formalized", "has been formalized",
    "formally incorporated", "officially incorporated",
    "was integrated", "has been integrated", "integrated into",
    "embedded into", "embedded in",
    # ── Launch / Endorse / Recognize (啟動/背書/承認) ──
    "formally launched", "officially launched",
    "formally endorsed", "officially endorsed",
    "formally recognized", "officially recognized",
    "mandated", "gazetted", "officially gazetted",
    # ── Legal force (生效) ──
    "came into force", "entered into force", "took effect",
    "now requires", "now mandates",
    # ── Membership / Coalition (加入/結盟) ──
    "agreed to join", "joined the coalition", "agreed to cooperate",
    "agreed to participate", "persuaded to join",
    # ── Reform / Replace (改革/取代) ──
    "was reformed", "has been reformed",
    "was amended", "has been amended",
    "was replaced", "has been replaced",
    # ── Agreement language (合意) ──
    "both sides agreed", "legislators agreed",
    "approved", "unanimously approved",
    # Chinese
    "制度化", "正式採納", "通過", "確立", "同意加入",
    "納入", "生效", "頒布", "修訂",
}

L2_KEYWORDS = {
    # ── Agreed to [verb] (同意做某事) ──
    "agreed to establish", "agreed to develop", "agreed to implement",
    "agreed to integrate", "agreed to produce", "agreed to start",
    "agreed to collaborate", "agreed to work", "agreed to create",
    "agreed to conduct", "agreed to focus", "agreed to adopt",
    "agreed to support", "agreed to review",
    "it was agreed", "the group agreed",
    # ── Committed / Pledged (承諾) ──
    "committed to", "committed to establish", "committed to develop",
    "pledged to", "resolved to", "undertook to",
    "expressed commitment",
    # ── MOU / Formal agreement (簽署協議) ──
    "signed a memorandum", "signed an mou", "memorandum of understanding",
    "signed a letter of intent", "signed an agreement",
    "entered into an agreement", "entered into a partnership",
    # ── Planning / In progress (規劃/進行中) ──
    "planning to", "in process of", "in the process of",
    "piloting", "pilot program", "trial phase",
    "aiming to adopt", "intends to adopt", "intends to implement",
    "will begin adopting", "preparing to implement", "preparing to adopt",
    # ── Directional movement (朝向) ──
    "moving toward", "working toward", "transitioning to",
    "shifting toward", "significant step toward",
    # ── Initiation (啟動行動) ──
    "established contacts", "initiated discussions", "initiated engagement",
    "embarked on", "commenced", "set up a",
    "formed a committee", "formed a coalition", "formed a working group",
    "laid the groundwork", "setting the stage",
    "proposed organizing", "proposed creating",
    # Chinese
    "計畫導入", "承諾", "試行", "初步同意",
    "啟動", "籌備", "著手",
}

L3_KEYWORDS = {
    # ── Interest (興趣) ──
    "expressed interest", "expressed strong interest",
    "showed interest", "showed a high level of interest",
    "high level of interest",
    "indicated interest", "expressed interest in adopting",
    "showing interest in", "displayed interest",
    "receptive to", "open to exploring", "open to adopting",
    "expressed willingness", "willing to consider",
    # ── Awareness (意識/認知) ──
    "growing awareness of", "heightened awareness", "gaining awareness",
    "raised awareness", "raising awareness",
    "became aware of", "becoming aware of",
    "beginning to understand", "beginning to recognize",
    "beginning to explore",
    "recognition of the need", "recognized the need",
    "acknowledged the need", "acknowledged the importance",
    # ── Considering / Exploring (考慮/探索) ──
    "starting to consider", "considering",
    "exploring the possibility", "exploring options",
    "lean toward", "leaning toward",
    "discussing the possibility", "debating whether",
    "prompted to", "curious about",
    # ── Early-stage engagement (初步接觸) ──
    "legislators are now", "stakeholders acknowledge",
    "initial dialogue", "preliminary discussions",
    "first exposure to",
    # Chinese
    "表達興趣", "開始意識到", "討論中",
    "有意願", "初步接觸", "認知到",
}

CONTEXT_SECTION_NAMES = {"background", "context"}

# Sections where signals are unlikely to be valid
# Note: parser tags sections by keyword, so "proposed activities" → "activities".
# Only skip sections that are clearly not about observed changes.
SKIP_SECTIONS: set[str] = set()


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

    external_bonus = 0.1 if _has_external_subject(text) else 0.0
    # Activity objects (workshop, session, etc.) reduce confidence but don't eliminate signals
    activity_penalty = -0.15 if (l1_hits == 0 and _has_activity_object(text)) else 0.0

    if l1_hits > 0:
        return SignalLevel.L1, min(0.55 + l1_hits * 0.1 + external_bonus, 0.85)
    if l2_hits > 0:
        conf = max(0.25, min(0.45 + l2_hits * 0.1 + external_bonus + activity_penalty, 0.70))
        return SignalLevel.L2, conf
    if l3_hits > 0:
        conf = max(0.20, min(0.35 + l3_hits * 0.1 + external_bonus + activity_penalty, 0.60))
        return SignalLevel.L3, conf

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

## Examples

Paragraph: "The Ministry of Education formally adopted the new inclusive education policy in March 2024, requiring all public schools to integrate accessibility standards into their curricula."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L1", "subject": "Ministry of Education", "signal_type": "institutional", "confidence": 0.92, "reasoning": "The ministry has formally adopted a policy — this is a confirmed institutional change."}

Paragraph: "The two municipalities signed a memorandum of understanding to jointly develop a cross-border water management framework over the next 18 months."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L2", "subject": "The two municipalities", "signal_type": "institutional", "confidence": 0.75, "reasoning": "An MOU was signed with a concrete plan, but the framework is not yet implemented — committed intent."}

Paragraph: "Local government leaders expressed interest in replicating the community health model after attending the regional showcase event."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L3", "subject": "Local government leaders", "signal_type": "relational", "confidence": 0.55, "reasoning": "Interest was expressed but no commitment or concrete action was taken — awareness only."}

Paragraph: "The project team conducted 12 training workshops across 5 provinces, reaching a total of 340 participants including teachers and school administrators."
Answer: {"is_signal": false, "is_context_signal": false, "level": null, "subject": null, "signal_type": null, "confidence": 0.0, "reasoning": "This describes an activity performed by the project team, not a durable state change in an external actor."}

## Output format

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
