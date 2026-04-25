use crate::lang::{ACTION_KEYWORDS, QUALIFIER_KEYWORDS};
use thiserror::Error;

use crate::{fuzzy_matcher::FuzzyMatcher, tokenizer::ASTExpr};

pub struct SemanticParser {
    matcher: FuzzyMatcher,
}

impl SemanticParser {
    pub fn new() -> Self {
        SemanticParser {
            matcher: FuzzyMatcher::new(),
        }
    }

    fn parse_action(&self, action: &str) -> String {
        let action = action.strip_prefix("/").unwrap_or(action);
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

    fn construct_title(&self, expr: ASTExpr) -> (Option<String>, ASTExpr) {
        let ASTExpr::And(exprs) = expr else {
            return (None, expr);
        };

        let (leaves, rest): (Vec<_>, Vec<_>) = exprs
            .into_iter()
            .partition(|expr| matches!(expr, ASTExpr::Leaf(inner) if !inner.contains(':')));

        let title = leaves
            .into_iter()
            .filter_map(|expr| {
                if let ASTExpr::Leaf(inner) = expr {
                    Some(inner)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("_");

        let title = if title.is_empty() {
            None
        } else {
            Some(format!("title:{title}"))
        };
        (title, ASTExpr::And(rest))
    }

    fn parse_token_tree(&self, token_tree: ASTExpr) -> ASTExpr {
        let (title, mut token_tree) = self.construct_title(token_tree);
        if let Some(title) = title {
            if let ASTExpr::And(exprs) = &mut token_tree {
                exprs.push(ASTExpr::Leaf(title));
            }
        }
        token_tree
    }

    pub fn parse(&self, token_tree: ASTExpr) -> Result<ASTExpr, ParseError> {
        let ast = match token_tree {
            ASTExpr::Root { action, expression } => Ok(ASTExpr::Root {
                action: self.parse_action(&action),
                expression: Box::new(self.parse_token_tree(*expression)),
            }),
            _ => Err(ParseError::UnsupportedExpression),
        };

        println!("{:#?}", ast);
        ast
    }
}

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("Pass Root ASTExpr into parse")]
    UnsupportedExpression,
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
