use regex::Regex;
use thiserror::Error;

use crate::lang::KEYWORD_SPACE;

pub struct Tokenizer {}

impl Tokenizer {
    pub fn new() -> Self {
        Tokenizer {}
    }

    fn expand_qualifier_value_list(&self, qualifier: &str) -> Vec<String> {
        let Some((qualifier_type_section, qualifier_value_section)) = qualifier.split_once(':')
        else {
            return qualifier.split(",").map(|s| s.trim().to_string()).collect();
        };

        let qualifier_types: Vec<&str> = qualifier_type_section
            .split(",")
            .map(|s| s.trim())
            .collect();

        let expanded_inner_qualifiers = self.expand_qualifier_value_list(qualifier_value_section);

        qualifier_types
            .into_iter()
            .flat_map(|qualifier_type| {
                expanded_inner_qualifiers
                    .iter()
                    .map(|qualifier_value| {
                        (qualifier_type.to_string() + ":" + qualifier_value).to_string()
                    })
                    .collect::<Vec<String>>()
            })
            .collect()
    }

    fn split_at_indices(&self, s: &str, indices: Vec<usize>) -> Vec<String> {
        let mut result = Vec::new();
        let mut last = 0;
        for &i in indices.iter() {
            result.push(s[last..i].to_string());
            last = i + 1;
        }
        result.push(s[last..].to_string());
        result
    }

    fn strip_global_paren(&self, query: &str) -> (String, bool) {
        if !query.starts_with('(') && !query.starts_with("!(") {
            return (query.to_string(), false);
        }
        let mut open_count = 0;

        for (i, ch) in query.char_indices() {
            if ch == '(' {
                open_count += 1;
            } else if ch == ')' {
                if i == query.len() - 1 && open_count == 1 {
                    return (
                        query
                            .replacen("(", "", 1)
                            .strip_suffix(")")
                            .unwrap()
                            .to_string(),
                        true,
                    );
                } else if open_count == 1 {
                    return (query.to_string(), false);
                }

                open_count -= 1;
            }
        }

        (query.to_string(), false)
    }

    fn get_action_term(&self, query: &str) -> Option<String> {
        let mut escape = false;
        let mut start_idx = 0;
        let mut end_idx = 0;

        for (i, ch) in query.char_indices() {
            match ch {
                '/' => start_idx = i,
                ' ' | '|' | ':' | '(' | ')' => {
                    end_idx = i;
                    break;
                }
                '\\' => escape = !escape,
                _ => escape = false,
            }
        }

        if start_idx > query.len()
            || end_idx > query.len()
            || start_idx >= end_idx
            || end_idx.abs_diff(start_idx) < 2
        {
            return None;
        }

        return Some(query[start_idx..end_idx].to_string());
    }

    fn generate_token_tree(&self, query: &str) -> TokenExpr {
        let action = match self.get_action_term(query) {
            Some(action) => action,
            None => "/search".to_string(),
        };

        let query = &query.replace(&action, "").replace("/", "");

        return TokenExpr::Root {
            action: action.strip_prefix("/").unwrap().to_string(),
            expression: Box::new(self.tokenize_expression(query)),
        };
    }

    fn tokenize_expression(&self, query: &str) -> TokenExpr {
        let (query_without_global_paren, had_global_paren) = self.strip_global_paren(query.trim());
        let query = query_without_global_paren.as_str();

        if query.starts_with("!") && had_global_paren {
            return TokenExpr::Not(Box::new(
                self.tokenize_expression(query.strip_prefix("!").unwrap()),
            ));
        }

        if !query.contains("|") && !query.contains(" ") {
            if query.starts_with("!") {
                return TokenExpr::Not(Box::new(
                    self.tokenize_expression(query.strip_prefix("!").unwrap()),
                ));
            }

            let qualifiers: Vec<TokenExpr> = self
                .expand_qualifier_value_list(query)
                .iter()
                .map(|q| TokenExpr::Leaf(q.to_string()))
                .collect();

            if qualifiers.len() > 1 {
                return TokenExpr::And(qualifiers);
            } else {
                return qualifiers[0].clone();
            }
        }

        let mut curr_or_indicies = vec![];
        let mut curr_and_indicies = vec![];

        let mut open_count = 0;

        for (i, ch) in query.char_indices() {
            if ch == '(' {
                open_count += 1;
            } else if ch == ')' {
                open_count -= 1;
            }

            if open_count > 0 {
                continue;
            }

            if ch == '|' {
                curr_or_indicies.push(i);
            } else if ch == ' ' {
                curr_and_indicies.push(i);
            }
        }

        if curr_or_indicies.len() > 0 {
            return TokenExpr::Or(
                self.split_at_indices(query, curr_or_indicies)
                    .iter()
                    .filter(|term| term.trim().len() > 0)
                    .map(|term| self.tokenize_expression(term))
                    .collect::<Vec<TokenExpr>>(),
            );
        } else {
            return TokenExpr::And(
                self.split_at_indices(query, curr_and_indicies)
                    .iter()
                    .filter(|term| term.trim().len() > 0)
                    .map(|term| self.tokenize_expression(term))
                    .collect::<Vec<TokenExpr>>(),
            );
        }
    }

    pub fn tokenize(&self, mut input_query: &str) -> Result<TokenExpr, TokenizerError> {
        input_query = input_query.trim();
        if input_query.is_empty() {
            return Err(TokenizerError::EmptyInput);
        }

        let token_tree = self.generate_token_tree(input_query);
        println!("{:#?}", token_tree);

        Ok(token_tree)
    }
}

#[derive(Debug, Error)]
pub enum TokenizerError {
    #[error("the input query was empty")]
    EmptyInput,
}

#[derive(Debug, Clone)]
pub enum TokenExpr {
    Root {
        action: String,
        expression: Box<TokenExpr>,
    },
    And(Vec<TokenExpr>),
    Or(Vec<TokenExpr>),
    Not(Box<TokenExpr>),
    Leaf(String),
}

// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn multi_title_multi_meta() {
//         let input_query =
//             r#"Attack on titan type:tv-series tg:action,monster release:>2020"#;
//         let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

//         assert_eq!(tokenized_query.action, "s");
//         assert_eq!(
//             tokenized_query.targets,
//             vec!["AOT".to_string(), "Attack On Titan".to_string()]
//         );
//         assert_eq!(
//             tokenized_query.qualifications,
//             vec!["type:tv-series", "tg:action", "tg:monster", "release:>2020"]
//         );
//     }

//     #[test]
//     fn multi_title() {
//         let input_query = r#"s "AOT" "Attack On Titan""#;
//         let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

//         assert_eq!(tokenized_query.action, "s");
//         assert_eq!(
//             tokenized_query.targets,
//             vec!["AOT".to_string(), "Attack On Titan".to_string()]
//         );
//         assert_eq!(tokenized_query.qualifications.is_empty(), true);
//     }

//     #[test]
//     fn single_title_single_tag() {
//         let input_query = r#"s Attack On Titan tag:action"#;
//         let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

//         assert_eq!(tokenized_query.action, "s");
//         assert_eq!(tokenized_query.targets, vec!["Attack On Titan".to_string()]);
//         assert_eq!(
//             tokenized_query.qualifications,
//             vec!["tag:action".to_string()]
//         );
//     }

//     #[test]
//     fn action_metadata() {
//         let input_query = r#"s tag:action"#;
//         let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

//         assert_eq!(tokenized_query.action, "s");
//         assert_eq!(tokenized_query.targets.is_empty(), true);
//         assert_eq!(
//             tokenized_query.qualifications,
//             vec!["tag:action".to_string()]
//         );
//     }

//     #[test]
//     fn single_title() {
//         let input_query = r#"s Attack On Titan"#;
//         let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

//         assert_eq!(tokenized_query.action, "s");
//         assert_eq!(tokenized_query.targets, vec!["Attack On Titan".to_string()]);
//         assert_eq!(tokenized_query.qualifications.is_empty(), true);
//     }

//     #[test]
//     fn empty_input() {
//         let input_query = r#"  "#;
//         let result = Tokenizer::new().tokenize(input_query);

//         assert!(result.is_err());
//         assert_eq!(
//             result.err().unwrap().to_string(),
//             "the input query was empty"
//         );
//     }

//     #[test]
//     fn only_action() {
//         let input_query = r#"s"#;
//         let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

//         assert_eq!(tokenized_query.action, "s");
//         assert_eq!(tokenized_query.targets.is_empty(), true);
//         assert_eq!(tokenized_query.qualifications.is_empty(), true);
//     }

//     #[test]
//     fn nested_meta() {
//         let input_query = r#"s attack tag:action,adventure:minor,dark tag:fantasy"#;
//         let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

//         assert_eq!(tokenized_query.action, "s");
//         assert_eq!(tokenized_query.targets, vec!["attack"]);
//         assert_eq!(
//             tokenized_query.qualifications,
//             vec![
//                 "tag:action:minor",
//                 "tag:action:dark",
//                 "tag:adventure:minor",
//                 "tag:adventure:dark",
//                 "tag:fantasy"
//             ]
//         );
//     }
// }
