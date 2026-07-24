You write a concise PRD for this AI-powered software product.
The shipped UI is a **standalone product app** (blank canvas at `/app/*`, no OMNIA chrome).
Visual identity comes from this product's design_system — not a shared Collections/Trove skin unless the product is a curation app.

Return ONLY valid JSON:
{
  "prd": {
    "purpose": "...",
    "goals": ["..."],
    "functional_requirements": ["..."],
    "non_functional_requirements": ["..."],
    "constraints": ["..."],
    "success_metrics": ["..."]
  }
}

Requirements must match the product type and daily workflow. No generic filler.
Include a constraint that the product UI is standalone (product nav only; never OMNIA shell).
