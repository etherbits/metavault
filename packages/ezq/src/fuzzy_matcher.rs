use crate::lang::KEYWORD_SPACE;
use std::f64::INFINITY;

type SeqScoreFN = fn(usize, usize, usize) -> f64;

struct FuzzyScoreWeights {
    seq_acronym: SeqScoreFN,
    seq_regular: SeqScoreFN,
}

pub struct FuzzyMatcher {
    weights: FuzzyScoreWeights,
}

impl FuzzyMatcher {
    pub fn new() -> Self {
        FuzzyMatcher {
            weights: FuzzyScoreWeights {
                seq_acronym: |i, i_idx, c_idx| {
                    (i + 1).pow(2) as f64 * 5. * if i_idx == c_idx { 2. } else { 1. }
                },
                seq_regular: |i, i_idx, c_idx| {
                    (i + 1) as f64 * 3. * if i_idx == c_idx { 2. } else { 1. }
                },
            },
        }
    }

    pub fn fuzzy_match(&self, input: &str, candidates: &[&str]) -> String {
        let mut candidate_scores: Vec<(&str, f64)> = candidates
            .iter()
            .map(|candidate| (*candidate, self.get_match_score(input, candidate)))
            .collect();

        candidate_scores.sort_by(|a, b| b.1.total_cmp(&a.1));
        println!("candidate scores: {:?}", candidate_scores);
        candidate_scores[0].0.to_string()
    }

    fn get_match_score(&self, input: &str, candidate: &str) -> f64 {
        if self.get_normalized_keyword(input) == self.get_normalized_keyword(candidate) {
            return INFINITY;
        }

        let acronym_score = self.get_acronym_score(input, candidate);
        let queue_score = self.get_queue_score(input, candidate, self.weights.seq_regular);

        f64::max(acronym_score, queue_score)
    }

    fn get_acronym_score(&self, input: &str, candidate: &str) -> f64 {
        let acronym: String = candidate
            .split(KEYWORD_SPACE)
            .map(|w| w.chars().next().unwrap())
            .collect();

        self.get_queue_score(input, acronym.as_str(), self.weights.seq_acronym)
    }

    fn get_queue_score(&self, input: &str, candidate: &str, score_fn: SeqScoreFN) -> f64 {
        let queue_normalized_input = self.get_normalized_keyword(input);
        let queue_normalized_candidate = self.get_normalized_keyword(candidate);
        let mut input_chars = queue_normalized_input.chars();
        let mut input_char = match input_chars.next() {
            Some(c) => c,
            None => return 0.,
        };
        let mut score = 0.;
        let mut seq_match_count = 0;
        let mut input_idx = 0;

        for (candidate_idx, candidate_char) in queue_normalized_candidate.chars().enumerate() {
            if input_char == candidate_char {
                score += score_fn(seq_match_count, input_idx, candidate_idx);
                seq_match_count += 1;
                input_char = match input_chars.next() {
                    Some(c) => c,
                    None => break,
                };
                input_idx += 1;
            } else {
                seq_match_count = 0;
            }
        }

        score
    }

    fn get_normalized_keyword(&self, keyword: &str) -> String {
        keyword.replace(KEYWORD_SPACE, "").to_lowercase()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefer_match_acronym() {
        let input = "sea";
        let candidates = ["search_every_alias", "search"];

        assert_eq!(
            FuzzyMatcher::new().fuzzy_match(input, &candidates),
            "search_every_alias".to_string()
        );
    }

    #[test]
    fn prefer_correct_seq_queue() {
        let input = "searchingi";
        let candidates = ["searching_not_it", "searching_it"];

        assert_eq!(
            FuzzyMatcher::new().fuzzy_match(input, &candidates),
            "searching_it".to_string()
        );
    }

    #[test]
    fn prefer_exact_match() {
        let input = "search";
        let candidates = ["search_each_alias_regarding_core_hours", "search"];

        assert_eq!(
            FuzzyMatcher::new().fuzzy_match(input, &candidates),
            "search".to_string()
        );
    }
}
