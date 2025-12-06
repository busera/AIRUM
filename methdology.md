# Methodology: Building the AI Risk Universe Matrix (AIRUM)

To create a holistic and actionable view of AI risks, a dual-path methodology was employed. This approach enabled the identification of the most common **Risk Domains** (categorized as _Process Names_) and **Sub-Domains** (categorized as _Sub-Process Names_) by triangulating data from two distinct types of sources:

### 1. Direct Risk Identification (Threat-Centric Approach)

For sources that explicitly catalog known failures, vulnerabilities, and attacks (such as the MIT AI Risk Repository and OWASP), risks were extracted directly.

- **Method**: Individual threats (e.g., "Prompt Injection," "Automation Bias") were mapped to broader risk domains.
    
- **Source Logic**: _“Here is a known failure mode → Categorize it into the Risk Universe.”_
    

### 2. Reverse Engineering from Controls (Control-Centric Approach)

For governance frameworks and standards (such as ISO 42001 and Gartner), which primarily list requirements or controls, a retrospective engineering process was utilized.

- **Method**: Each recommended control or maturity benchmark was analyzed to determine: _"What specific negative outcome does this control prevent?"_ or _"What risk materializes if this requirement is absent?"_
    
- **Source Logic**: _“Here is a required control (e.g., Human Oversight) → The implied risk is 'Lack of Accountability' or 'Over-reliance on Systems'.”_



## Sources Consulted

The AIRUM is built upon the following authoritative sources, encompassing strategic governance, organizational maturity, and technical security.

### A. Strategic Governance & Management Standards

These sources were used to define the high-level _Process Names_ (Domains) related to strategy, compliance, and organizational structure. By reverse-engineering the rigorous controls in ISO and the strategic guidance from Gartner, systemic risks such as "Strategic Misalignment" and "Governance Failure" were identified.

- **ISO/IEC 42001:2023 - Artificial intelligence — Management system**: The global standard for AI governance. Its clauses and controls were analyzed to identify the organizational risks associated with failing to Plan, Do, Check, and Act.
    
    - _Source_: [https://www.iso.org/standard/42001](https://www.iso.org/standard/42001)
        
- **Gartner® Reference Guide for AI Strategy | Bounteous**: Used to align AI strategy with business outcomes and define strategic risk domains.
    
    - _Source_: [https://www.bounteous.com/insights/gartner/](https://www.bounteous.com/insights/gartner/)
        
- **Gartner Research Documents**: Extensive research on AI Trust, Risk, and Security Management (AI TRiSM) and Generative AI governance was utilized to identify operational and strategic blind spots.
    
    - _Gartner Research Document (ID: 6676234)_: [https://www.gartner.com/document-reader/document/6676234?ref=pubsite](https://www.gartner.com/document-reader/document/6676234?ref=pubsite)
        
    - _Gartner Research Document (ID: 6570102)_: [https://www.gartner.com/document-reader/document/6570102?ref=pubsite](https://www.gartner.com/document-reader/document/6570102?ref=pubsite)
        
    - _Gartner Research Document (ID: 6592003)_: [https://www.gartner.com/document-reader/document/6592003?ref=pubsite](https://www.gartner.com/document-reader/document/6592003?ref=pubsite)
        
    - _Gartner Research Document (ID: 6885067)_: [https://www.gartner.com/document-reader/document/6885067?ref=pubsite](https://www.gartner.com/document-reader/document/6885067?ref=pubsite)
        

### B. Organizational Maturity & Readiness

Maturity models were examined to identify risks related to an organization's _capability_ to manage AI, focusing on process immaturity and resource allocation.

- **MITRE AI Maturity Model and Organizational Assessment Tool Guide**: This guide was used to identify risks stemming from a lack of organizational readiness.
    
    - _Source_: [https://www.mitre.org/news-insights/publication/mitre-ai-maturity-model-and-organizational-assessment-tool-guide](https://www.mitre.org/news-insights/publication/mitre-ai-maturity-model-and-organizational-assessment-tool-guide)
        

### C. Technical Security & Threat Landscapes

These sources were used to populate the _Sub-Process Names_ (Sub-Domains) with specific, actionable technical risks, utilizing the threat-centric extraction path.

- **The MIT AI Risk Repository**: A comprehensive database of documented AI risks used to validate domains against real-world failure cases.
    
    - _Source_: [https://airisk.mit.edu/](https://airisk.mit.edu/)
        
- **OWASP Top 10 for Large Language Model Applications**: Critical vulnerabilities specific to Generative AI, such as jailbreaking and data leakage, were extracted from this source.
    
    - _Source_: [https://genai.owasp.org/llm-top-10/](https://genai.owasp.org/llm-top-10/)
        
- **OWASP Machine Learning Security Top 10**: This list was used to identify fundamental security risks in predictive ML systems, such as data poisoning and model inversion.
    
    - _Source_: [https://owasp.org/www-project-machine-learning-security-top-10/](https://owasp.org/www-project-machine-learning-security-top-10/)