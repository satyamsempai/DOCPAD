# RAG (Retrieval-Augmented Generation) Implementation

## Overview

RAG has been implemented to enhance medical test report analysis by retrieving relevant medical knowledge from a knowledge base before generating the AI analysis. This provides more accurate, evidence-based recommendations.

## Architecture

```
Upload Test Report
    ↓
Retrieve Relevant Medical Knowledge (RAG)
    ↓
Enhance Prompt with Retrieved Knowledge
    ↓
Gemini Analysis (with context)
    ↓
Return Enhanced Analysis
```

## How It Works

1. **Knowledge Base**: Contains medical guidelines, treatment protocols, and best practices
2. **Retrieval**: Uses semantic search to find relevant knowledge chunks
3. **Enhancement**: Injects retrieved knowledge into the prompt
4. **Analysis**: Gemini uses this context for more accurate analysis

## Knowledge Base

The knowledge base includes information about:
- Diabetes management
- Cardiovascular diseases (hypertension, cholesterol)
- Kidney function
- Liver function
- Thyroid disorders
- Anemia
- General medical guidelines

## Files

- `backend/services/ragService.ts` - RAG service implementation
- `backend/data/medical-knowledge.json` - Knowledge base (auto-generated)

## Usage

RAG is automatically enabled and used in every test report analysis. No additional configuration needed.

## Customization

### Adding Custom Knowledge

You can add custom knowledge chunks programmatically:

```typescript
ragService.addKnowledgeChunk({
  category: 'Custom Category',
  keywords: ['keyword1', 'keyword2'],
  content: 'Your medical knowledge content here...'
});
```

### Loading from File

Place a `medical-knowledge.json` file in `backend/data/` with this structure:

```json
[
  {
    "id": "unique-id",
    "category": "Category Name",
    "keywords": ["keyword1", "keyword2"],
    "content": "Medical knowledge content..."
  }
]
```

## API Endpoints

### Get RAG Statistics

```
GET /api/rag/stats
```

Returns:
```json
{
  "status": "ok",
  "totalChunks": 8,
  "categories": ["Metabolic Disorders", "Cardiovascular", ...],
  "initialized": true
}
```

## Future Enhancements

1. **Two-Pass RAG**: Extract test names first, then retrieve targeted knowledge
2. **Patient History Integration**: Retrieve relevant patient history
3. **Dynamic Knowledge Updates**: Update knowledge base from external sources
4. **Vector Embeddings**: Use proper vector embeddings for better semantic search
5. **External Knowledge Sources**: Integrate with medical databases (PubMed, guidelines)

## Benefits

- ✅ More accurate medical recommendations
- ✅ Evidence-based analysis
- ✅ Consistent with medical guidelines
- ✅ Better medication and precaution suggestions
- ✅ Enhanced disease analysis

