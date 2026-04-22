use crate::lang::{ACTION_KEYWORDS, QUALIFIER_KEYWORDS};
use thiserror::Error;

use crate::{fuzzy_matcher::FuzzyMatcher, tokenizer::TokenExpr};

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

    pub fn parse(&self, token_tree: TokenExpr) -> Result<ParsedQuery, ParseError> {
        Ok(ParsedQuery {
            action: "action".to_string(),
            targets: vec!["targets".to_string()],
            qualifications: vec![format!("{:?}", token_tree)],
        })
        // if token_tree.action.len() == 0 {
        //     return Err(ParseError::MissingAction);
        // }
        // Ok(ParsedQuery {
        //     action: self.parse_action(&tokenized_query.action),
        //     targets: tokenized_query.targets,
        //     qualifications: self.parse_qualifications(&tokenized_query.qualifications),
        // })
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

// #[cfg(test)]
// mod tests {
//     use super::*;

//     fn tokenized(action: &str, targets: &[&str], qualifications: &[&str]) -> TokenizedQuery {
//         TokenizedQuery {
//             action: action.to_string(),
//             targets: targets.iter().map(|t| t.to_string()).collect(),
//             qualifications: qualifications.iter().map(|q| q.to_string()).collect(),
//         }
//     }

//     #[test]
//     fn exact_action_match() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized("search", &[], &[]))
//             .unwrap();

//         assert_eq!(parsed.action, "search");
//     }

//     #[test]
//     fn fuzzy_action_acronym() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized("s", &[], &[]))
//             .unwrap();

//         assert_eq!(parsed.action, "search");
//     }

//     #[test]
//     fn fuzzy_action_partial() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized("crea", &[], &[]))
//             .unwrap();

//         assert_eq!(parsed.action, "create");
//     }

//     #[test]
//     fn missing_action_returns_error() {
//         let result = SemanticParser::new().parse(tokenized("", &[], &[]));

//         assert!(result.is_err());
//         assert_eq!(
//             result.err().unwrap().to_string(),
//             "the tokenized query is missing action segment"
//         );
//     }

//     #[test]
//     fn exact_qualifier_match() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized("search", &[], &["tag:action"]))
//             .unwrap();

//         assert_eq!(parsed.qualifications, vec!["tag:action"]);
//     }

//     #[test]
//     fn fuzzy_qualifier_match() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized("search", &[], &["ta:action"]))
//             .unwrap();

//         assert_eq!(parsed.qualifications, vec!["tag:action"]);
//     }

//     #[test]
//     fn multiple_qualifications_parsed() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized(
//                 "search",
//                 &[],
//                 &["ta:action", "stat:watching", "mt:tv-series"],
//             ))
//             .unwrap();

//         assert_eq!(
//             parsed.qualifications,
//             vec!["tag:action", "status:watching", "media_type:tv-series"]
//         );
//     }

//     #[test]
//     fn targets_pass_through_unchanged() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized("s", &["AOT", "Attack On Titan"], &[]))
//             .unwrap();

//         assert_eq!(
//             parsed.targets,
//             vec!["AOT".to_string(), "Attack On Titan".to_string()]
//         );
//     }

//     #[test]
//     fn action_targets_and_qualifications_parsed_together() {
//         let parsed = SemanticParser::new()
//             .parse(tokenized("s", &["Attack On Titan"], &["ta:action"]))
//             .unwrap();

//         assert_eq!(parsed.action, "search");
//         assert_eq!(parsed.targets, vec!["Attack On Titan".to_string()]);
//         assert_eq!(parsed.qualifications, vec!["tag:action"]);
//     }
// }
