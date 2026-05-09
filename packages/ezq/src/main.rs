mod ezq;
mod fuzzy_matcher;
mod lang;
mod semantic_parser;
mod sql_generator;
mod tokenizer;

use ezq::Ezq;
use std::env::args;

use crate::sql_generator::Extras;

fn main() {
    let args: Vec<String> = args().collect();
    let input_query = &args[1];
    let ezq = Ezq::new();
    let ast = ezq.generate_ast(input_query).unwrap();
    let sql = ezq.generate_sql(
        ast,
        Some(Extras {
            user_id: Some("UserID".to_string()),
        }),
    );

    println!("{:?}", sql.unwrap());
}
