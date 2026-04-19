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
    # ── Approval / Endorsement (核准/背書) ──
    "received approval", "gained approval", "was approved by",
    "has been approved", "officially approved",
    # ── Establish / Institutionalize (制度建立) ──
    "formally established", "officially established",
    "was established", "were established", "has been established",
    "has established", "have established",
    "institutionalized", "was institutionalized",
    "operationalized", "was operationalized",
    "mainstreamed", "was mainstreamed", "has been mainstreamed",
    # ── Formalize / Incorporate (正式納入) ──
    "formalized", "was formalized", "has been formalized",
    "formally incorporated", "officially incorporated",
    "was integrated", "has been integrated", "integrated into",
    "embedded into", "embedded in",
    "incorporated into the curriculum", "adopted into the curriculum",
    # ── Roll-out / Scale (規模化/推廣) ──
    "rolled out nationally", "rolled out across", "was rolled out",
    "scaled up", "was scaled up", "has been scaled up",
    # ── Launch / Endorse / Recognize (啟動/背書/承認) ──
    "formally launched", "officially launched",
    "formally endorsed", "officially endorsed",
    "formally recognized", "officially recognized",
    "mandated", "gazetted", "officially gazetted",
    # ── Legal force (生效) ──
    "came into force", "entered into force", "took effect",
    "now requires", "now mandates", "became mandatory",
    # ── Membership / Coalition (加入/結盟) ──
    "agreed to join", "joined the coalition", "agreed to cooperate",
    "agreed to participate",
    # ── Reform / Replace (改革/取代) ──
    "was reformed", "has been reformed",
    "was amended", "has been amended",
    "was replaced", "has been replaced",
    # ── Agreement language (合意) ──
    "both sides agreed",
    "approved", "unanimously approved",
    # Chinese
    "制度化", "正式採納", "通過", "確立", "同意加入",
    "納入", "生效", "頒布", "修訂", "推行",
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
    # ── Drafting / Development (起草/研擬中) ──
    "drafting the", "under development", "currently developing",
    "in draft form", "at the drafting stage",
    # ── Roll-out in progress (推動中) ──
    "currently piloting", "being rolled out", "rolling out",
    # ── Directional movement (朝向) ──
    "moving toward", "working toward", "transitioning to", "shifting toward",
    # ── Initiation (啟動行動) ──
    "established contacts", "initiated discussions", "initiated engagement",
    "embarked on", "commenced", "set up a",
    "formed a committee", "formed a coalition", "formed a working group",
    # Chinese
    "計畫導入", "承諾", "試行", "初步同意",
    "啟動", "籌備", "著手", "研擬", "草擬",
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
    "requested training", "requesting information",
    # ── Awareness (意識/認知) ──
    "growing awareness of", "heightened awareness", "gaining awareness",
    "raised awareness", "raising awareness",
    "became aware of", "becoming aware of",
    "beginning to understand", "beginning to recognize",
    "beginning to explore",
    "recognition of the need", "recognized the need",
    "acknowledged the need", "acknowledged the importance",
    # ── Concerns raised (提出擔憂) ──
    "growing concern about", "rising concern about",
    "raised concerns about",
    # ── Considering / Exploring (考慮/探索) ──
    "starting to consider", "considering",
    "exploring the possibility", "exploring options",
    "lean toward", "leaning toward",
    "discussing the possibility", "debating whether",
    # ── Early-stage engagement (初步接觸) ──
    "stakeholders acknowledge",
    "initial dialogue", "preliminary discussions",
    "first exposure to",
    "entered into dialogue", "opened dialogue with",
    # Chinese
    "表達興趣", "開始意識到", "討論中",
    "有意願", "初步接觸", "認知到", "表達關切",
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


# Patterns for structural / non-narrative text (indicators, metrics, metadata)
_STRUCTURAL_PATTERNS = re.compile(
    r'(?i)'
    r'(?:^indicator\s+\d)'             # "Indicator 1.3: ..."
    r'|(?:output total for reporting)'  # "Output total for reporting period"
    r'|(?:cumulative output)'           # "Cumulative output for project"
    r'|(?:\(target:\s*\d)'             # "(target: 1)"
    r'|(?:^organization name\s*:)'     # metadata fields
    r'|(?:^project (?:title|code)\s*:)'
    r'|(?:^reporting period\s*:?)'
    r'|(?:^grant (?:number|dates)\s*:)'
    r'|(?:^(?:sub)?grantee\s*:)'
)


def _is_structural(text: str) -> bool:
    """Filter out indicator definitions, metric summaries, and metadata fields."""
    return bool(_STRUCTURAL_PATTERNS.search(text.strip()))


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


def compute_matched_user_keywords(text: str) -> dict[str, list[str]]:
    """Return which user-defined keywords match this text, grouped by level.
    Independent of LLM judgement — used as a second opinion during review."""
    from app.core.settings_store import get_custom_keywords
    custom = get_custom_keywords()
    lower = text.lower()
    result: dict[str, list[str]] = {"L1": [], "L2": [], "L3": []}
    for level in ("L1", "L2", "L3"):
        for kw in custom.get(level, []):
            pattern = r'\b' + re.escape(kw.lower()) + r'\b'
            if re.search(pattern, lower):
                result[level].append(kw)
    return result


def detect_rule_based(anchors: list[ParsedAnchor]) -> list[DetectedSignal]:
    custom_l1, custom_l2, custom_l3 = _merge_custom_keywords()
    results = []
    for anchor in anchors:
        # Skip sections where signals are unlikely
        if anchor.section in SKIP_SECTIONS:
            continue
        # Skip structural text (indicators, metrics, metadata)
        if _is_structural(anchor.text):
            continue

        is_context_section = anchor.section in CONTEXT_SECTION_NAMES
        level, confidence = _score_rule(anchor.text, custom_l1, custom_l2, custom_l3)

        if level is None:
            continue

        # If from a Background/Context section, mark level as CONTEXT
        if is_context_section:
            level = SignalLevel.CONTEXT

        results.append(DetectedSignal(
            anchor_index=anchor.paragraph_index,
            text=anchor.text,
            subject=None,
            level=level,
            signal_type=None,
            status=SignalStatus.PENDING,
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

IS a signal: a new policy adopted, a commitment signed, an institution restructured, a practice formally changed, an external actor expressing interest or agreeing to do something concrete.
NOT a signal: a pure activity description with no outcome (e.g. "we held a workshop"), a list of attendees, a section heading, a logistical update, a statistic or headcount.

CRITICAL: Signals are OFTEN embedded inside descriptions of meetings, workshops, sessions, or discussions. Do not reject a paragraph just because it mentions an activity or event — look for the state change described within it. Typical pattern: "During the [meeting/workshop/session], [actor] [agreed to / committed to / adopted / joined / endorsed / expressed interest in / acknowledged the need for] [specific thing]."

Level definitions (do NOT inflate — choose the lowest level that fits):
- L1: Confirmed/institutionalized — the change is done (adopted, enacted, formally established, integrated, signed into law)
- L2: Committed intent or trial — concrete commitment exists (agreed to start, signed MOU, piloting, working on draft)
- L3: Awareness/interest only — no commitment yet (discussing, expressing interest, growing awareness)

## Examples

Paragraph: "The Ministry of Education formally adopted the new inclusive education policy in March 2024, requiring all public schools to integrate accessibility standards into their curricula."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L1", "subject": "Ministry of Education", "signal_type": "institutional", "confidence": 0.92, "reasoning": "The ministry has formally adopted a policy — a confirmed institutional change."}

Paragraph: "During the coalition-building session, five organisations agreed to form a working group on platform-auditing methodologies and submit a draft charter within 90 days."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L2", "subject": "Five civil society organisations", "signal_type": "institutional", "confidence": 0.82, "reasoning": "Although wrapped in a 'session' description, the paragraph reports a concrete agreement by identifiable actors to form a working group with a timeline — committed intent."}

Paragraph: "At the third advisory meeting, two legislators from opposing parties agreed to join the coalition and publicly endorse the draft principles at the next parliamentary session."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L1", "subject": "Two legislators from opposing parties", "signal_type": "relational", "confidence": 0.88, "reasoning": "Meeting is the wrapper, but the legislators joining the coalition is a confirmed relational change."}

Paragraph: "The two municipalities signed a memorandum of understanding to jointly develop a cross-border water management framework over the next 18 months."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L2", "subject": "The two municipalities", "signal_type": "institutional", "confidence": 0.78, "reasoning": "An MOU was signed with a concrete plan — committed intent."}

Paragraph: "Local government leaders expressed interest in replicating the community health model after attending the regional showcase event."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L3", "subject": "Local government leaders", "signal_type": "relational", "confidence": 0.58, "reasoning": "Interest expressed by an external actor — awareness only, but a valid L3 signal."}

Paragraph: "Six responses to the after-event survey indicated rising interest among civil society in continued engagement on the topic."
Answer: {"is_signal": true, "is_context_signal": false, "level": "L3", "subject": "Civil society respondents", "signal_type": "relational", "confidence": 0.52, "reasoning": "Embedded in survey results, but clearly reports external-actor interest in continued engagement."}

Paragraph: "The project team conducted 12 training workshops across 5 provinces, reaching a total of 340 participants including teachers and school administrators."
Answer: {"is_signal": false, "is_context_signal": false, "level": null, "subject": null, "signal_type": null, "confidence": 0.0, "reasoning": "Pure activity count by the reporting team, with no downstream state change mentioned."}

Paragraph: "The following are screening criteria; priority will be given to those that meet more of them."
Answer: {"is_signal": false, "is_context_signal": false, "level": null, "subject": null, "signal_type": null, "confidence": 0.0, "reasoning": "Transitional sentence introducing methodology, not a change in any actor."}

Paragraph: "Participants included representatives from government agencies, academic institutions, private sector companies, and community-based organizations."
Answer: {"is_signal": false, "is_context_signal": false, "level": null, "subject": null, "signal_type": null, "confidence": 0.0, "reasoning": "Lists who attended an event — participant composition, not a durable change."}

Paragraph: "We organized a two-day regional dialogue event bringing together practitioners and policymakers to share experiences on the topic."
Answer: {"is_signal": false, "is_context_signal": false, "level": null, "subject": null, "signal_type": null, "confidence": 0.0, "reasoning": "Describes an event organized by the reporting team with no mentioned outcome — an activity, not a state change."}

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
        # Skip structural text before calling LLM (save API calls)
        if _is_heading(anchor.text) or _is_structural(anchor.text):
            continue
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Paragraph:\n{anchor.text}"},
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
            if data.get("is_context_signal"):
                level = SignalLevel.CONTEXT
            status = SignalStatus.PENDING

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
        # Skip low-confidence signals (small models tend to inflate)
        if s.confidence < 0.4:
            continue
        filtered.append(s)
    return filtered


def calculate_output_ratio(total_anchors: int, signal_count: int) -> float:
    if total_anchors == 0:
        return 0.0
    return signal_count / total_anchors
