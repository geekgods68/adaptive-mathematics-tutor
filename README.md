# Adaptive Mathematics Tutor

A transparent adaptive mathematics tutoring system that models learner knowledge, identifies conceptual weaknesses, and dynamically selects questions based on individual mastery and prerequisite relationships.

Developed as part of an independent research project under the mentorship of a UC Berkeley PhD researcher, the system investigates the relationship between mastery estimation, instructional sequencing, and the definition of mastery in adaptive learning environments.

## Overview

Conventional mathematics practice platforms often present learners with predetermined sequences of questions, regardless of their existing knowledge or conceptual weaknesses. This project explores an alternative approach in which instructional decisions are informed by a continuously updated representation of learner knowledge.

The system uses deterministic mathematical rules to estimate concept-level mastery and a directed prerequisite graph to inform question selection. Unlike black-box approaches, each instructional decision can be examined and traced to its underlying logic.

## Key Features

- **Adaptive question selection:** Dynamically selects questions based on estimated mastery, prerequisite knowledge, difficulty and response history.
- **Deterministic learner modelling:** Updates concept-level mastery estimates using interpretable mathematical rules.
- **Prerequisite graph:** Represents dependencies between mathematical concepts through a directed graph.
- **Structured question bank:** Contains 1,840 multiple-choice questions across five difficulty levels.
- **Targeted remediation:** Identifies conceptual weaknesses and revisits foundational concepts when necessary.
- **Diagnostic backtracking:** Investigates prerequisite knowledge following repeated incorrect responses.
- **Experimental configurations:** Supports controlled comparisons between adaptive and non-adaptive instructional strategies.
- **Synthetic learner simulation:** Evaluates system behaviour under different computational models of learning.
- **Research infrastructure:** Supports experimental logging, data exports, automated testing and reproducibility checks.

## Question Bank

| Component | Quantity |
|---|---:|
| Multiple-choice questions | 1,840 |
| Mathematics chapters | 14 |
| Mathematical concepts | 109 |
| Prerequisite relationships | 204 |
| Difficulty levels | 5 |
| Multi-concept questions | 64 |

Each question is associated with structured metadata that informs mastery estimation and instructional sequencing.

## System Architecture

The system consists of six interconnected components:

1. **Curriculum Model:** Organises mathematical concepts and their prerequisite relationships.
2. **Question Bank:** Stores questions and associated instructional metadata.
3. **Learner Model:** Maintains evolving concept-level mastery estimates.
4. **Mastery Estimator:** Updates estimates following learner responses.
5. **Selection Engine:** Determines the next instructional question.
6. **Evaluation Framework:** Records experimental outcomes and evaluates alternative configurations.

The instructional cycle operates as follows:

```text
Learner Response
       |
       v
Mastery Estimation
       |
       v
Concept-Level Knowledge State
       |
       v
Prerequisite and Response Analysis
       |
       v
Adaptive Question Selection
       |
       v
Next Question
```

## Mathematical Model

Each concept is associated with a mastery estimate between 0 and 1. These estimates are updated following learner interactions using deterministic rules that account for response correctness, question difficulty and, where applicable, hint usage.

The primary estimator applies bounded mastery updates, while alternative configurations allow the effects of different estimation rules and prerequisite-aware sequencing policies to be examined independently.

The deterministic approach prioritises interpretability, computational efficiency and traceability.

## Experimental Framework

Four instructional configurations are evaluated:

| Configuration | Description |
|---|---|
| C0 | Non-adaptive instructional sequencing |
| C1 | Adaptive sequencing using deterministic estimator A |
| C2 | Adaptive sequencing using deterministic estimator B with prerequisite awareness |
| C3 | Adaptive sequencing using deterministic estimator B without prerequisite awareness |

Bayesian Knowledge Tracing (BKT) is also used as a comparative mastery estimation method.

### Synthetic Learner Models

The evaluation framework simulates four families of learners:

- S1: Stationary learners
- S2: Bayesian Knowledge Tracing-generated learners
- S3: Practice-driven learners
- S4: Prerequisite-gated learners

These models represent different assumptions about how mathematical knowledge develops during instructional practice.

### Evaluation Metrics

- **Brier Score:** Measures the accuracy of response probability predictions.
- **Latent Mastery RMSE:** Measures discrepancies between estimated and simulated underlying mastery.
- **Final Average Mastery:** Measures overall knowledge attainment at the end of practice.
- **Full-Mastery Attainment:** Measures the proportion of learners satisfying the defined mastery criterion across the curriculum.
- **Questions to Mastery:** Explores the number of instructional questions required to satisfy the mastery criterion.

## Research

**Mastery Estimation, Question Sequencing, and the Definition of Mastery: An Exploratory Simulation Study of a Transparent Adaptive Mathematics Tutor**

The accompanying research investigates how different mastery estimation and instructional sequencing methods perform under alternative simulated learning conditions.

Two pilot experiments, each comprising 13,560 simulation runs, were conducted to examine system behaviour.

The exploratory findings indicate that:

- The relative performance of deterministic and probabilistic mastery estimators depends on the underlying learner model.
- Improvements in average mastery do not necessarily translate into higher full-mastery attainment.
- Changing the operational definition of mastery can reverse comparative conclusions about adaptive and non-adaptive instructional strategies.
- Prerequisite-aware instructional policies introduce trade-offs between targeted remediation and curriculum-wide attainment.

These findings highlight the importance of explicitly defining educational outcomes when designing and evaluating adaptive learning systems.

## Research Contributions

This project contributes:

- An interpretable deterministic mastery estimation framework.
- A structured mathematics question bank and prerequisite graph.
- A configurable adaptive instructional sequencing engine.
- A computational framework for evaluating tutoring strategies across heterogeneous learner models.
- An exploratory investigation into the sensitivity of adaptive learning evaluations to mastery definitions.

## Limitations

The experimental evaluation uses synthetic learners rather than human participants. Consequently, the findings describe computational behaviour under specified modelling assumptions and do not establish real-world educational effectiveness.

Further research is required to evaluate the system with human learners, examine alternative curriculum structures and validate the underlying learning assumptions.

## Future Development

Potential extensions include:

- Empirical evaluation with mathematics students.
- Personalised misconception diagnosis.
- Hybrid deterministic and probabilistic learner models.
- More sophisticated instructional optimisation policies.
- Dynamic curriculum and prerequisite graph construction.
- Integration with conversational tutoring interfaces.
- Expansion across additional mathematical curricula.

## Research Interests

This project sits at the intersection of:

- Educational technology
- Artificial intelligence in education
- Computational modelling
- Knowledge tracing
- Adaptive learning
- Mathematical optimisation
- Learning analytics
- Human-computer interaction

## Acknowledgements

This project was developed through the RISE research programme under the mentorship of a UC Berkeley PhD researcher.

The system was developed to explore how transparent computational methods can support personalised mathematics education and contribute to a better understanding of adaptive instructional systems.
