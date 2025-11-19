# Research Project Proposal: AI-Generated Music Therapy for Autism Spectrum Disorder

## Optimizing AI-Generated Music Therapy Recommendations: A Comparative Analysis of Large Language Model Prompting Strategies

---

## Executive Summary

This research investigates how artificial intelligence systems should be prompted to generate therapeutically appropriate music for children with Autism Spectrum Disorder (ASD). By comparing different GPT prompting strategies and evaluating AI-generated music through expert validation, this study addresses a critical gap in clinical AI application design: translating therapeutic needs into technical specifications.

**Key Innovation:** Rather than testing existing music selections, this research uses AI to generate custom therapeutic music, examining how prompt design influences clinical appropriateness.

---

## 1. Background & Significance

### 1.1 The Clinical Context

Music therapy has demonstrated effectiveness for children with ASD, helping with:
- Emotional regulation
- Engagement and attention
- Reducing anxiety and overstimulation
- Facilitating social interaction

However, music selection is typically based on therapist intuition and trial-and-error, with limited systematic approaches for matching musical characteristics to specific therapeutic needs.

### 1.2 The Technology Gap

Recent advances in AI have created two powerful tools:
1. **Large Language Models (LLMs)** - Can process clinical information and make recommendations
2. **AI Music Generators** - Can create custom music from text descriptions

**Missing Link:** No established framework for how LLMs should describe therapeutic music to music generators.

### 1.3 Research Value

This study fills three critical knowledge gaps:

#### Value Point 1: Human-AI Collaboration Framework
**Contribution:** Establish evidence-based methods for prompting AI in therapeutic contexts

**Impact:** Creates replicable framework for clinical AI applications beyond music therapy

**Novel Aspect:** First study examining prompt design for therapeutic music generation

#### Value Point 2: Parametric Music Design for Clinical Use
**Contribution:** Identify optimal ways to specify musical parameters for therapeutic purposes

**Impact:** Bridge between clinical intuition and technical specifications

**Questions Answered:**
- Should prompts specify exact BPM or descriptive terms?
- Does music theory terminology improve appropriateness?
- What level of detail optimizes therapeutic value?

#### Value Point 3: Evidence-Based AI System Design
**Contribution:** Create validated design principles for clinical AI systems

**Impact:** Model for evaluating AI therapeutic tools through expert validation

**Methodological Contribution:** Systematic comparison methodology applicable to other AI health applications

---

## 2. Research Questions

### Primary Research Question
**Which GPT prompting strategy generates the most therapeutically appropriate musical descriptions for AI-generated music therapy in ASD contexts?**

### Secondary Research Questions
1. Does prompt complexity (simple vs. detailed) correlate with therapeutic appropriateness?
2. Do music-theory-focused prompts outperform ASD-focused prompts?
3. Does including evidence-based citations improve AI output quality?
4. What musical parameters do experts prioritize for different engagement levels?

### Exploratory Research Questions
1. Can AI-generated music achieve therapeutic appropriateness comparable to expert-selected existing music?
2. What are systematic gaps in AI's understanding of therapeutic music needs?
3. How do different music generation models respond to the same prompting strategies?

---

## 3. Methodology

### 3.1 Overall Research Design

**Study Type:** Comparative experimental design with expert validation

**Approach:** Generate music using multiple prompting strategies, then expert evaluation

**No Human Participants Required:** Study uses simulated scenarios and expert raters only

### 3.2 Phase 1: Prompting Strategy Development

#### Develop 5-6 Distinct Prompting Strategies:

**Strategy 1: Minimal/Direct**
```
Prompt: "Generate calming music for a child with low engagement."
```
- **Rationale:** Test baseline performance with minimal guidance
- **Hypothesis:** May produce generic, less therapeutically targeted music

**Strategy 2: Context-Rich Clinical**
```
Prompt: "You are a music therapist specializing in ASD. A child is showing
low engagement (minimal eye contact, withdrawn). Describe ideal music to
help re-engage them. Consider sensory sensitivities common in ASD.

Output JSON with: tempo_bpm, key, instruments, complexity, duration,
text_description."
```
- **Rationale:** Rich clinical context with structured output
- **Hypothesis:** Clinical framing improves therapeutic appropriateness

**Strategy 3: Music Theory Heavy**
```
Prompt: "Describe music for ASD therapy (low engagement scenario). Specify:
mode, harmonic progression, rhythmic complexity, melodic range,
instrumentation, dynamics. Use music theory terminology."
```
- **Rationale:** Technical musical specifications
- **Hypothesis:** May produce sophisticated music but miss therapeutic nuances

**Strategy 4: ASD-Specific Sensory Focus**
```
Prompt: "A child with ASD has low engagement. Children with ASD often have
sensory sensitivities: avoiding sudden volume changes, high frequencies,
complex harmonies. They respond well to predictable patterns, repetition,
60-80 BPM range. Describe appropriate music considering these factors."
```
- **Rationale:** Emphasize ASD-specific needs
- **Hypothesis:** Sensory focus improves safety and appropriateness ratings

**Strategy 5: Evidence-Based Citations**
```
Prompt: "Based on research showing that children with ASD respond positively
to music with 60-80 BPM (regulates arousal), predictable structures (reduces
anxiety), and simple instrumentation (minimizes overstimulation), describe
ideal music for a child with low engagement. Cite specific musical
characteristics supported by evidence."
```
- **Rationale:** Ground in published research
- **Hypothesis:** Evidence integration improves expert ratings

**Strategy 6: Chain-of-Thought Reasoning**
```
Prompt: "A child with ASD has low engagement. First, analyze what low
engagement means clinically. Second, identify what musical characteristics
address this. Third, describe specific music. Fourth, explain therapeutic
rationale. Output structured response."
```
- **Rationale:** Encourage AI reasoning process
- **Hypothesis:** Explicit reasoning improves output quality

### 3.3 Phase 2: Scenario Development

Create **20 standardized therapeutic scenarios** representing common clinical situations:

**Scenario Variables:**
- Engagement Level: Low / Medium / High (overstimulated)
- Time of Day: Morning / Afternoon / Evening
- Session Number: First session / Ongoing therapy
- Age Range: 4-6 years / 7-10 years
- Additional Context: Post-meltdown / Transition time / Free play

**Example Scenarios:**
1. 5-year-old, LOW engagement, morning, first session
2. 8-year-old, HIGH engagement (overstimulated), afternoon, 5th session
3. 6-year-old, MEDIUM engagement, post-meltdown, evening
4. 7-year-old, LOW engagement, transition to new activity, afternoon
5. [15 additional scenarios]

### 3.4 Phase 3: Music Generation

**For each scenario:**
1. Generate GPT response using each prompting strategy (6 strategies × 20 scenarios = 120 GPT outputs)
2. Extract musical description from GPT response
3. Feed description to AI music generator (Suno AI or MusicGen)
4. Generate 60-90 second music sample
5. Store audio file with metadata (scenario, strategy, GPT output)

**Technical Workflow:**
```
Scenario Input → GPT (Strategy A) → Musical Description → Music Generator → Audio File A
                → GPT (Strategy B) → Musical Description → Music Generator → Audio File B
                → GPT (Strategy C) → Musical Description → Music Generator → Audio File C
                ...
```

**Result:** 120 unique audio samples (6 strategies × 20 scenarios)

### 3.5 Phase 4: Expert Evaluation

#### Recruit 8-12 Expert Raters:
- **Primary:** Certified music therapists (5-7 raters)
- **Secondary:** ASD specialists, special education teachers, experienced caregivers (3-5 raters)

**Recruitment:**
- Professional organizations (American Music Therapy Association)
- University music therapy programs
- ASD support networks
- Online professional forums

#### Evaluation Process:

**Each expert rates 40-60 music samples** (subset of 120 total to prevent fatigue)
- Randomized assignment of samples
- Blinded to prompting strategy
- Each sample rated by 4-6 different experts (ensuring overlap)

**Rating Instrument (5-point Likert scale):**

1. **Therapeutic Appropriateness**
   - How well does this music match the therapeutic goal for the scenario?
   - 1 = Inappropriate, 5 = Highly Appropriate

2. **Safety (Sensory Considerations)**
   - Is this music safe for children with ASD sensory sensitivities?
   - 1 = Potentially harmful, 5 = Very safe

3. **Engagement Potential**
   - How likely is this music to achieve the desired engagement change?
   - 1 = Unlikely, 5 = Highly likely

4. **Personalization Quality**
   - Does this feel tailored to the specific scenario vs. generic?
   - 1 = Very generic, 5 = Highly personalized

5. **Overall Clinical Value**
   - Would you use this music in actual therapy sessions?
   - 1 = Would not use, 5 = Would definitely use

**Qualitative Feedback:**
- Open-ended comments: "What works well? What concerns do you have?"
- Suggestions for improvement
- Comparison to their typical music selection process

### 3.6 Phase 5: Data Analysis

#### Quantitative Analysis:

**Primary Analysis:**
- Compare mean ratings across 6 prompting strategies (ANOVA)
- Identify which strategy has highest ratings on each dimension
- Calculate inter-rater reliability (Cronbach's alpha, ICC)
- Post-hoc tests for pairwise comparisons

**Secondary Analysis:**
- Correlation between prompt complexity and ratings
- Ratings by engagement level (low/med/high)
- Ratings by expert type (therapist vs. other)
- Consistency analysis: which strategy has lowest variance?

**Regression Analysis:**
- Predict therapeutic appropriateness from prompt characteristics:
  - Word count
  - Presence of clinical terminology
  - Presence of evidence citations
  - Specificity of musical parameters

#### Qualitative Analysis:

**Thematic Coding of Expert Comments:**
- What musical features do experts value most?
- What concerns are raised about AI-generated music?
- What patterns emerge in "excellent" vs. "poor" samples?
- Gaps in AI understanding of therapeutic needs

**Content Analysis of GPT Outputs:**
- What musical parameters does each strategy prioritize?
- Consistency of recommendations within each strategy
- Presence of therapeutic rationale in outputs

---

## 4. Expected Outcomes

### 4.1 Primary Deliverables

1. **Ranked Prompting Strategies**
   - Quantitative ranking with statistical significance testing
   - Recommendations for optimal prompting approach

2. **Design Guidelines Document**
   - Evidence-based best practices for clinical AI prompting
   - Replicable framework for other therapeutic AI applications

3. **Generated Music Library**
   - 120 audio samples demonstrating different approaches
   - Annotated with expert ratings and feedback

4. **Expert Insights Report**
   - Qualitative findings from music therapists
   - Clinical perspectives on AI music generation

### 4.2 Research Contributions

**To Music Therapy Field:**
- First systematic evaluation of AI-generated music for ASD
- Evidence on feasibility of personalized music generation
- Framework for integrating AI into therapeutic practice

**To AI/Machine Learning Field:**
- Prompt engineering guidelines for clinical applications
- Methodology for expert validation of AI outputs
- Case study in human-AI collaboration for healthcare

**To ASD Research:**
- Systematic analysis of musical features for different engagement levels
- Novel approach to personalized therapeutic interventions
- Data on sensory considerations for music selection

### 4.3 Publication Potential

**Target Venues:**
- **Primary:** Music Therapy journals (Journal of Music Therapy, Music Therapy Perspectives)
- **Secondary:** AI in healthcare conferences (AI in Medicine, MLHC)
- **Tertiary:** High school research journals, science fair competitions

**Proposed Title:**
"Optimizing AI-Generated Music Therapy for Autism: A Comparative Analysis of Large Language Model Prompting Strategies with Expert Validation"

---

## 5. Timeline

### **Total Duration: 12-16 weeks**

#### Week 1-2: Preparation
- Literature review (music therapy for ASD, AI music generation)
- Finalize prompting strategies
- Develop 20 scenarios
- Set up technical infrastructure (GPT API, music generator)

#### Week 3-4: Music Generation
- Generate 120 GPT responses
- Create 120 audio samples
- Quality check and organize files
- Create evaluation survey/platform

#### Week 5-6: Expert Recruitment
- Identify and contact potential expert raters
- Obtain consent/agreements
- Provide instructions and training materials
- Pilot test with 2-3 experts

#### Week 7-10: Expert Evaluation
- Experts rate assigned samples
- Weekly check-ins to ensure progress
- Collect qualitative feedback
- Address any questions from raters

#### Week 11-12: Data Analysis
- Quantitative statistical analysis
- Qualitative thematic coding
- Create visualizations and tables
- Identify key findings

#### Week 13-14: Paper Writing
- Draft manuscript sections
- Create figures and tables
- Literature integration
- Revisions

#### Week 15-16: Finalization
- Peer review (by mentor, colleagues)
- Final revisions
- Format for target venue
- Prepare presentation materials

---

## 6. Resources Required

### 6.1 Technical Resources

**Software/APIs:**
- OpenAI API access (GPT-4 or GPT-4o) - ~$50-100 for 120 generations
- AI Music Generator:
  - **Option A:** Suno AI (subscription ~$10-30/month)
  - **Option B:** MusicGen (Meta) - Free, open-source, requires setup
  - **Option C:** AudioCraft - Free, more technical control
- Survey platform (Qualtrics, Google Forms, or custom)
- Statistical analysis software (R/Python - free, or SPSS)

**Existing Infrastructure:**
- Current SonicSoothe application (provides scenario framework)
- FastAPI backend (can be extended for music generation)
- Next.js frontend (can create expert rating interface)

### 6.2 Human Resources

**Student Researcher:**
- Execute music generation process
- Manage data collection
- Conduct analysis
- Draft paper sections

**Mentor (You):**
- Design oversight
- Expert recruitment
- Methodological guidance
- Paper revision and co-authorship

**Expert Raters (8-12):**
- Volunteer basis (acknowledge in paper)
- 3-5 hours of time commitment each
- Professional development incentive (co-authorship for high contributors, or acknowledgment)

### 6.3 Budget Estimate

**Total: $100-200**

- OpenAI API: $50-100
- Music generation API (Suno): $10-30
- Survey platform: $0 (Google Forms) or $50 (Qualtrics)
- Participant compensation: $0 (volunteer experts)
- Contingency: $20-50

**Note:** Can be reduced to near-zero using free alternatives (MusicGen instead of Suno, Google Forms)

---

## 7. Ethical Considerations

### 7.1 No Human Participants (Children)

**Advantage:** No IRB required for child participants (significant simplification)

**Study Design:** Uses simulated scenarios, not real children

### 7.2 Expert Rater Ethics

**Informed Consent:**
- Experts informed about study purpose
- Voluntary participation
- Can withdraw at any time
- Data anonymized

**Minimal Risk:**
- Simple survey, no sensitive information
- No vulnerable populations
- Standard academic research process

**IRB Status:**
- May qualify for exempt status (depends on institution)
- Likely only needs student's school research committee approval

### 7.3 Future Clinical Use

**Important Note:** This study evaluates prompting strategies, NOT clinical efficacy

**Before real-world use:**
- Would require clinical trials with actual participants
- IRB approval for child participants
- Parental consent
- Safety monitoring

**This study is a precursor** - establishing feasibility before clinical testing

---

## 8. Limitations & Future Work

### 8.1 Acknowledged Limitations

1. **No actual child participants** - Cannot validate real-world effectiveness
2. **Expert ratings as proxy** - May not perfectly predict child responses
3. **Single music generator** - Results may be generator-specific
4. **Limited scenarios** - 20 scenarios cannot cover all therapeutic situations
5. **English-language prompts only** - Cultural and linguistic limitations

### 8.2 Future Research Directions

**Immediate Follow-up:**
- Test top-performing strategy in pilot clinical trial
- Compare multiple AI music generators
- Expand to other conditions (ADHD, anxiety, dementia)

**Long-term Research:**
- Longitudinal study with real participants
- Adaptive AI that learns from individual child preferences
- Real-time music generation during therapy sessions
- Multi-modal AI (combining music, visual, tactile stimuli)

**Methodological Extensions:**
- Expand expert panel to international therapists
- Include parent and caregiver perspectives
- Physiological measurements (heart rate, galvanic skin response)

---

## 9. Significance for High School Researcher

### 9.1 Educational Value

**Skills Developed:**
- Research design and methodology
- AI/machine learning applications
- Data analysis and statistics
- Scientific writing
- Expert communication and collaboration

**Interdisciplinary Learning:**
- Clinical psychology/therapy
- Computer science/AI
- Music theory
- Special education
- Research ethics

### 9.2 Impact Potential

**Academic Recognition:**
- Publication in peer-reviewed or student journal
- Science fair presentation (Intel ISEF, Regeneron STS eligibility)
- Conference poster presentation
- Strong college application component

**Real-World Contribution:**
- Addresses genuine clinical need
- Creates reusable framework
- May influence future therapeutic AI design
- Contributes to emerging field

### 9.3 Mentorship Structure

**Mentor Responsibilities:**
- Overall design guidance
- Expert recruitment assistance
- Methodology validation
- Paper co-authorship and revision

**Student Responsibilities:**
- Day-to-day execution
- Data collection and organization
- First-draft writing
- Presentation preparation

**Collaborative:** Joint decision-making on key methodological choices

---

## 10. Success Criteria

### Minimum Success (Publishable Outcome):
✅ Complete all 120 music generations
✅ Obtain ratings from at least 6 experts
✅ Identify statistically significant differences between at least 2 strategies
✅ Produce draft manuscript

### Target Success:
✅ 8-10 expert raters
✅ Clear ranking of all 6 strategies
✅ Rich qualitative insights from experts
✅ Submission to peer-reviewed journal
✅ Presentation at science fair or conference

### Exceptional Success:
✅ 12+ expert raters
✅ Publication acceptance
✅ Framework adopted by other researchers
✅ Recognition at major science competition
✅ Media coverage or clinical interest

---

## 11. Conclusion

This research addresses a timely and important question at the intersection of artificial intelligence and clinical practice: how do we design AI systems that can translate therapeutic needs into actionable technical specifications?

By systematically comparing prompting strategies and validating outputs through expert evaluation, this study will:
- Generate novel knowledge about clinical AI design
- Create evidence-based guidelines for therapeutic music generation
- Demonstrate feasibility of personalized AI music therapy
- Provide a methodological model for other AI health applications

The project is achievable within a high school research timeframe, requires minimal resources, avoids complex IRB requirements, yet addresses a genuine gap in both music therapy and AI literature.

**Most importantly:** This work could meaningfully contribute to improving therapeutic interventions for children with autism spectrum disorder.

---

## Appendices

### Appendix A: Sample Scenarios (Full List)

1. 5yo boy, LOW engagement, morning, first session, baseline
2. 5yo girl, LOW engagement, post-meltdown, afternoon, 3rd session
3. 6yo boy, MEDIUM engagement, transition time, morning, 2nd session
4. 6yo girl, HIGH engagement (overstimulated), afternoon, 5th session
5. 7yo boy, LOW engagement, evening, fatigue, 4th session
6. 7yo girl, MEDIUM engagement, free play, morning, 6th session
7. 8yo boy, HIGH engagement (energetic), mid-day, outdoor to indoor transition
8. 8yo girl, LOW engagement, withdrawn, afternoon, first session
9. 9yo boy, MEDIUM engagement, group activity, morning, ongoing therapy
10. 9yo girl, HIGH engagement (overstimulated), sensory overload, afternoon
11. 4yo boy, LOW engagement, separation anxiety, morning, first session
12. 5yo girl, MEDIUM engagement, snack time transition, mid-morning
13. 6yo boy, HIGH engagement (excited), before preferred activity, afternoon
14. 7yo girl, LOW engagement, after difficult task, late afternoon
15. 8yo boy, MEDIUM engagement, peer interaction time, morning
16. 9yo girl, LOW engagement, routine change, afternoon
17. 5yo boy, HIGH engagement (anxious), unexpected visitor, morning
18. 6yo girl, MEDIUM engagement, art activity, afternoon
19. 7yo boy, LOW engagement, rainy day indoors, late morning
20. 8yo girl, MEDIUM engagement, end of session wind-down, afternoon

### Appendix B: Expert Rating Survey Template

**[Scenario Description Shown to Expert]**
- Child: 6-year-old boy
- Engagement Level: LOW (minimal eye contact, withdrawn, not responding to prompts)
- Context: Afternoon session, third meeting, transition from structured activity to free play
- Therapeutic Goal: Gently re-engage the child and establish calm, focused attention

**[Audio Player: 90-second music sample]**

**Please rate the following (1-5 scale):**

1. Therapeutic Appropriateness: __
2. Safety (Sensory Considerations): __
3. Engagement Potential: __
4. Personalization Quality: __
5. Overall Clinical Value: __

**Qualitative Feedback:**
- What musical elements work well for this scenario?
- What concerns do you have?
- Would you modify anything?
- How does this compare to music you would typically select?

### Appendix C: Technical Implementation Notes

**GPT API Call Example:**
```python
import openai

def generate_music_description(scenario, strategy_prompt):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a music therapy AI assistant."},
            {"role": "user", "content": f"{strategy_prompt}\n\nScenario: {scenario}"}
        ],
        temperature=0.7,
        max_tokens=500
    )
    return response.choices[0].message.content
```

**Music Generation API Call Example (Suno):**
```python
import requests

def generate_music(description, duration=90):
    response = requests.post(
        "https://api.suno.ai/v1/generate",
        headers={"Authorization": f"Bearer {SUNO_API_KEY}"},
        json={
            "prompt": description,
            "duration": duration,
            "style": "instrumental"
        }
    )
    return response.json()["audio_url"]
```

### Appendix D: Recommended Reading

**Music Therapy for ASD:**
- LaGasse, A. B. (2017). Social outcomes in children with autism spectrum disorder: A review of music therapy outcomes. *Patient Related Outcome Measures*, 8, 23-32.
- Geretsegger, M., et al. (2014). Music therapy for people with autism spectrum disorder. *Cochrane Database of Systematic Reviews*.

**AI Music Generation:**
- Agostinelli, A., et al. (2023). MusicLM: Generating music from text. *arXiv preprint*.
- Copet, J., et al. (2023). Simple and controllable music generation. *arXiv preprint*.

**Prompt Engineering:**
- White, J., et al. (2023). A prompt pattern catalog to enhance prompt engineering with ChatGPT. *arXiv preprint*.
- Reynolds, L., & McDonell, K. (2021). Prompt programming for large language models. *ACL*.

---

**Document Version:** 1.0
**Date:** 2025-11-12
**Project Lead:** [Student Name]
**Faculty Mentor:** [Your Name]
**Institution:** [School/Organization]

