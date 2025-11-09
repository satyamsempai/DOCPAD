# Aarogya-Setu Clinical Records System

A Swiss-style clinical records application for rural healthcare with AI-powered lab analysis.

## Features

- **Patient Search**: Smart search with Patient ID detection and name matching
- **Two-Column Patient View**: Reports on left, AI analysis on right
- **Lab Parser**: Automated parsing of lab values with threshold-based severity assessment
- **AI Analysis Panel**: Visit summaries and lab interpretations with confidence scores
- **Keyboard Navigation**: Full keyboard support (Ctrl+K to focus search, arrow keys, Enter)
- **Responsive Design**: Mobile-first with desktop optimization
- **Accessibility**: ARIA labels, semantic HTML, keyboard shortcuts

## Design System

### Colors
- **Primary (Teal)**: `#0EA5A4` - Clinical trust and professionalism
- **Accent (Orange)**: `#FB923C` - Alerts and CTAs
- **Neutrals**: Slate grays for hierarchy and readability

### Typography
- **Font Family**: Inter (sans-serif), JetBrains Mono (monospace for IDs)
- **Scale**: 28px (H1), 20px (H2), 15px (body)
- **Vertical Rhythm**: 8px base scale

### Layout
- **Grid**: 12-column responsive grid
- **Patient View**: 8 columns (left) + 4 columns (right) on desktop
- **Whitespace**: Generous spacing following Swiss design principles

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI components
- React Router
- Lucide icons

## Installation & Setup

```bash
# Install dependencies
npm install

# Set up environment variables (optional - only if using backend)
cp .env.example .env.local
# Edit .env.local and set VITE_API_BASE_URL to your backend API URL

# Run development server
npm run dev

# Build for production
npm run build
```

The app will be available at `http://localhost:8080`

### Environment Variables

**For Frontend (`.env.local`):**
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

**Important:** The Google Gemini API key should be stored in your **backend** server's environment variables, not in the frontend. See `API_KEY_SETUP.md` for detailed instructions on where to place the API key.

## Usage

### Search Patients
1. Type patient name or ID in the search box
2. Press `Ctrl+K` (or `Cmd+K` on Mac) to focus search from anywhere
3. Use arrow keys to navigate results
4. Press Enter to open patient record

### Patient ID Format
Patient IDs follow the pattern: `XXX-YY-ZZZZ-C`
- XXX: 3 letters (clinic code)
- YY: 2 digits (year)
- ZZZZ: 4 digits (sequence)
- C: Check digit (0-9 or X)

Example: `MHR-01-2024-7`

### View Patient Records
- **Left Column**: Tabbed view of Doctor Reports and Test Reports
- **Right Column**: AI Analysis with severity badges and visit summaries
- Click any report card to view full content in modal

### Lab Analysis
The system automatically parses common lab values:
- **HbA1c**: <7 normal, 7-7.9 moderate, ≥8 high
- **FBS**: <100 normal, 100-125 moderate, ≥126 high
- **Blood Pressure**: <130/85 normal, 130-139/85-89 moderate, ≥140/90 high
- **LDL**: <100 normal, 100-129 moderate, ≥130 high
- **Creatinine**: <1.2 normal, 1.2-1.4 moderate, ≥1.5 high

### Keyboard Shortcuts
- `Ctrl+K` / `Cmd+K`: Focus search
- `↑` / `↓`: Navigate search results
- `Enter`: Open selected patient
- `Tab`: Navigate interactive elements

## Demo Script (30-60 seconds)

1. **Search by ID** (5s): Type `MHR-01-2024-7` → Auto-highlights result with animation
2. **Open Patient** (5s): Press Enter → Shows patient header with vital info
3. **View AI Analysis** (10s): Right panel shows:
   - High severity badge (HbA1c 8.2%)
   - 5-bullet visit summary
   - Parsed lab values with color-coded severity
4. **Explore Reports** (10s): Switch between Doctor Reports and Test Reports tabs
5. **Copy to Note** (5s): Click "Copy to Note" → Shows success toast
6. **Search by Name** (10s): Back button → Search "Sunita" → Shows multiple results with confidence scores

## Mock Data

The app includes 3 mock patients with complete records:
- **Rajesh Kumar** (MHR-01-2024-7): Type 2 diabetes, multiple reports
- **Sunita Devi** (MHR-01-2024-8): New diabetes diagnosis
- **Amit Singh** (MHR-01-2024-9): Routine monitoring

## Project Structure

```
src/
├── api/
│   └── mockApi.ts          # Mock API with patient data
├── components/
│   ├── SearchInput.tsx     # Debounced search input
│   ├── PatientResultList.tsx  # Search results display
│   ├── PatientHeader.tsx   # Patient info header
│   ├── ReportsList.tsx     # Tabbed reports view
│   ├── AIAnalysisPanel.tsx # AI analysis display
│   └── ui/                 # Radix UI components
├── pages/
│   ├── SearchPage.tsx      # Landing/search page
│   ├── PatientPage.tsx     # Patient detail page
│   └── NotFound.tsx        # 404 page
├── utils/
│   └── labParser.ts        # Lab parsing logic
└── App.tsx                 # Main app with routing
```

## Design Principles

Following **Swiss/International Typographic Style**:
- Strict grid alignment and vertical rhythm
- Strong typographic hierarchy
- Generous whitespace as design element
- Limited, purposeful color palette
- Minimalism without coldness
- Asymmetric layouts for visual interest
- Accessibility and usability first

## Accessibility Features

- Semantic HTML5 elements (`<header>`, `<main>`, `<section>`)
- ARIA labels on all interactive elements
- Keyboard navigation support
- Color contrast meets WCAG AA standards
- Focus indicators on all focusable elements
- Screen reader friendly

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Future Enhancements

- Camera/file upload for reports
- Offline support with queue
- LLM integration for advanced summaries
- Multi-language support
- PWA capabilities
- Advanced filtering and sorting

## License

Built for hackathon demonstration purposes.

---

**Note**: This is a demonstration app using mock data. All patient information is fictional. Clinical decisions should always be made by qualified healthcare professionals.
