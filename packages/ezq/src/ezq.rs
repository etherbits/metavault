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
