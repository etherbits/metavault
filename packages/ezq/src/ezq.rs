use crate::{
    semantic_parser::{ParseError, SemanticParser},
    tokenizer::{ASTExpr, Tokenizer, TokenizerError},
};

use thiserror::Error;

pub struct Ezq {
    tokenizer: Tokenizer,
    parser: SemanticParser,
}

impl Ezq {
    pub fn new() -> Self {
        Ezq {
            tokenizer: Tokenizer::new(),
            parser: SemanticParser::new(),
        }
    }

    pub fn run(&self, input_query: &str) -> Result<ASTExpr, EzqError> {
        let token_tree = self.tokenizer.tokenize(input_query)?;
        let parsed_query = self.parser.parse(token_tree)?;

        Ok(parsed_query)
    }
}

#[derive(Debug, Error)]
pub enum EzqError {
    #[error(transparent)]
    Tokenizer(#[from] TokenizerError),
    #[error(transparent)]
    Parser(#[from] ParseError),
}
