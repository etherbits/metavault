use crate::lang::KEYWORD_SPACE;
use fuzzy_matcher::{FuzzyMatcher as _, skim::SkimMatcherV2};

pub struct FuzzyMatcher {
    matcher: SkimMatcherV2,
}

impl FuzzyMatcher {
    pub fn new() -> Self {
        FuzzyMatcher {
            matcher: SkimMatcherV2::default(),
        }
    }

    pub fn fuzzy_match(&self, input: &str, candidates: &[&str]) -> String {
        self.best_match(input, candidates).0.to_string()
    }

    pub fn fuzzy_match_confident(
        &self,
        input: &str,
        candidates: &[&str],
    ) -> Result<String, FuzzyMatchError> {
        if candidates.is_empty() {
            return Err(FuzzyMatchError {
                input: input.to_string(),
                candidates: vec![],
            });
        }

        let (candidate, score) = self.best_match(input, candidates);
        if score.is_confident(input) {
            Ok(candidate.to_string())
        } else {
            Err(FuzzyMatchError {
                input: input.to_string(),
                candidates: candidates
                    .iter()
                    .map(|candidate| candidate.to_string())
                    .collect(),
            })
        }
    }

    fn best_match<'a>(&self, input: &str, candidates: &'a [&'a str]) -> (&'a str, MatchScore) {
        debug_assert!(!candidates.is_empty());

        let mut candidate_scores: Vec<(&str, MatchScore)> = candidates
            .iter()
            .map(|candidate| (*candidate, self.get_match_score(input, candidate)))
            .collect();

        candidate_scores.sort_by(|a, b| b.1.cmp(&a.1));
        candidate_scores[0]
    }

    fn get_match_score(&self, input: &str, candidate: &str) -> MatchScore {
        let normalized_input = self.get_normalized_keyword(input);
        let normalized_candidate = self.get_normalized_keyword(candidate);
        let acronym = self.get_acronym(candidate);

        MatchScore {
            exact_match: normalized_input == normalized_candidate,
            exact_acronym_match: normalized_input == acronym,
            prefix_match_len: common_prefix_len(&normalized_input, &normalized_candidate),
            fuzzy_score: self
                .matcher
                .fuzzy_match(&normalized_candidate, &normalized_input)
                .unwrap_or(i64::MIN),
            acronym_fuzzy_score: self
                .matcher
                .fuzzy_match(&acronym, &normalized_input)
                .unwrap_or(i64::MIN),
            length_distance: normalized_candidate.len().abs_diff(normalized_input.len()),
            candidate_len: normalized_candidate.len(),
        }
    }

    fn get_acronym(&self, candidate: &str) -> String {
        candidate
            .split(KEYWORD_SPACE)
            .map(|w| w.chars().next().unwrap())
            .collect()
    }

    fn get_normalized_keyword(&self, keyword: &str) -> String {
        keyword.replace(KEYWORD_SPACE, "").to_lowercase()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct FuzzyMatchError {
    input: String,
    candidates: Vec<String>,
}

impl std::fmt::Display for FuzzyMatchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "The provided value: {} did not confidently match any possible option {:?}",
            self.input, self.candidates
        )
    }
}

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
struct MatchScore {
    exact_match: bool,
    exact_acronym_match: bool,
    prefix_match_len: usize,
    fuzzy_score: i64,
    acronym_fuzzy_score: i64,
    length_distance: usize,
    candidate_len: usize,
}

impl MatchScore {
    fn is_confident(&self, input: &str) -> bool {
        let normalized_input = input.replace(KEYWORD_SPACE, "").to_lowercase();
        if normalized_input.is_empty() {
            return false;
        }

        self.exact_match
            || self.exact_acronym_match
            || self.prefix_match_len == normalized_input.len()
            || self.fuzzy_score > i64::MIN
            || self.acronym_fuzzy_score > i64::MIN
    }

    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (
            self.exact_match,
            self.exact_acronym_match,
            self.fuzzy_score,
            self.acronym_fuzzy_score,
            self.prefix_match_len,
            std::cmp::Reverse(self.length_distance),
            std::cmp::Reverse(self.candidate_len),
        )
            .cmp(&(
                other.exact_match,
                other.exact_acronym_match,
                other.fuzzy_score,
                other.acronym_fuzzy_score,
                other.prefix_match_len,
                std::cmp::Reverse(other.length_distance),
                std::cmp::Reverse(other.candidate_len),
            ))
    }
}

fn common_prefix_len(left: &str, right: &str) -> usize {
    left.chars()
        .zip(right.chars())
        .take_while(|(l, r)| l == r)
        .count()
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

    #[test]
    fn prefer_shorter_matches() {
        let candidates = ["title", "tag"];

        assert_eq!(FuzzyMatcher::new().fuzzy_match("t", &candidates), "tag");
        assert_eq!(FuzzyMatcher::new().fuzzy_match("tg", &candidates), "tag");
        assert_eq!(FuzzyMatcher::new().fuzzy_match("ti", &candidates), "title");
    }

    #[test]
    fn fuzzy_subsequence_outranks_shared_starting_letter() {
        let candidates = ["in_progress", "dropped", "planning", "on_hold", "finished"];
        assert_eq!(
            FuzzyMatcher::new().fuzzy_match("progress", &candidates),
            "in_progress",
        );
    }

    #[test]
    fn confident_match_accepts_native_ezq_shortcuts() {
        let matcher = FuzzyMatcher::new();
        assert_eq!(
            matcher
                .fuzzy_match_confident("c", &["search", "create", "delete", "update"])
                .unwrap(),
            "create"
        );
        assert_eq!(
            matcher
                .fuzzy_match_confident("pub", &["public_rating", "personal_rating"])
                .unwrap(),
            "public_rating"
        );
        assert_eq!(
            matcher
                .fuzzy_match_confident("ovr", &["add", "override"])
                .unwrap(),
            "override"
        );
        assert_eq!(
            matcher
                .fuzzy_match_confident("ani", &["anilist", "tmdb", "igdb", "openlibrary"])
                .unwrap(),
            "anilist"
        );
    }

    #[test]
    fn confident_match_rejects_values_with_no_fuzzy_signal() {
        let err = FuzzyMatcher::new()
            .fuzzy_match_confident("zzzz", &["enrich"])
            .unwrap_err();

        assert_eq!(
            err.to_string(),
            "The provided value: zzzz did not confidently match any possible option [\"enrich\"]"
        );
    }
}
