use thiserror::Error;

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
        let mut start_idx = None;
        let mut end_idx = None;

        for (i, ch) in query.char_indices() {
            match ch {
                '/' => start_idx = Some(i),
                ' ' | '|' | ':' | '(' | ')' => {
                    if start_idx.is_none() {
                        continue;
                    };
                    end_idx = Some(i);
                    break;
                }
                '\\' => escape = !escape,
                _ => escape = false,
            }
        }

        if start_idx.is_none() {
            return None;
        }

        let start_idx = start_idx.unwrap();
        let end_idx = match end_idx {
            Some(idx) => idx,
            None => query.len(),
        };

        if start_idx > query.len()
            || end_idx > query.len()
            || start_idx >= end_idx
            || end_idx.abs_diff(start_idx) < 2
        {
            return None;
        }

        return Some(query[start_idx..end_idx].to_string());
    }

    fn generate_token_tree(&self, query: &str) -> ASTExpr {
        let action = match self.get_action_term(query) {
            Some(action) => action,
            None => "/search".to_string(),
        };

        let query = &query.replace(&action, "").replace("/", "");

        return ASTExpr::Root {
            action: action.strip_prefix("/").unwrap().to_string(),
            expression: Box::new(self.tokenize_expression(query)),
        };
    }

    fn tokenize_expression(&self, query: &str) -> ASTExpr {
        let (query_without_global_paren, had_global_paren) = self.strip_global_paren(query.trim());
        let query = query_without_global_paren.as_str();

        if query.starts_with("!") && had_global_paren {
            return ASTExpr::Not(Box::new(
                self.tokenize_expression(query.strip_prefix("!").unwrap()),
            ));
        }

        if !query.contains("|") && !query.contains(" ") {
            if query.starts_with("!") {
                return ASTExpr::Not(Box::new(
                    self.tokenize_expression(query.strip_prefix("!").unwrap()),
                ));
            }

            let qualifiers: Vec<ASTExpr> = self
                .expand_qualifier_value_list(query)
                .iter()
                .map(|q| ASTExpr::Leaf(q.to_string()))
                .collect();

            if qualifiers.len() > 1 {
                return ASTExpr::And(qualifiers);
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
            return ASTExpr::Or(
                self.split_at_indices(query, curr_or_indicies)
                    .iter()
                    .filter(|term| term.trim().len() > 0)
                    .map(|term| self.tokenize_expression(term))
                    .collect::<Vec<ASTExpr>>(),
            );
        } else {
            return ASTExpr::And(
                self.split_at_indices(query, curr_and_indicies)
                    .iter()
                    .filter(|term| term.trim().len() > 0)
                    .map(|term| self.tokenize_expression(term))
                    .collect::<Vec<ASTExpr>>(),
            );
        }
    }

    /// Normalizes a [`TokenExpr`] by flattening nested logical expressions.
    ///
    /// Applies the following rules recursively:
    /// - `And(And(a, b), c)` → `And(a, b, c)` (nested `And` inside `And` is flattened)
    /// - `Or(Or(a, b), c)` → `Or(a, b, c)` (nested `Or` inside `Or` is flattened)
    fn normalize_expr(&self, expr: ASTExpr) -> ASTExpr {
        match expr {
            ASTExpr::And(children) => {
                let mut flat = Vec::new();
                for child in children {
                    match self.normalize_expr(child) {
                        ASTExpr::And(inner) => flat.extend(inner),
                        other => flat.push(other),
                    }
                }
                ASTExpr::And(flat)
            }
            ASTExpr::Or(children) => {
                let mut flat = Vec::new();
                for child in children {
                    match self.normalize_expr(child) {
                        ASTExpr::Or(inner) => flat.extend(inner),
                        other => flat.push(other),
                    }
                }
                ASTExpr::Or(flat)
            }
            ASTExpr::Not(inner) => ASTExpr::Not(Box::new(self.normalize_expr(*inner))),
            ASTExpr::Root { action, expression } => ASTExpr::Root {
                action,
                expression: Box::new(self.normalize_expr(*expression)),
            },
            leaf => leaf,
        }
    }

    pub fn tokenize(&self, mut input_query: &str) -> Result<ASTExpr, TokenizerError> {
        input_query = input_query.trim();
        if input_query.is_empty() {
            return Err(TokenizerError::EmptyInput);
        }

        let token_tree = self.generate_token_tree(input_query);
        let normalized_tree = self.normalize_expr(token_tree);
        println!("{:#?}", normalized_tree);

        Ok(normalized_tree)
    }
}

#[derive(Debug, Error)]
pub enum TokenizerError {
    #[error("the input query was empty")]
    EmptyInput,
}

#[derive(Debug, Clone, serde::Serialize, tsify_next::Tsify)]
#[tsify(into_wasm_abi)]
pub enum ASTExpr {
    Root {
        action: String,
        expression: Box<ASTExpr>,
    },
    And(Vec<ASTExpr>),
    Or(Vec<ASTExpr>),
    Not(Box<ASTExpr>),
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
