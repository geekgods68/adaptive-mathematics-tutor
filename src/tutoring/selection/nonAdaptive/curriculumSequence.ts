/**
 * The fixed presentation order for the non-adaptive condition. Every
 * participant in this condition receives this exact sequence, regardless
 * of their responses — that is the experimental control.
 *
 * The order deliberately does NOT progress monotonically by difficulty
 * (1, 2, 4, 2, 3): a fixed but varied difficulty distribution, decided in
 * advance, is what section 14 of the research design calls for. This is a
 * placeholder-scale sequence covering the 5 seed questions; the production
 * curriculum sequence is authored in a later phase once the full question
 * bank exists.
 */
export const NON_ADAPTIVE_CURRICULUM_SEQUENCE: string[] = [
  "q-expand-brackets-01", // difficulty 1
  "q-solve-factorisation-01", // difficulty 2
  "q-discriminant-nature-01", // difficulty 4
  "q-factorise-identify-01", // difficulty 2
  "q-quadratic-formula-01", // difficulty 3
];
