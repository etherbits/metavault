use crate::{
    semantic_parser::{ParseError, SemanticParser},
    sql_generator::{Extras, EzqSqlStep, SqlGenerateError, SqlGenerator},
    tokenizer::{ASTExpr, Tokenizer, TokenizerError},
};

use thiserror::Error;

pub struct Ezq {
    tokenizer: Tokenizer,
    parser: SemanticParser,
    sql_generator: SqlGenerator,
}

impl Ezq {
    pub fn new() -> Self {
        Ezq {
            tokenizer: Tokenizer::new(),
            parser: SemanticParser::new(),
            sql_generator: SqlGenerator::new(),
        }
    }

    pub fn generate_ast(&self, input_query: &str) -> Result<ASTExpr, EzqError> {
        let token_tree = self.tokenizer.tokenize(input_query)?;
        let parsed_query = self.parser.parse(token_tree)?;

        Ok(parsed_query)
    }

    pub fn generate_sql(
        &self,
        ast: ASTExpr,
        extras: Option<Extras>,
    ) -> Result<Vec<EzqSqlStep>, EzqError> {
        let generated_sql = self
            .sql_generator
            .generate(ast, extras.unwrap_or_default())?;

        Ok(generated_sql)
    }
}

#[derive(Debug, Error)]
pub enum EzqError {
    #[error(transparent)]
    Tokenizer(#[from] TokenizerError),
    #[error(transparent)]
    Parser(#[from] ParseError),
    #[error(transparent)]
    SqlGenerator(#[from] SqlGenerateError),
}

#[cfg(test)]
mod tests {
    use super::*;

    fn shared_media_type_expression() -> ASTExpr {
        ASTExpr::Or(vec![
            ASTExpr::And(vec![
                ASTExpr::Leaf("media_type:anime".to_string()),
                ASTExpr::Leaf("title:bleach".to_string()),
            ]),
            ASTExpr::And(vec![
                ASTExpr::Leaf("media_type:anime".to_string()),
                ASTExpr::Leaf("title:dragon_ball_z".to_string()),
            ]),
        ])
    }

    fn root_parts(ast: ASTExpr) -> (String, ASTExpr, Vec<String>) {
        let ASTExpr::Root {
            action,
            expression,
            commands,
        } = ast
        else {
            panic!("expected root expression");
        };

        (action, *expression, commands)
    }

    #[test]
    fn shared_qualifier_has_identical_target_syntax_for_all_actions() {
        let ezq = Ezq::new();
        let target = "(bleach | dragon ball z) type:anime";

        for (query, expected_action) in [
            (format!("/s {target}"), "search"),
            (format!("/d {target}"), "delete"),
            (format!("/c {target}"), "create"),
            (format!("/u {target} > status:finished"), "update"),
        ] {
            let (action, expression, _) = root_parts(ezq.generate_ast(&query).unwrap());
            assert_eq!(action, expected_action);

            let target_expression = match expression {
                ASTExpr::Update { selection, .. } => *selection,
                other => other,
            };
            assert_eq!(target_expression, shared_media_type_expression());
        }
    }

    #[test]
    fn mass_create_with_shared_media_type_generates_one_insert_per_title() {
        let ezq = Ezq::new();
        let ast = ezq
            .generate_ast("/c (bleach | dragon ball z) type:anime #e:o")
            .unwrap();
        let (_, _, commands) = root_parts(ast.clone());
        assert_eq!(commands, vec!["e:o"]);

        let steps = ezq.generate_sql(ast, None).unwrap();
        assert_eq!(steps.len(), 2);
        assert_eq!(steps[0].params, vec!["anime", "bleach"]);
        assert_eq!(steps[1].params, vec!["anime", "dragon ball z"]);
    }

    #[test]
    fn quoted_multiword_title_generates_the_expected_search_pattern() {
        let ezq = Ezq::new();
        let ast = ezq
            .generate_ast(r#"/search title:"Attack on Titan""#)
            .unwrap();
        let (action, expression, _) = root_parts(ast.clone());

        assert_eq!(action, "search");
        assert_eq!(expression, ASTExpr::Leaf("title:Attack_on_Titan".into()));

        let steps = ezq.generate_sql(ast, None).unwrap();
        assert_eq!(steps[0].params, vec!["%Attack%on%Titan%"]);
    }
}
