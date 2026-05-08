use crate::lang::{
    ACTION_KEYWORDS, QUALIFIER_SEMANTICS,
    QualifierSegmentRule::{self, *},
};
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
            ASTExpr::Update { selection, values } => ASTExpr::Update {
                selection: Box::new(self.parse_token_tree(*selection)?),
                values: Box::new(self.parse_token_tree(*values)?),
            },
            _ => expr,
        })
    }

    fn parse_qualifier(&self, qualifier: String) -> Result<String, ParseError> {
        let qualifier_segments = qualifier.split(":").collect::<Vec<&str>>();
        let qualifier_prefix = self.resolve_qualifier_prefix(qualifier_segments.first().unwrap());

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

    fn resolve_qualifier_prefix(&self, input: &str) -> String {
        self.matcher.fuzzy_match(
            input,
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
        )
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
            _ => Ok(segment.to_string()),
        }
    }

    fn construct_title(&self, expr: ASTExpr) -> (Option<String>, ASTExpr) {
        if let ASTExpr::Leaf(inner) = &expr {
            if !inner.is_empty() && !inner.contains(':') {
                let title = format!("title:{inner}");
                return (Some(title), ASTExpr::And(vec![]));
            }
        }

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
        if let ASTExpr::Update { selection, values } = token_tree {
            return Ok(ASTExpr::Update {
                selection: Box::new(self.parse_token_tree(*selection)?),
                values: Box::new(self.parse_token_tree(*values)?),
            });
        }

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

#[cfg(test)]
mod tests {
    use super::*;

    fn parser() -> SemanticParser {
        SemanticParser::new()
    }

    fn root(action: &str, expr: ASTExpr) -> ASTExpr {
        ASTExpr::Root {
            action: action.to_string(),
            expression: Box::new(expr),
        }
    }

    fn leaf(s: &str) -> ASTExpr {
        ASTExpr::Leaf(s.to_string())
    }

    fn update(selection: ASTExpr, values: ASTExpr) -> ASTExpr {
        ASTExpr::Update {
            selection: Box::new(selection),
            values: Box::new(values),
        }
    }

    // === parse_action ===

    #[test]
    fn action_exact_match() {
        assert_eq!(parser().parse_action("search"), "search");
        assert_eq!(parser().parse_action("create"), "create");
        assert_eq!(parser().parse_action("delete"), "delete");
        assert_eq!(parser().parse_action("update"), "update");
    }

    #[test]
    fn action_strips_leading_slash() {
        assert_eq!(parser().parse_action("/search"), "search");
        assert_eq!(parser().parse_action("/create"), "create");
    }

    #[test]
    fn action_fuzzy_acronym() {
        assert_eq!(parser().parse_action("s"), "search");
        assert_eq!(parser().parse_action("c"), "create");
        assert_eq!(parser().parse_action("d"), "delete");
        assert_eq!(parser().parse_action("u"), "update");
    }

    #[test]
    fn action_fuzzy_partial() {
        assert_eq!(parser().parse_action("crea"), "create");
        assert_eq!(parser().parse_action("upd"), "update");
        assert_eq!(parser().parse_action("del"), "delete");
        assert_eq!(parser().parse_action("sea"), "search");
    }

    // === parse_qualifier ===

    #[test]
    fn qualifier_id_passes_through() {
        assert_eq!(parser().parse_qualifier("id:42".into()).unwrap(), "id:42");
    }

    #[test]
    fn qualifier_title_passes_through() {
        assert_eq!(
            parser()
                .parse_qualifier("title:attack_on_titan".into())
                .unwrap(),
            "title:attack_on_titan"
        );
    }

    #[test]
    fn qualifier_single_t_prefers_tag_over_title() {
        assert_eq!(
            parser().parse_qualifier("t:action".into()).unwrap(),
            "tag:action:major"
        );
    }

    #[test]
    fn qualifier_tg_prefers_tag_over_title() {
        assert_eq!(
            parser().parse_qualifier("tg:action".into()).unwrap(),
            "tag:action:major"
        );
    }

    #[test]
    fn qualifier_tag_appends_default_weight() {
        assert_eq!(
            parser().parse_qualifier("tag:action".into()).unwrap(),
            "tag:action:major"
        );
    }

    #[test]
    fn qualifier_tag_with_explicit_weight() {
        assert_eq!(
            parser().parse_qualifier("tag:action:minor".into()).unwrap(),
            "tag:action:minor"
        );
    }

    #[test]
    fn qualifier_tag_weight_fuzzy_matches() {
        assert_eq!(
            parser().parse_qualifier("tag:action:min".into()).unwrap(),
            "tag:action:minor"
        );
        assert_eq!(
            parser().parse_qualifier("tag:action:maj".into()).unwrap(),
            "tag:action:major"
        );
    }

    #[test]
    fn qualifier_status_exact() {
        assert_eq!(
            parser()
                .parse_qualifier("status:in_progress".into())
                .unwrap(),
            "status:in_progress"
        );
    }

    #[test]
    fn qualifier_status_fuzzy() {
        assert_eq!(
            parser().parse_qualifier("status:drop".into()).unwrap(),
            "status:dropped"
        );
        assert_eq!(
            parser().parse_qualifier("status:fin".into()).unwrap(),
            "status:finished"
        );
    }

    #[test]
    fn qualifier_media_type_acronym() {
        assert_eq!(
            parser().parse_qualifier("mt:movie".into()).unwrap(),
            "media_type:movie"
        );
    }

    #[test]
    fn qualifier_rating_with_inequality() {
        assert_eq!(
            parser()
                .parse_qualifier("public_rating:>=8".into())
                .unwrap(),
            "public_rating:>=8"
        );
        assert_eq!(
            parser()
                .parse_qualifier("personal_rating:<5".into())
                .unwrap(),
            "personal_rating:<5"
        );
    }

    #[test]
    fn qualifier_rating_plain_number() {
        assert_eq!(
            parser()
                .parse_qualifier("public_rating:7.5".into())
                .unwrap(),
            "public_rating:7.5"
        );
    }

    #[test]
    fn qualifier_date_with_inequality() {
        assert_eq!(
            parser()
                .parse_qualifier("created_at:>=15-01-2025".into())
                .unwrap(),
            "created_at:>=15-01-2025"
        );
    }

    #[test]
    fn qualifier_date_plain() {
        assert_eq!(
            parser()
                .parse_qualifier("created_at:01-06-2024".into())
                .unwrap(),
            "created_at:01-06-2024"
        );
    }

    #[test]
    fn qualifier_invalid_when_value_empty_for_nonempty_rule() {
        let err = parser().parse_qualifier("id:".into()).unwrap_err();
        assert!(matches!(err, ParseError::InvalidQualifierSemantics(_)));
    }

    #[test]
    fn qualifier_invalid_when_value_empty_for_fuzzy_list_rule() {
        let err = parser().parse_qualifier("status:".into()).unwrap_err();
        assert!(matches!(err, ParseError::InvalidQualifierSemantics(_)));
    }

    #[test]
    fn qualifier_invalid_when_rating_out_of_range() {
        let err = parser()
            .parse_qualifier("public_rating:11".into())
            .unwrap_err();
        assert!(matches!(err, ParseError::InvalidQualifierSemantics(_)));
    }

    #[test]
    fn qualifier_invalid_when_date_malformed() {
        let err = parser()
            .parse_qualifier("created_at:not-a-date".into())
            .unwrap_err();
        assert!(matches!(err, ParseError::InvalidQualifierSemantics(_)));
    }

    // === construct_title ===

    #[test]
    fn construct_title_extracts_bare_leaves_into_title_qualifier() {
        let expr = ASTExpr::And(vec![leaf("attack"), leaf("titan"), leaf("tag:action")]);
        let (title, rest) = parser().construct_title(expr);
        assert_eq!(title, Some("title:attack_titan".to_string()));
        assert_eq!(rest, ASTExpr::And(vec![leaf("tag:action")]));
    }

    #[test]
    fn construct_title_returns_none_when_only_qualifiers() {
        let expr = ASTExpr::And(vec![leaf("tag:action"), leaf("status:dropped")]);
        let (title, rest) = parser().construct_title(expr.clone());
        assert_eq!(title, None);
        assert_eq!(rest, expr);
    }

    #[test]
    fn construct_title_returns_none_when_no_bare_leaves() {
        let expr = ASTExpr::And(vec![leaf("tag:action")]);
        let (title, rest) = parser().construct_title(expr.clone());
        assert_eq!(title, None);
        assert_eq!(rest, expr);
    }

    #[test]
    fn construct_title_skips_non_and_expressions() {
        let or_expr = ASTExpr::Or(vec![leaf("a"), leaf("b")]);
        let (title, rest) = parser().construct_title(or_expr.clone());
        assert_eq!(title, None);
        assert_eq!(rest, or_expr);
    }

    #[test]
    fn construct_title_promotes_single_bare_leaf() {
        let expr = leaf("hello");
        let (title, rest) = parser().construct_title(expr);
        assert_eq!(title, Some("title:hello".to_string()));
        assert_eq!(rest, ASTExpr::And(vec![]));
    }

    #[test]
    fn construct_title_passes_through_single_qualifier_leaf() {
        let expr = leaf("tag:action");
        let (title, rest) = parser().construct_title(expr.clone());
        assert_eq!(title, None);
        assert_eq!(rest, expr);
    }

    // === parse (end-to-end) ===

    #[test]
    fn parse_rejects_non_root_input() {
        let err = parser().parse(leaf("hello")).unwrap_err();
        assert!(matches!(err, ParseError::UnsupportedExpression));
    }

    #[test]
    fn parse_resolves_action_and_qualifier() {
        let input = root("s", leaf("ta:adventure"));
        let result = parser().parse(input).unwrap();
        assert_eq!(result, root("search", leaf("tag:adventure:major")));
    }

    #[test]
    fn parse_preserves_constructed_title_qualifier() {
        let input = root(
            "search",
            ASTExpr::And(vec![leaf("attack"), leaf("on"), leaf("titan")]),
        );
        let result = parser().parse(input).unwrap();
        assert_eq!(
            result,
            root("search", ASTExpr::And(vec![leaf("title:attack_on_titan")]))
        );
    }

    #[test]
    fn parse_preserves_or_structure() {
        let input = root(
            "search",
            ASTExpr::Or(vec![leaf("status:in_progress"), leaf("status:on_hold")]),
        );
        let result = parser().parse(input).unwrap();
        assert_eq!(
            result,
            root(
                "search",
                ASTExpr::Or(vec![leaf("status:in_progress"), leaf("status:on_hold"),]),
            )
        );
    }

    #[test]
    fn parse_preserves_not_structure() {
        let input = root("search", ASTExpr::Not(Box::new(leaf("media_type:movie"))));
        let result = parser().parse(input).unwrap();
        assert_eq!(
            result,
            root("search", ASTExpr::Not(Box::new(leaf("media_type:movie"))),)
        );
    }

    #[test]
    fn parse_resolves_each_branch_of_and() {
        let input = root(
            "search",
            ASTExpr::And(vec![leaf("ta:action"), leaf("stat:fin"), leaf("mt:anime")]),
        );
        let result = parser().parse(input).unwrap();
        assert_eq!(
            result,
            root(
                "search",
                ASTExpr::And(vec![
                    leaf("tag:action:major"),
                    leaf("status:finished"),
                    leaf("media_type:anime"),
                ]),
            )
        );
    }

    #[test]
    fn parse_propagates_qualifier_error_through_logical_nodes() {
        let input = root(
            "search",
            ASTExpr::Or(vec![leaf("status:in_progress"), leaf("public_rating:99")]),
        );
        let err = parser().parse(input).unwrap_err();
        assert!(matches!(err, ParseError::InvalidQualifierSemantics(_)));
    }

    #[test]
    fn parse_update_preserves_split_and_parses_both_sides() {
        let input = root(
            "update",
            update(
                ASTExpr::And(vec![leaf("attack"), leaf("stat:fin")]),
                ASTExpr::And(vec![leaf("crea:01-06-2024"), leaf("ta:action")]),
            ),
        );
        let result = parser().parse(input).unwrap();
        assert_eq!(
            result,
            root(
                "update",
                update(
                    ASTExpr::And(vec![leaf("status:finished"), leaf("title:attack")]),
                    ASTExpr::And(vec![
                        leaf("created_at:01-06-2024"),
                        leaf("tag:action:major"),
                    ]),
                )
            )
        );
    }
}
