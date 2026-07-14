use thiserror::Error;

use crate::{fuzzy_matcher::FuzzyMatcher, lang::ACTION_KEYWORDS};

pub struct Tokenizer {
    matcher: FuzzyMatcher,
}

impl Tokenizer {
    pub fn new() -> Self {
        Tokenizer {
            matcher: FuzzyMatcher::new(),
        }
    }

    fn resolve_action(&self, action: &str) -> String {
        let stripped = action.strip_prefix('/').unwrap_or(action);
        self.matcher.fuzzy_match(stripped, ACTION_KEYWORDS)
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

    fn split_top_level_update_separator(
        &self,
        s: &str,
        allow_trailing_separator: bool,
    ) -> Option<(String, String)> {
        let mut open_count = 0;

        for (i, ch) in s.char_indices() {
            if ch == '(' {
                open_count += 1;
                continue;
            }

            if ch == ')' {
                open_count -= 1;
                continue;
            }

            if open_count == 0 && ch == '>' && i > 0 && s[..i].ends_with(' ') {
                let after_separator = &s[i + ch.len_utf8()..];
                if !after_separator.starts_with(' ')
                    && !(allow_trailing_separator && after_separator.is_empty())
                {
                    continue;
                }

                let left = s[..i].trim().to_string();
                let right = after_separator.trim().to_string();
                return Some((left, right));
            }
        }

        None
    }

    fn generate_token_tree(
        &self,
        query: &str,
        commands: Vec<String>,
    ) -> Result<ASTExpr, TokenizerError> {
        let action = match self.get_action_term(query) {
            Some(action) => action,
            None => "/search".to_string(),
        };

        let query = &query.replace(&action, "").replace("/", "");

        let expression = if self.resolve_action(&action) == "update" {
            let Some((selection, values)) =
                self.split_top_level_update_separator(query, !commands.is_empty())
            else {
                return Err(TokenizerError::MalformedUpdateExpression);
            };

            if values.is_empty() && commands.is_empty() {
                return Err(TokenizerError::MalformedUpdateExpression);
            }

            ASTExpr::Update {
                selection: Box::new(self.tokenize_expression(&selection)),
                values: Box::new(self.tokenize_expression(&values)),
            }
        } else {
            self.tokenize_expression(query)
        };

        Ok(ASTExpr::Root {
            action: action.strip_prefix("/").unwrap().to_string(),
            expression: Box::new(expression),
            commands,
        })
    }

    fn tokenize_expression(&self, query: &str) -> ASTExpr {
        let (query_without_global_paren, had_global_paren) = self.strip_global_paren(query.trim());
        let query = query_without_global_paren.as_str();

        if query.is_empty() {
            return ASTExpr::And(vec![]);
        }

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

    /// Normalizes an [`ASTExpr`] into disjunctive normal form.
    ///
    /// Applies the following rules recursively:
    /// - `And(And(a, b), c)` → `And(a, b, c)` (nested `And` inside `And` is flattened)
    /// - `Or(Or(a, b), c)` → `Or(a, b, c)` (nested `Or` inside `Or` is flattened)
    /// - `And(a, Or(b, c))` → `Or(And(a, b), And(a, c))` (`And` distributes over `Or`)
    fn normalize_expr(&self, expr: ASTExpr) -> ASTExpr {
        match expr {
            ASTExpr::And(children) => {
                let normalized = children
                    .into_iter()
                    .map(|child| self.normalize_expr(child))
                    .collect::<Vec<_>>();
                let has_or = normalized
                    .iter()
                    .any(|child| matches!(child, ASTExpr::Or(_)));

                if !has_or {
                    let mut flat = Vec::new();
                    for child in normalized {
                        append_conjunction(&mut flat, child);
                    }
                    return ASTExpr::And(flat);
                }

                let mut products = vec![vec![]];
                for child in normalized {
                    let alternatives = match child {
                        ASTExpr::Or(items) => items,
                        other => vec![other],
                    };
                    let mut expanded = Vec::with_capacity(products.len() * alternatives.len());

                    for product in products {
                        for alternative in &alternatives {
                            let mut branch = product.clone();
                            append_conjunction(&mut branch, alternative.clone());
                            expanded.push(branch);
                        }
                    }

                    products = expanded;
                }

                ASTExpr::Or(products.into_iter().map(ASTExpr::And).collect())
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
            ASTExpr::Update { selection, values } => ASTExpr::Update {
                selection: Box::new(self.normalize_expr(*selection)),
                values: Box::new(self.normalize_expr(*values)),
            },
            ASTExpr::Root {
                action,
                expression,
                commands,
            } => ASTExpr::Root {
                action,
                expression: Box::new(self.normalize_expr(*expression)),
                commands,
            },
            leaf => leaf,
        }
    }

    fn extract_commands(&self, query: &str) -> (String, Vec<String>) {
        let mut stripped = String::with_capacity(query.len());
        let mut commands = vec![];
        let mut token_start = None;

        for (i, ch) in query.char_indices() {
            if ch.is_whitespace() {
                if let Some(start) = token_start.take() {
                    let token = &query[start..i];
                    if let Some(mut expanded_commands) = self.parse_command_token(token) {
                        commands.append(&mut expanded_commands);
                    } else {
                        stripped.push_str(token);
                    }
                }
                stripped.push(ch);
            } else if token_start.is_none() {
                token_start = Some(i);
            }
        }

        if let Some(start) = token_start {
            let token = &query[start..];
            if let Some(mut expanded_commands) = self.parse_command_token(token) {
                commands.append(&mut expanded_commands);
            } else {
                stripped.push_str(token);
            }
        }

        (stripped.trim().to_string(), commands)
    }

    fn parse_command_token(&self, token: &str) -> Option<Vec<String>> {
        let command = token.strip_prefix('#')?;
        if command.is_empty() {
            return None;
        }

        let expanded_commands = self
            .expand_qualifier_value_list(command)
            .into_iter()
            .map(|command| command.to_ascii_lowercase())
            .collect::<Vec<_>>();

        if expanded_commands.iter().any(|command| {
            command.split(':').enumerate().any(|(index, segment)| {
                (index == 0 && segment.is_empty())
                    || (!segment.is_empty() && !is_valid_command_segment(segment))
            })
        }) {
            return None;
        }

        Some(expanded_commands)
    }

    pub fn tokenize(&self, mut input_query: &str) -> Result<ASTExpr, TokenizerError> {
        input_query = input_query.trim();
        if input_query.is_empty() {
            return Err(TokenizerError::EmptyInput);
        }

        let (mut query_without_commands, commands) = self.extract_commands(input_query);
        if query_without_commands.is_empty() && !commands.is_empty() {
            query_without_commands = "/s".to_string();
        }

        if query_without_commands.is_empty() {
            return Err(TokenizerError::EmptyInput);
        }

        let token_tree = self.generate_token_tree(&query_without_commands, commands)?;
        let normalized_tree = self.normalize_expr(token_tree);

        Ok(normalized_tree)
    }
}

fn append_conjunction(target: &mut Vec<ASTExpr>, expr: ASTExpr) {
    match expr {
        ASTExpr::And(items) => target.extend(items),
        other => target.push(other),
    }
}

fn is_valid_command_segment(segment: &str) -> bool {
    segment
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
}

#[derive(Debug, Error)]
pub enum TokenizerError {
    #[error("the input query was empty")]
    EmptyInput,
    #[error("`update` requires `<match query> > <write query>`")]
    MalformedUpdateExpression,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize, tsify_next::Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub enum ASTExpr {
    Root {
        action: String,
        expression: Box<ASTExpr>,
        commands: Vec<String>,
    },
    Update {
        selection: Box<ASTExpr>,
        values: Box<ASTExpr>,
    },
    And(Vec<ASTExpr>),
    Or(Vec<ASTExpr>),
    Not(Box<ASTExpr>),
    Leaf(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tk() -> Tokenizer {
        Tokenizer::new()
    }

    fn root(action: &str, expr: ASTExpr) -> ASTExpr {
        ASTExpr::Root {
            action: action.to_string(),
            expression: Box::new(expr),
            commands: vec![],
        }
    }

    fn root_with_commands(action: &str, expr: ASTExpr, commands: Vec<&str>) -> ASTExpr {
        ASTExpr::Root {
            action: action.to_string(),
            expression: Box::new(expr),
            commands: commands.into_iter().map(str::to_string).collect(),
        }
    }

    fn leaf(s: &str) -> ASTExpr {
        ASTExpr::Leaf(s.to_string())
    }

    fn and(items: Vec<ASTExpr>) -> ASTExpr {
        ASTExpr::And(items)
    }

    fn or(items: Vec<ASTExpr>) -> ASTExpr {
        ASTExpr::Or(items)
    }

    fn not(item: ASTExpr) -> ASTExpr {
        ASTExpr::Not(Box::new(item))
    }

    fn update(selection: ASTExpr, values: ASTExpr) -> ASTExpr {
        ASTExpr::Update {
            selection: Box::new(selection),
            values: Box::new(values),
        }
    }

    // === tokenize: input validation ===

    #[test]
    fn empty_input_returns_error() {
        let result = tk().tokenize("   ");
        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "the input query was empty"
        );
    }

    // === tokenize: action handling ===

    #[test]
    fn defaults_to_search_when_no_action_term() {
        let ast = tk().tokenize("hello").unwrap();
        assert_eq!(ast, root("search", leaf("hello")));
    }

    #[test]
    fn explicit_action_overrides_default() {
        let ast = tk().tokenize("/create hello").unwrap();
        assert_eq!(ast, root("create", leaf("hello")));
    }

    #[test]
    fn extracts_commands_from_create_query() {
        let ast = tk().tokenize("/c something #a #b").unwrap();
        assert_eq!(
            ast,
            root_with_commands("c", leaf("something"), vec!["a", "b"])
        );
    }

    #[test]
    fn expands_comma_separated_command_token() {
        let ast = tk().tokenize("/c something #a,b,c").unwrap();
        assert_eq!(
            ast,
            root_with_commands("c", leaf("something"), vec!["a", "b", "c"])
        );
    }

    #[test]
    fn expands_command_token_like_qualifier_values() {
        let ast = tk().tokenize("/c something #enrich:a,b:full").unwrap();
        assert_eq!(
            ast,
            root_with_commands(
                "c",
                leaf("something"),
                vec!["enrich:a:full", "enrich:b:full"]
            )
        );
    }

    #[test]
    fn extracts_command_tokens_with_empty_non_name_segments() {
        let ast = tk()
            .tokenize("/c something #e::anilist #enrich:override:")
            .unwrap();
        assert_eq!(
            ast,
            root_with_commands(
                "c",
                leaf("something"),
                vec!["e::anilist", "enrich:override:"]
            )
        );
    }

    #[test]
    fn expands_nested_command_token_to_cartesian_product() {
        let ast = tk()
            .tokenize("/c something #enrich:a,b:full,preview")
            .unwrap();
        assert_eq!(
            ast,
            root_with_commands(
                "c",
                leaf("something"),
                vec![
                    "enrich:a:full",
                    "enrich:a:preview",
                    "enrich:b:full",
                    "enrich:b:preview"
                ]
            )
        );
    }

    #[test]
    fn extracts_commands_from_search_query_and_normalizes_case() {
        let ast = tk().tokenize("title:#Alive #Enrich #source-api").unwrap();
        assert_eq!(
            ast,
            root_with_commands("search", leaf("title:#Alive"), vec!["enrich", "source-api"])
        );
    }

    #[test]
    fn command_tokens_do_not_become_title_terms() {
        let ast = tk().tokenize("/c something #enrich").unwrap();
        assert_eq!(
            ast,
            root_with_commands("c", leaf("something"), vec!["enrich"])
        );
    }

    #[test]
    fn invalid_command_like_tokens_remain_expression_terms() {
        let ast = tk().tokenize("/c #").unwrap();
        assert_eq!(ast, root("c", leaf("#")));
    }

    #[test]
    fn invalid_command_lists_remain_expression_terms() {
        let ast = tk().tokenize("/c #a,,b").unwrap();
        assert_eq!(ast, root("c", and(vec![leaf("#a"), leaf(""), leaf("b")])));

        let ast = tk().tokenize("/c #a,:full").unwrap();
        assert_eq!(ast, root("c", and(vec![leaf("#a:full"), leaf(":full")])));

        let ast = tk().tokenize("/c #a,@b").unwrap();
        assert_eq!(ast, root("c", and(vec![leaf("#a"), leaf("@b")])));
    }

    #[test]
    fn action_can_appear_anywhere_in_input() {
        let ast = tk()
            .tokenize("hello /update world > status:finished")
            .unwrap();
        assert_eq!(
            ast,
            root(
                "update",
                update(
                    and(vec![leaf("hello"), leaf("world")]),
                    leaf("status:finished")
                )
            )
        );
    }

    #[test]
    fn update_requires_top_level_separator() {
        let err = tk().tokenize("/update id:42 status:finished").unwrap_err();
        assert!(matches!(err, TokenizerError::MalformedUpdateExpression));
    }

    #[test]
    fn update_requires_spaces_around_separator() {
        let err = tk().tokenize("/update id:42>status:finished").unwrap_err();
        assert!(matches!(err, TokenizerError::MalformedUpdateExpression));
    }

    #[test]
    fn update_splits_match_and_write_sides() {
        let ast = tk()
            .tokenize("/update (status:planning|status:on_hold) id:42 > status:finished tag:action")
            .unwrap();
        assert_eq!(
            ast,
            root(
                "update",
                update(
                    or(vec![
                        and(vec![leaf("status:planning"), leaf("id:42")]),
                        and(vec![leaf("status:on_hold"), leaf("id:42")]),
                    ]),
                    and(vec![leaf("status:finished"), leaf("tag:action")]),
                )
            )
        );
    }

    #[test]
    fn update_allows_empty_selection() {
        let ast = tk().tokenize("/u > tag:action").unwrap();
        assert_eq!(ast, root("u", update(and(vec![]), leaf("tag:action"))));
    }

    #[test]
    fn update_abbreviation_still_triggers_split() {
        let ast = tk().tokenize("/u attack > status:progress").unwrap();
        assert_eq!(
            ast,
            root("u", update(leaf("attack"), leaf("status:progress")),)
        );
    }

    #[test]
    fn update_does_not_split_on_inequality_operator() {
        let ast = tk()
            .tokenize("/update created_at:>=01-06-2024 > status:finished")
            .unwrap();
        assert_eq!(
            ast,
            root(
                "update",
                update(leaf("created_at:>=01-06-2024"), leaf("status:finished"))
            )
        );
    }

    #[test]
    fn update_extracts_command_from_write_side() {
        let ast = tk().tokenize("/u title > #enrich").unwrap();
        assert_eq!(
            ast,
            root_with_commands("u", update(leaf("title"), and(vec![])), vec!["enrich"])
        );
    }

    #[test]
    fn update_extracts_command_alongside_write_values() {
        let ast = tk()
            .tokenize("/u title > status:finished #enrich #ENRICH")
            .unwrap();
        assert_eq!(
            ast,
            root_with_commands(
                "u",
                update(leaf("title"), leaf("status:finished")),
                vec!["enrich", "enrich"]
            )
        );
    }

    #[test]
    fn update_extracts_expanded_command_from_write_side() {
        let ast = tk().tokenize("/u title > #enrich:a,b:full").unwrap();
        assert_eq!(
            ast,
            root_with_commands(
                "u",
                update(leaf("title"), and(vec![])),
                vec!["enrich:a:full", "enrich:b:full"]
            )
        );
    }

    #[test]
    fn command_only_input_defaults_to_empty_search() {
        let ast = tk().tokenize("#enrich").unwrap();
        assert_eq!(ast, root_with_commands("s", and(vec![]), vec!["enrich"]));
    }

    #[test]
    fn single_char_action_after_slash_too_short_to_be_action() {
        // get_action_term requires the slice (incl. '/') to be >= 2 chars,
        // so "/" alone falls back to the default "/search" and the bare "/"
        // is stripped from the expression, leaving an empty conjunction.
        let ast = tk().tokenize("/").unwrap();
        assert_eq!(ast, root("search", and(vec![])));
    }

    #[test]
    fn action_only_input_yields_empty_conjunction() {
        let ast = tk().tokenize("/s").unwrap();
        assert_eq!(ast, root("s", and(vec![])));

        let ast = tk().tokenize("/search").unwrap();
        assert_eq!(ast, root("search", and(vec![])));
    }

    // === tokenize: leaf-level expressions ===

    #[test]
    fn single_qualifier_is_leaf() {
        let ast = tk().tokenize("tag:action").unwrap();
        assert_eq!(ast, root("search", leaf("tag:action")));
    }

    // === tokenize: AND / OR / NOT ===

    #[test]
    fn space_separated_terms_become_and() {
        let ast = tk().tokenize("hello world").unwrap();
        assert_eq!(ast, root("search", and(vec![leaf("hello"), leaf("world")])));
    }

    #[test]
    fn pipe_separated_terms_become_or() {
        let ast = tk().tokenize("a|b").unwrap();
        assert_eq!(ast, root("search", or(vec![leaf("a"), leaf("b")])));
    }

    #[test]
    fn or_takes_precedence_over_and_at_top_level() {
        let ast = tk().tokenize("a b|c").unwrap();
        assert_eq!(
            ast,
            root(
                "search",
                or(vec![and(vec![leaf("a"), leaf("b")]), leaf("c")])
            ),
        );
    }

    #[test]
    fn negation_with_bang_on_single_term() {
        let ast = tk().tokenize("!tag:action").unwrap();
        assert_eq!(ast, root("search", not(leaf("tag:action"))));
    }

    #[test]
    fn negation_with_bang_on_paren_group() {
        let ast = tk().tokenize("!(a b)").unwrap();
        assert_eq!(ast, root("search", not(and(vec![leaf("a"), leaf("b")]))),);
    }

    // === tokenize: parentheses & precedence ===

    #[test]
    fn parens_group_or_inside_and() {
        let ast = tk().tokenize("a (b|c)").unwrap();
        assert_eq!(
            ast,
            root(
                "search",
                or(vec![
                    and(vec![leaf("a"), leaf("b")]),
                    and(vec![leaf("a"), leaf("c")]),
                ])
            ),
        );
    }

    #[test]
    fn parens_protect_inner_pipe_from_top_level_or() {
        // Without the parens this would be Or([Leaf("a b"), Leaf("c")]).
        let ast = tk().tokenize("a (b|c) d").unwrap();
        assert_eq!(
            ast,
            root(
                "search",
                or(vec![
                    and(vec![leaf("a"), leaf("b"), leaf("d")]),
                    and(vec![leaf("a"), leaf("c"), leaf("d")]),
                ]),
            ),
        );
    }

    // === tokenize: normalization (flattening) ===

    #[test]
    fn nested_and_is_flattened() {
        let ast = tk().tokenize("(a b) c").unwrap();
        assert_eq!(
            ast,
            root("search", and(vec![leaf("a"), leaf("b"), leaf("c")])),
        );
    }

    #[test]
    fn nested_or_is_flattened() {
        let ast = tk().tokenize("(a|b)|c").unwrap();
        assert_eq!(
            ast,
            root("search", or(vec![leaf("a"), leaf("b"), leaf("c")])),
        );
    }

    // === tokenize: qualifier value list expansion ===

    #[test]
    fn comma_in_qualifier_type_expands_to_and() {
        let ast = tk().tokenize("tag,status:in_progress").unwrap();
        assert_eq!(
            ast,
            root(
                "search",
                and(vec![leaf("tag:in_progress"), leaf("status:in_progress")]),
            ),
        );
    }

    #[test]
    fn comma_in_qualifier_value_expands_to_and() {
        let ast = tk().tokenize("tag:action,adventure").unwrap();
        assert_eq!(
            ast,
            root(
                "search",
                and(vec![leaf("tag:action"), leaf("tag:adventure")]),
            ),
        );
    }

    #[test]
    fn nested_qualifier_expansion_produces_cartesian_product() {
        let ast = tk().tokenize("tag:action,adventure:minor,dark").unwrap();
        assert_eq!(
            ast,
            root(
                "search",
                and(vec![
                    leaf("tag:action:minor"),
                    leaf("tag:action:dark"),
                    leaf("tag:adventure:minor"),
                    leaf("tag:adventure:dark"),
                ]),
            ),
        );
    }

    // === tokenize: expand_qualifier_value_list (direct) ===

    #[test]
    fn expand_qualifier_no_colon_splits_on_comma() {
        let result = tk().expand_qualifier_value_list("a, b ,c");
        assert_eq!(result, vec!["a", "b", "c"]);
    }

    #[test]
    fn expand_qualifier_single_pair() {
        let result = tk().expand_qualifier_value_list("tag:action");
        assert_eq!(result, vec!["tag:action"]);
    }

    #[test]
    fn expand_qualifier_value_list_recurses_through_colons() {
        let result = tk().expand_qualifier_value_list("a,b:c,d:e,f");
        assert_eq!(
            result,
            vec![
                "a:c:e", "a:c:f", "a:d:e", "a:d:f", "b:c:e", "b:c:f", "b:d:e", "b:d:f",
            ],
        );
    }

    // === normalize_expr (direct) ===

    #[test]
    fn normalize_flattens_deeply_nested_and() {
        let nested = ASTExpr::And(vec![
            ASTExpr::And(vec![leaf("a"), ASTExpr::And(vec![leaf("b"), leaf("c")])]),
            leaf("d"),
        ]);
        assert_eq!(
            tk().normalize_expr(nested),
            and(vec![leaf("a"), leaf("b"), leaf("c"), leaf("d")]),
        );
    }

    #[test]
    fn normalize_distributes_or_inside_and() {
        let nested = ASTExpr::And(vec![leaf("a"), ASTExpr::Or(vec![leaf("b"), leaf("c")])]);
        assert_eq!(
            tk().normalize_expr(nested),
            or(vec![
                and(vec![leaf("a"), leaf("b")]),
                and(vec![leaf("a"), leaf("c")]),
            ]),
        );
    }

    #[test]
    fn normalize_distributes_multiple_or_groups_as_cartesian_product() {
        let nested = and(vec![
            or(vec![leaf("a"), leaf("b")]),
            leaf("c"),
            or(vec![leaf("d"), leaf("e")]),
        ]);
        assert_eq!(
            tk().normalize_expr(nested),
            or(vec![
                and(vec![leaf("a"), leaf("c"), leaf("d")]),
                and(vec![leaf("a"), leaf("c"), leaf("e")]),
                and(vec![leaf("b"), leaf("c"), leaf("d")]),
                and(vec![leaf("b"), leaf("c"), leaf("e")]),
            ]),
        );
    }

    #[test]
    fn tokenize_distributes_shared_qualifier_across_grouped_titles() {
        assert_eq!(
            tk().tokenize("/c (bleach | code geass) type:anime")
                .unwrap(),
            root(
                "c",
                or(vec![
                    and(vec![leaf("bleach"), leaf("type:anime")]),
                    and(vec![leaf("code"), leaf("geass"), leaf("type:anime")]),
                ]),
            ),
        );
    }

    #[test]
    fn normalize_recurses_under_not() {
        let nested = ASTExpr::Not(Box::new(ASTExpr::And(vec![
            ASTExpr::And(vec![leaf("a"), leaf("b")]),
            leaf("c"),
        ])));
        assert_eq!(
            tk().normalize_expr(nested),
            not(and(vec![leaf("a"), leaf("b"), leaf("c")])),
        );
    }

    #[test]
    fn normalize_descends_through_root() {
        let nested = root(
            "search",
            ASTExpr::And(vec![ASTExpr::And(vec![leaf("a"), leaf("b")]), leaf("c")]),
        );
        assert_eq!(
            tk().normalize_expr(nested),
            root("search", and(vec![leaf("a"), leaf("b"), leaf("c")])),
        );
    }
}
