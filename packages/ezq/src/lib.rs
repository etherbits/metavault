use crate::{
    ezq::Ezq,
    fuzzy_matcher::FuzzyMatcher,
    sql_generator::{Extras, EzqSqlStep},
    tokenizer::ASTExpr,
};
use wasm_bindgen::prelude::*;

mod ezq;
mod fuzzy_matcher;
mod lang;
mod semantic_parser;
mod sql_generator;
mod tokenizer;

#[wasm_bindgen]
pub fn generate_ast(input: &str) -> Result<ASTExpr, String> {
    let ezq = Ezq::new();
    ezq.generate_ast(input).map_err(|e| e.to_string())
}

#[wasm_bindgen]
pub fn generate_sql(ast: ASTExpr, extras: Option<Extras>) -> Result<Vec<EzqSqlStep>, String> {
    let ezq = Ezq::new();

    ezq.generate_sql(ast, extras).map_err(|e| e.to_string())
}

#[wasm_bindgen]
pub fn fuzzy_match(input: &str, candidates: Vec<String>) -> Result<String, String> {
    let candidate_refs = candidates.iter().map(String::as_str).collect::<Vec<&str>>();

    FuzzyMatcher::new()
        .fuzzy_match_confident(input, candidate_refs.as_slice())
        .map_err(|e| e.to_string())
}
