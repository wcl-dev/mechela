# Mechela Demo Data — B_ Series Reports

四份 de-identified 季報及對應的專案結構、關鍵字匹配彙整，供 demo 使用。

**來源**：`B__test_1st/2nd/3rd Quarterly Report.docx` + `B__test_Final Narrative Report.docx`

---

## Objectives（已更新為完整英文句子）

| ID | Title（Objective statement） | 中文簡稱 |
|---|---|---|
| Obj 1 | **Empower diverse civil society to shape digital governance policies** | 公民社會培力 |
| Obj 2 | **Advance rights-based technical standards at national and regional levels** | 立法倡議 |
| Obj 3 | **Integrate digital rights safeguards into core network infrastructure** | 知識建構與公眾論壇 |

---

## Threads（含 progression summary）

### Obj 1 — Empower diverse civil society to shape digital governance policies

#### T1: Building and operating a local Internet Governance consultant group
> Progressed from compiling a 19-person candidate list (1st Q) to a standing consultant group of nine experts running three advisory meetings by 3rd Q, establishing a sustainable mechanism for domestic Internet-governance expertise to feed into HORIZON's work.

#### T2: Empowering local CSOs through workshops and coalition-building sessions
> From planning (1st Q) to a 20-participant platform-governance workshop (2nd Q) and a 22-stakeholder coalition-building session on DNS governance (3rd Q), culminating in Valeria's first civil coalition producing concrete Internet-governance policy recommendations.

#### T3: Bridging the local coalition to regional policy forums
> Day-0 event at the Regional Internet Policy Forum held in 3rd Q brought the local coalition into regional dialogue with CSO partners across the Asia-Pacific, creating an ongoing channel for Valerian civil society in regional policy conversations.

### Obj 2 — Advance rights-based technical standards at national and regional levels

#### T4: Engaging legislators to advance digital rights policy at the national level
> From post-election observation of legislative restructuring (1st Q) to established contacts with legislators' assistants (2nd Q), culminating in three meetings with Legislators X and Y (3rd Q) who both agreed to join the coalition — a significant step toward integrating human-rights considerations into Valeria's technical governance.

### Obj 3 — Integrate digital rights safeguards into core network infrastructure

#### T5: Building organizational knowledge base in Internet Governance
> Scoping review at ISTF 42 (1st Q), enriched with insights from the IDNA Regional Engagement Forum and OIF sessions (2nd Q), followed by active participation at RIPF (3rd Q) — HORIZON now has a systematic knowledge foundation for advocating on Internet governance.

#### T6: Amplifying IG discourse through public-facing forums
> Open Internet Forum sessions held monthly (from 2nd Q) introduced Internet-governance concepts to domestic CSOs and tech communities; after-event surveys indicate rising interest among Valerian civil society in continued IG discourse.

---

## L1 關鍵字（在四份報告中實際命中）

「已確認 / 已制度化」語言 — 內建關鍵字清單中，有以下詞彙出現在 B_ 系列報告內：

| 關鍵字 | 出現次數 | 語義群組 |
|---|---|---|
| `agreed to join` | 1 | 加入/結盟 |
| `have established` | 1 | 制度建立 |
| `were established` | 1 | 制度建立 |
| `integrated into` | 2 | 正式納入 |

**命中量：4 種詞彙、5 次出現**

## L2 關鍵字（實際命中）

「承諾 / 已啟動行動」語言：

| 關鍵字 | 出現次數 | 語義群組 |
|---|---|---|
| `committed to` | 1 | 承諾 |
| `established contacts` | 1 | 啟動行動 |
| `in the process of` | 3 | 進行中 |
| `it was agreed` | 1 | 合意 |

**命中量：4 種詞彙、6 次出現**

## L3 關鍵字（實際命中）

「興趣 / 意識」語言：

| 關鍵字 | 出現次數 | 語義群組 |
|---|---|---|
| `beginning to understand` | 1 | 意識 |
| `heightened awareness` | 1 | 意識 |
| `high level of interest` | 1 | 興趣 |
| `lean toward` | 1 | 考慮/探索 |
| `raising awareness` | 3 | 意識 |
| `showed a high level of interest` | 1 | 興趣 |
| `showed interest` | 1 | 興趣 |

**命中量：7 種詞彙、9 次出現**

### 備註：關鍵字清單已做過擬合清理（2026-04-19）

原本的 L1/L2/L3 清單為了提高 B_ 系列測試資料的召回率，加入了一些過擬合項目。已移除：

- L1：`persuaded to join`（太貼近 Final Report 原文）
- L2：`laid the groundwork`、`setting the stage`、`significant step toward`、`proposed organizing`、`proposed creating`（修辭性強、容易誤判）
- L3：`legislators are now`（只對立法遊說類專案有效）、`curious about`（太口語，正式報告少見）

同步加入跨領域通用詞彙（健康、教育、環境、人權）：

- L1：`received approval`、`gained approval`、`rolled out nationally`、`scaled up`、`became mandatory`、`incorporated into the curriculum` 等
- L2：`drafting the`、`under development`、`currently piloting`、`being rolled out` 等
- L3：`growing concern about`、`raised concerns about`、`requested training`、`entered into dialogue` 等
- 中文：`推行`、`研擬`、`草擬`、`表達關切`

---

## 省略關鍵字（Ignore / Internal Keywords）

以下組織名稱是報告中常出現但**不應被視為 signal 主體**的項目。設定到 Settings → Ignore 可降低誤報、讓系統更準確判斷「誰在改變」：

### 報告所屬組織（必加）

| 關鍵字 | 性質 |
|---|---|
| `HORIZON` | 報告撰寫組織（出現頻率極高） |
| `Horizon Institute` | 組織全名 |

### 內部主辦活動/產出的品牌（建議加）

| 關鍵字 | 性質 |
|---|---|
| `OIF` | Open Internet Forum — HORIZON 共同舉辦的月會 |
| `Open Internet Forum` | OIF 全稱 |

### 不加的（看似像組織但實為情境）

- `Valeria` — 虛構國家，是地理情境而非組織
- `IDNA`、`ISTF`、`RIPF` — **外部**國際治理組織，若它們做出改變（如採納政策）就是真正的 signal，不該被忽略
- `NNIC`、`RNIC` — 外部網路註冊機構，同上

---

## 活動描述詞彙（對照組，不進任何關鍵字清單）

供理解偵測器為何沒把大量活動描述誤認為 signal。這些動詞 + 活動對象的組合在四份報告中非常高頻，但 detector 的 activity-verb filter 正確排除了它們：

| 活動動詞 | 次數 | | 活動對象 | 次數 |
|---|---|---|---|---|
| conducted | 10 | | event | 39 |
| organized | 8 | | session | 24 |
| held | 6 | | workshop | 21 |
| participated | 6 | | report | 20 |
| compiled | 3 | | forum | 16 |
| presented | 2 | | meeting | 14 |
| attended | 1 | | capacity-building | 11 |
| hosted | 1 | | training | 7 |
| produced | 1 | | survey | 2 |

---

## Demo 使用建議

- **基礎模式偵測結果**（跑四份報告）：總計約 23 個 candidates，L1:L2:L3 ≈ 9:12:16，呈金字塔分布
- **1st Quarterly 只有 1 個** — 前期調研階段的真實樣貌，demo 時可以強調「少不是 bug，是報告本身還沒有 change signal」
- **3rd Quarterly 最密集（~11 個）** — 計畫中後期，signal 密度最高，最適合展示 ABC Review 流程
- **Final Narrative Report** — 含多個 L1 敘述，最適合展示 Markdown 匯出的最終成果
