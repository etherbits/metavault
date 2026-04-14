use crate::lang::ACTION_KEYWORDS;
use thiserror::Error;

use crate::{fuzzy_matcher::FuzzyMatcher, tokenizer::TokenizedQuery};

pub struct SemanticParser {
    matcher: FuzzyMatcher,
}

impl SemanticParser {
    pub fn new() -> Self {
        SemanticParser {
            matcher: FuzzyMatcher::new(),
        }
    }

    fn parse_action(&self, action: &String) -> String {
        let parsed_action = self.matcher.fuzzy_match(action, &ACTION_KEYWORDS);
        println!("parsed action: {}", parsed_action);
        parsed_action
    }

    fn parse_targets(&self, targets: &Vec<String>) -> Vec<String> {
        vec![]
    }

    fn parse_metadata(&self, metadata: &Vec<String>) -> Vec<String> {
        vec![]
    }

    pub fn parse(&self, tokenized_query: &TokenizedQuery) -> Result<ParsedQuery, ParseError> {
        Ok(ParsedQuery {
            action: self.parse_action(&tokenized_query.action_section),
            targets: self.parse_targets(&tokenized_query.target_section),
            metadata: self.parse_metadata(&tokenized_query.metadata_section),
        })
    }
}

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("the input query was empty")]
    EmptyInput,
}

#[derive(Debug, serde::Serialize, tsify_next::Tsify)]
#[tsify(into_wasm_abi)]
pub struct ParsedQuery {
    pub action: String,
    pub targets: Vec<String>,
    pub metadata: Vec<String>,
}
