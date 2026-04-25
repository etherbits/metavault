use crate::{ezq::Ezq, semantic_parser::ParsedQuery, tokenizer::ASTExpr};
use wasm_bindgen::prelude::*;

mod ezq;
mod fuzzy_matcher;
mod lang;
mod semantic_parser;
mod tokenizer;

#[wasm_bindgen]
pub fn run_query(input: &str) -> Result<ASTExpr, String> {
    let ezq = Ezq::new();
    ezq.run(input).map_err(|e| e.to_string())
}
