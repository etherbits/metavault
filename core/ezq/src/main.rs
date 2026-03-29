mod ezq;
mod fuzzy_matcher;
mod lang;
mod semantic_parser;
mod tokenizer;

use ezq::Ezq;
use std::env::args;

fn main() {
    let args: Vec<String> = args().collect();
    let input_query = &args[1];
    let ezq = Ezq::new();
    let ezq_output = ezq.run(input_query);

    println!("{:?}", ezq_output.unwrap());
}
