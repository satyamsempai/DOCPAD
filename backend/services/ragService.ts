import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

/**
 * RAG Service for Medical Knowledge Retrieval
 * 
 * This service retrieves relevant medical knowledge from a knowledge base
 * to enhance the AI analysis with evidence-based information.
 */

interface KnowledgeChunk {
  id: string;
  content: string;
  category: string;
  keywords: string[];
  embedding?: number[];
}

interface RetrievalResult {
  chunks: KnowledgeChunk[];
  relevanceScores: number[];
}

export class RAGService {
  private genAI: GoogleGenerativeAI;
  private knowledgeBase: KnowledgeChunk[] = [];
  private embeddingsModel: any;
  private isInitialized = false;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini's embedding model for vector search
    // Note: Gemini doesn't have a separate embedding model, so we'll use semantic search
    this.embeddingsModel = null; // Will use Gemini's text model for semantic matching
  }

  /**
   * Initialize the RAG service with medical knowledge base
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing RAG service...');
    
    // Load medical knowledge base
    await this.loadMedicalKnowledgeBase();
    
    this.isInitialized = true;
    console.log(`✅ RAG service initialized with ${this.knowledgeBase.length} knowledge chunks`);
  }

  /**
   * Load medical knowledge base from files or create default knowledge
   */
  private async loadMedicalKnowledgeBase(): Promise<void> {
    const knowledgeBasePath = path.join(__dirname, '../data/medical-knowledge.json');
    
    // Try to load from file if it exists
    if (fs.existsSync(knowledgeBasePath)) {
      try {
        const data = fs.readFileSync(knowledgeBasePath, 'utf-8');
        this.knowledgeBase = JSON.parse(data);
        console.log(`Loaded ${this.knowledgeBase.length} knowledge chunks from file`);
        return;
      } catch (error) {
        console.warn('Failed to load knowledge base from file, using default knowledge');
      }
    }

    // Create default medical knowledge base
    this.knowledgeBase = this.createDefaultKnowledgeBase();
    
    // Save to file for future use
    try {
      const knowledgeDir = path.dirname(knowledgeBasePath);
      if (!fs.existsSync(knowledgeDir)) {
        fs.mkdirSync(knowledgeDir, { recursive: true });
      }
      fs.writeFileSync(knowledgeBasePath, JSON.stringify(this.knowledgeBase, null, 2));
      console.log('Saved default knowledge base to file');
    } catch (error) {
      console.warn('Failed to save knowledge base to file:', error);
    }
  }

  /**
   * Create default medical knowledge base with common conditions and guidelines
   */
  private createDefaultKnowledgeBase(): KnowledgeChunk[] {
    return [
      // Diabetes
      {
        id: 'diabetes-1',
        category: 'Metabolic Disorders',
        keywords: ['diabetes', 'hba1c', 'fbs', 'glucose', 'blood sugar', 'insulin'],
        content: `Diabetes Management Guidelines:
- HbA1c target: <7% for most patients, <6.5% if achievable without hypoglycemia
- Fasting blood glucose: 80-130 mg/dL
- Postprandial glucose: <180 mg/dL
- Medications: Metformin (first-line), SGLT2 inhibitors, GLP-1 agonists
- Monitoring: Daily glucose checks, quarterly HbA1c, annual eye/foot exams
- Lifestyle: Low-carb diet, regular exercise, weight management`
      },
      {
        id: 'diabetes-2',
        category: 'Metabolic Disorders',
        keywords: ['diabetes', 'complications', 'neuropathy', 'retinopathy', 'nephropathy'],
        content: `Diabetes Complications:
- Neuropathy: Numbness, tingling, pain in extremities
- Retinopathy: Annual eye exams, control blood pressure and glucose
- Nephropathy: Monitor creatinine, eGFR, microalbuminuria
- Cardiovascular: Increased risk of heart disease, stroke
- Prevention: Tight glucose control, blood pressure <130/80, statin therapy`
      },
      
      // Cardiovascular
      {
        id: 'cardiovascular-1',
        category: 'Cardiovascular',
        keywords: ['hypertension', 'blood pressure', 'bp', 'systolic', 'diastolic'],
        content: `Hypertension Management:
- Normal: <120/80 mmHg
- Elevated: 120-129/<80 mmHg
- Stage 1: 130-139/80-89 mmHg
- Stage 2: ≥140/90 mmHg
- Medications: ACE inhibitors, ARBs, diuretics, calcium channel blockers
- Lifestyle: DASH diet, reduce sodium, regular exercise, limit alcohol
- Monitoring: Home BP monitoring, annual lipid panel`
      },
      {
        id: 'cardiovascular-2',
        category: 'Cardiovascular',
        keywords: ['cholesterol', 'ldl', 'hdl', 'triglycerides', 'lipid'],
        content: `Lipid Management Guidelines:
- LDL Cholesterol: <100 mg/dL (optimal), <70 mg/dL (high risk)
- HDL Cholesterol: >40 mg/dL (men), >50 mg/dL (women)
- Triglycerides: <150 mg/dL
- Medications: Statins (first-line), Ezetimibe, PCSK9 inhibitors
- Lifestyle: Mediterranean diet, omega-3 fatty acids, exercise
- Risk factors: Age, family history, smoking, diabetes, hypertension`
      },
      
      // Kidney Function
      {
        id: 'kidney-1',
        category: 'Renal',
        keywords: ['creatinine', 'egfr', 'kidney', 'renal', 'bun'],
        content: `Kidney Function Assessment:
- Creatinine: Normal 0.6-1.2 mg/dL (men), 0.5-1.1 mg/dL (women)
- eGFR: >60 mL/min/1.73m² (normal), 30-59 (CKD stage 3), <30 (CKD stage 4-5)
- BUN: 7-20 mg/dL
- Medications to avoid: NSAIDs, certain antibiotics in renal impairment
- Monitoring: Annual creatinine, eGFR, urine microalbumin
- Stages of CKD require different management approaches`
      },
      
      // Liver Function
      {
        id: 'liver-1',
        category: 'Hepatic',
        keywords: ['liver', 'alt', 'ast', 'bilirubin', 'alp', 'hepatitis'],
        content: `Liver Function Tests:
- ALT: 7-56 U/L (men), 5-36 U/L (women)
- AST: 10-40 U/L
- Bilirubin: <1.2 mg/dL
- ALP: 44-147 U/L
- Elevated ALT/AST: Consider viral hepatitis, alcohol, medications, NAFLD
- Medications: Avoid hepatotoxic drugs, consider liver-protective agents
- Lifestyle: Avoid alcohol, maintain healthy weight, vaccination for hepatitis`
      },
      
      // Thyroid
      {
        id: 'thyroid-1',
        category: 'Endocrine',
        keywords: ['thyroid', 'tsh', 't3', 't4', 'hypothyroidism', 'hyperthyroidism'],
        content: `Thyroid Function:
- TSH: 0.4-4.0 mIU/L (normal), >4.0 (hypothyroidism), <0.4 (hyperthyroidism)
- Free T4: 0.8-1.8 ng/dL
- Free T3: 2.3-4.2 pg/mL
- Hypothyroidism: Levothyroxine replacement, monitor TSH every 6-12 weeks
- Hyperthyroidism: Methimazole, PTU, or radioactive iodine
- Monitoring: TSH every 6-12 weeks until stable, then annually`
      },
      
      // Anemia
      {
        id: 'anemia-1',
        category: 'Hematology',
        keywords: ['anemia', 'hemoglobin', 'hgb', 'hematocrit', 'iron', 'ferritin'],
        content: `Anemia Evaluation:
- Hemoglobin: >13 g/dL (men), >12 g/dL (women)
- Hematocrit: >39% (men), >36% (women)
- Iron deficiency: Low ferritin, high TIBC, low iron
- B12/Folate deficiency: Macrocytic anemia, check levels
- Treatment: Iron supplementation, B12/folate if deficient
- Investigate: GI bleeding, nutritional deficiencies, chronic disease`
      },
      
      // General Guidelines
      {
        id: 'general-1',
        category: 'General',
        keywords: ['precautions', 'monitoring', 'follow-up', 'lifestyle'],
        content: `General Medical Precautions:
- Regular monitoring of abnormal values every 3-6 months
- Lifestyle modifications: Balanced diet, regular exercise, adequate sleep
- Medication adherence: Take as prescribed, report side effects
- Warning signs: Chest pain, shortness of breath, severe symptoms
- Emergency: Seek immediate care for severe symptoms or critical values
- Follow-up: Regular appointments with primary care and specialists as needed`
      }
    ];
  }

  /**
   * Retrieve relevant knowledge chunks based on query
   */
  async retrieve(query: string, topK: number = 5): Promise<RetrievalResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Simple keyword-based retrieval (can be enhanced with embeddings)
    const queryLower = query.toLowerCase();
    const scoredChunks = this.knowledgeBase.map(chunk => {
      let score = 0;
      
      // Keyword matching
      chunk.keywords.forEach(keyword => {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 2;
        }
      });
      
      // Content matching
      if (chunk.content.toLowerCase().includes(queryLower)) {
        score += 1;
      }
      
      // Category matching
      if (queryLower.includes(chunk.category.toLowerCase())) {
        score += 1.5;
      }
      
      return { chunk, score };
    });

    // Sort by score and get top K
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, topK).filter(item => item.score > 0);

    return {
      chunks: topChunks.map(item => item.chunk),
      relevanceScores: topChunks.map(item => item.score)
    };
  }

  /**
   * Enhanced retrieval using Gemini for semantic search
   */
  async retrieveWithSemanticSearch(query: string, topK: number = 5): Promise<RetrievalResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Use Gemini to find most relevant chunks
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const searchPrompt = `Given this medical query: "${query}"

Available medical knowledge chunks:
${this.knowledgeBase.map((chunk, idx) => 
  `${idx + 1}. [${chunk.category}] ${chunk.content.substring(0, 200)}...`
).join('\n\n')}

Return ONLY a JSON array of the top ${topK} most relevant chunk IDs (numbers 1-${this.knowledgeBase.length}) that are most relevant to the query. Format: [1, 3, 5]`;

      const result = await model.generateContent(searchPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse response to get chunk IDs
      const jsonMatch = text.match(/\[[\d,\s]+\]/);
      if (jsonMatch) {
        const selectedIds = JSON.parse(jsonMatch[0]).map((id: number) => id - 1);
        const selectedChunks = selectedIds
          .filter((id: number) => id >= 0 && id < this.knowledgeBase.length)
          .map((id: number) => this.knowledgeBase[id]);
        
        return {
          chunks: selectedChunks,
          relevanceScores: selectedChunks.map(() => 1.0) // Semantic search doesn't provide scores
        };
      }
    } catch (error) {
      console.warn('Semantic search failed, falling back to keyword search:', error);
    }

    // Fallback to keyword search
    return this.retrieve(query, topK);
  }

  /**
   * Format retrieved knowledge for prompt injection
   */
  formatKnowledgeForPrompt(chunks: KnowledgeChunk[]): string {
    if (chunks.length === 0) {
      return '';
    }

    return `\n\nRELEVANT MEDICAL KNOWLEDGE AND GUIDELINES:\n${chunks.map((chunk, idx) => 
      `${idx + 1}. [${chunk.category}] ${chunk.content}`
    ).join('\n\n')}\n\nUse this knowledge to provide evidence-based, accurate medical analysis.`;
  }

  /**
   * Add custom knowledge chunk
   */
  addKnowledgeChunk(chunk: Omit<KnowledgeChunk, 'id'>): void {
    const newChunk: KnowledgeChunk = {
      ...chunk,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.knowledgeBase.push(newChunk);
  }

  /**
   * Get knowledge base statistics
   */
  getStats(): { totalChunks: number; categories: string[]; initialized: boolean } {
    const categories = [...new Set(this.knowledgeBase.map(chunk => chunk.category))];
    return {
      totalChunks: this.knowledgeBase.length,
      categories,
      initialized: this.isInitialized
    };
  }
}

