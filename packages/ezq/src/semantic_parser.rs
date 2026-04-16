use crate::lang::{ACTION_KEYWORDS, QUALIFIER_KEYWORDS};
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
        parsed_action
    }

    fn parse_qualifications(&self, qualifications: &[String]) -> Vec<String> {
        qualifications
            .into_iter()
            .map(|q| self.parse_qualification(q))
            .collect()
    }

    fn parse_qualification(&self, qualification: &String) -> String {
        let (qualifier, rest) = match qualification.split_once(":") {
            Some((q, rest)) => (q, rest),
            None => ("", ""),
        };

        let parsed_qualifier = self.matcher.fuzzy_match(qualifier, &QUALIFIER_KEYWORDS);

        return parsed_qualifier + ":" + rest;
    }

    pub fn parse(&self, tokenized_query: TokenizedQuery) -> Result<ParsedQuery, ParseError> {
        if tokenized_query.action.len() == 0 {
            return Err(ParseError::MissingAction);
        }
        Ok(ParsedQuery {
            action: self.parse_action(&tokenized_query.action),
            targets: tokenized_query.targets,
            qualifications: self.parse_qualifications(&tokenized_query.qualifications),
        })
    }
}

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("the tokenized query is missing action segment")]
    MissingAction,
}

#[derive(Debug, serde::Serialize, tsify_next::Tsify)]
#[tsify(into_wasm_abi)]
pub struct ParsedQuery {
    pub action: String,
    pub targets: Vec<String>,
    pub qualifications: Vec<String>,
}
