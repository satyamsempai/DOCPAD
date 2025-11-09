# Aarogya-Setu Demo Brief

## Slide 1: The Problem

**Rural Healthcare Challenges:**
- Clinicians managing 50-100+ patients with paper records
- No quick access to patient history during consultations
- Lab reports arrive as scanned images - time-consuming to interpret
- Risk of errors when manually transcribing values
- No decision support for identifying high-risk cases

**Impact:**
- Delayed care for patients with critical lab values
- Clinician burnout from administrative burden
- Missed opportunities for preventive interventions

---

## Slide 2: What We Built

**Aarogya-Setu - Swiss-Style Clinical Records System**

### Core Features:
1. **Smart Patient Search**
   - Instant ID-based lookup
   - Name search with confidence scoring
   - Keyboard-first navigation (Ctrl+K, arrows, Enter)

2. **Two-Column Patient View**
   - Left: Complete reports history (doctor notes + lab tests)
   - Right: AI-powered analysis panel

3. **Automated Lab Parser**
   - Regex-based extraction of HbA1c, FBS, BP, LDL, Creatinine
   - Threshold-based severity assessment (Low/Moderate/High)
   - Color-coded alerts for out-of-range values

4. **AI Analysis Panel**
   - 5-bullet visit summaries from doctor notes
   - Per-test severity breakdown
   - Overall severity badge
   - "Copy to Note" for quick documentation
   - Confidence scores + "Clinician to confirm" safeguards

### Design Philosophy:
- **Swiss Typography**: Clean hierarchy, generous whitespace, precise alignment
- **Accessible**: Full keyboard nav, ARIA labels, semantic HTML
- **Professional but Warm**: Clinical trust without coldness
- **Mobile-Ready**: Responsive grid, touch-optimized

---

## Slide 3: How to Demo (60 seconds)

### Setup:
- Open app at `http://localhost:8080`
- Show empty search page (Aarogya-Setu branding visible)

### Flow:

**1. ID Search (10s)**
- Type: `MHR-01-2024-7`
- Watch auto-highlight with pulse animation
- Press Enter

**2. Patient Overview (10s)**
- Show patient header: Rajesh Kumar, 54M, from Kalyanpur
- Point out sync status badge
- Explain two-column layout

**3. AI Analysis Panel (15s)**
- **Severity Badge**: "High - HbA1c 8.2% (≥8.0)"
- **Visit Summary**: 5 bullets from doctor note
- **Lab Analysis**: Show color-coded tests:
  - HbA1c: 8.2% (high/red)
  - FBS: 145 mg/dL (moderate/yellow)
  - BP: 138/88 (moderate/yellow)
- Expand "Parsed JSON" to show structured data
- Click "Copy to Note" → Show success toast

**4. Reports (10s)**
- Click Doctor Reports tab → Show note dated Jan 15
- Click Test Reports tab → Show parsed lab values
- Open modal to view full report content

**5. Back to Search (10s)**
- Click back arrow
- Type: `Sunita`
- Show multiple results with confidence bars
- Arrow down to navigate
- Explain: "Keyboard-first for speed in clinics"

**6. Wrap-up (5s)**
- "Built with React + Tailwind, mock API"
- "Lab parser uses regex + thresholds (no AI needed for deterministic rules)"
- "Ready for LLM integration for advanced summaries"

---

## Key Talking Points

### Technical:
- **Mock API**: 3 patients, full records (doctor notes + labs)
- **Lab Parser**: Regex patterns + threshold logic in `utils/labParser.ts`
- **Debounced Search**: 250ms delay, auto-highlight on ID match
- **Keyboard Shortcuts**: Ctrl+K anywhere, arrow nav, Enter to open
- **Responsive Grid**: 12-col base, 8/4 split on desktop

### Design:
- **Swiss Style**: No generic templates, custom design system
- **Color Tokens**: Teal (trust), Orange (alerts), Grays (hierarchy)
- **Typography**: Inter at 28px/20px/15px scale
- **Whitespace**: 8px vertical rhythm, generous padding

### Safety:
- **"Clinician to confirm" callout** on every AI suggestion
- **Confidence scores** shown (85% default)
- **No auto-apply**: All AI insights require clinician action
- **Deterministic first**: Regex parser for labs, LLM only for summaries

---

## Questions to Anticipate

**Q: Is this connected to real EMR systems?**
A: Currently mock data. Production would integrate via HL7/FHIR APIs.

**Q: What about OCR for scanned lab reports?**
A: Planned - upload modal ready, would use Tesseract/Google Vision API.

**Q: How accurate is the lab parser?**
A: Deterministic regex with known thresholds - 100% accurate if format matches. Falls back gracefully for non-standard formats.

**Q: Can clinicians edit AI suggestions?**
A: Copy-to-note feature allows editing before adding to chart. No auto-apply.

**Q: What about offline use?**
A: Designed for offline-first - local storage + sync queue (not yet implemented).

**Q: Why Swiss design for a healthcare app?**
A: Clarity and precision are clinical values. Swiss style communicates trustworthiness without being cold or sterile.

---

## Demo Success Metrics

- ✅ Show ID search → patient open in <5s
- ✅ Demonstrate severity badge + color-coded labs
- ✅ Prove keyboard navigation (Ctrl+K, arrows)
- ✅ Copy AI analysis to clipboard
- ✅ Explain safety guardrails (clinician confirmation)

---

**Demo Duration**: 60 seconds core, 2 minutes with Q&A

**Preparation**: 
- Clear browser cache
- Test all keyboard shortcuts
- Have backup screenshots ready
- Practice the "ID search → AI analysis → copy note" flow

**Key Message**: 
"We built a professional-grade clinical tool that respects clinician expertise while accelerating routine tasks. Swiss design meets AI-powered decision support."
