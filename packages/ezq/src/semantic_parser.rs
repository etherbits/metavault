use crate::lang::{
    ACTION_KEYWORDS, QUALIFIER_SEMANTICS,
    QualifierSegmentRule::{self, *},
};
use chrono::NaiveDate;
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

    fn parse_qualifiers(&self, expr: ASTExpr) -> Result<ASTExpr, ParseError> {
        Ok(match expr {
            ASTExpr::Leaf(qualifier) => ASTExpr::Leaf(self.parse_qualifier(qualifier)?),
            ASTExpr::And(exprs) => ASTExpr::And(
                exprs
                    .iter()
                    .map(|expr| self.parse_qualifiers(expr.clone()))
                    .collect::<Result<Vec<_>, _>>()?,
            ),
            ASTExpr::Or(exprs) => ASTExpr::Or(
                exprs
                    .iter()
                    .map(|expr| self.parse_qualifiers(expr.clone()))
                    .collect::<Result<Vec<_>, _>>()?,
            ),
            ASTExpr::Not(expr) => ASTExpr::Not(Box::new(self.parse_qualifiers(*expr)?)),
            _ => expr,
        })
    }

    fn parse_qualifier(&self, qualifier: String) -> Result<String, ParseError> {
        let qualifier_segments = qualifier.split(":").collect::<Vec<&str>>();
        let qualifier_prefix = self.matcher.fuzzy_match(
            qualifier_segments.first().unwrap(),
            QUALIFIER_SEMANTICS
                .iter()
                .map(|q| {
                    let Single(prefix) = q.first().unwrap() else {
                        unreachable!("Something went wrong getting qualifier prefix rule")
                    };

                    *prefix
                })
                .collect::<Vec<&str>>()
                .as_slice(),
        );

        let qualifier_semantic_rules = QUALIFIER_SEMANTICS
            .iter()
            .find(|q| match q.first().unwrap() {
                Single(prefix) => *prefix == qualifier_prefix,
                _ => false,
            })
            .unwrap();

        let rules = &qualifier_semantic_rules[1..];
        let mut parsed_segments = vec![qualifier_prefix.clone()];
        for (i, rule) in rules.iter().enumerate() {
            parsed_segments.push(self.parse_qualifier_rule(
                qualifier_segments.iter().nth(i + 1).unwrap_or(&""),
                rule,
                &qualifier_prefix,
            )?)
        }

        Ok(parsed_segments.join(":"))
    }

    fn parse_qualifier_rule(
        &self,
        segment: &str,
        rule: &QualifierSegmentRule,
        prefix: &String,
    ) -> Result<String, ParseError> {
        if !rule.is_valid(segment) {
            return Err(ParseError::InvalidQualifierSemantics(format!(
                "({}): {}",
                prefix,
                rule.get_err_msg(segment)
            )));
        };

        match rule {
            FuzzyList(options) => Ok(self.matcher.fuzzy_match(segment, options)),
            FuzzyListWithDefault(options, default) => Ok(if segment.len() > 0 {
                self.matcher.fuzzy_match(segment, options)
            } else {
                default.to_string()
            }),
            Date => {
                let (inequality, value) = rule.split_inequality_value(segment);

                Ok(format!(
                    "{}{}",
                    inequality,
                    NaiveDate::parse_from_str(&value, "%d-%m-%Y")
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                        .and_utc()
                        .timestamp()
                        .to_string()
                ))
            }
            _ => Ok(segment.to_string()),
        }
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

    fn parse_token_tree(&self, token_tree: ASTExpr) -> Result<ASTExpr, ParseError> {
        let (title, mut token_tree) = self.construct_title(token_tree);
        if let Some(title) = title {
            if let ASTExpr::And(exprs) = &mut token_tree {
                exprs.push(ASTExpr::Leaf(title));
            }
        }

        self.parse_qualifiers(token_tree)
    }

    pub fn parse(&self, token_tree: ASTExpr) -> Result<ASTExpr, ParseError> {
        let ast = match token_tree {
            ASTExpr::Root { action, expression } => Ok(ASTExpr::Root {
                action: self.parse_action(&action),
                expression: Box::new(self.parse_token_tree(*expression)?),
            }),
            _ => Err(ParseError::UnsupportedExpression),
        };

        println!("{:#?}", ast);
        ast
    }
}

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("Did not pass Root ASTExpr into parse")]
    UnsupportedExpression,
    #[error("Invalid qualifier semantics")]
    InvalidQualifierSemantics(String),
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
