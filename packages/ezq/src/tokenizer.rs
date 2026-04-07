use regex::Regex;
use thiserror::Error;

pub struct Tokenizer {}

impl Tokenizer {
    pub fn new() -> Self {
        Tokenizer {}
    }

    fn tokenize_to_sections(
        &self,
        trimmed_query: &str,
    ) -> Result<TokenizedSections, TokenizerError> {
        let Some(action_end_idx) = trimmed_query.find(" ") else {
            return Ok(TokenizedSections {
                action_section: trimmed_query.to_string(),
                target_section: String::new(),
                metadata_section: String::new(),
            });
        };

        let metadata_re = Regex::new(" [a-zA-Z]+:").unwrap();

        let first_metadata = metadata_re.find(trimmed_query);
        let target_end_idx = match first_metadata {
            Some(m) => m.start(),
            None => trimmed_query.len(),
        };

        let action_section = trimmed_query[..action_end_idx].trim().to_string();
        let target_section = if action_end_idx < target_end_idx {
            trimmed_query[(action_end_idx + 1)..target_end_idx]
                .trim()
                .to_string()
        } else {
            "".to_string()
        };
        let metadata_section = trimmed_query[target_end_idx..].trim().to_string();

        Ok(TokenizedSections {
            action_section,
            target_section,
            metadata_section,
        })
    }

    fn tokenize_target(&self, target: &String) -> Vec<String> {
        if target.trim().is_empty() {
            return vec![];
        }
        let target_re = Regex::new(r#""[^"]*""#).unwrap();
        let targets: Vec<String> = target_re
            .find_iter(&target)
            .map(|m| m.as_str().trim().replace("\"", "").to_string())
            .collect();

        if targets.is_empty() {
            vec![target.clone()]
        } else {
            targets
        }
    }

    fn tokenize_metadata(&self, metadata: &String) -> Vec<String> {
        let metadata_re = Regex::new(r#"[^ ^:]+(?::[^ ^:]+)+"#).unwrap();

        let tokenized_metadata = metadata_re
            .find_iter(&metadata)
            .map(|m| m.as_str().to_string())
            .collect();

        self.refine_tokenized_metadata(tokenized_metadata)
    }

    fn refine_tokenized_metadata(&self, tokenized_metadata: Vec<String>) -> Vec<String> {
        tokenized_metadata
            .into_iter()
            .flat_map(|m| {
                let Some((meta_key, meta_value)) = m.split_once(':') else {
                    return vec![m];
                };

                let metas = meta_value
                    .split(",")
                    .map(|s| s.trim().to_string())
                    .collect();
                let refined_metas = self.refine_tokenized_metadata(metas);
                refined_metas
                    .into_iter()
                    .map(|rm| (meta_key.to_owned() + ":" + &rm).to_string())
                    .collect()
            })
            .collect()
    }

    fn finalize_tokenization(
        &self,
        tokenized_sections: &TokenizedSections,
    ) -> Result<TokenizedQuery, TokenizerError> {
        Ok(TokenizedQuery {
            action_section: tokenized_sections.action_section.clone(),
            target_section: self.tokenize_target(&tokenized_sections.target_section),
            metadata_section: self.tokenize_metadata(&tokenized_sections.metadata_section),
        })
    }

    pub fn tokenize(&self, mut input_query: &str) -> Result<TokenizedQuery, TokenizerError> {
        input_query = input_query.trim();
        if input_query.is_empty() {
            return Err(TokenizerError::EmptyInput);
        }
        let tokenized_sections = self.tokenize_to_sections(input_query).unwrap();
        self.finalize_tokenization(&tokenized_sections)
    }
}

#[derive(Debug, Error)]
pub enum TokenizerError {
    #[error("the input query was empty")]
    EmptyInput,
}

struct TokenizedSections {
    action_section: String,
    target_section: String,
    metadata_section: String,
}

#[derive(Debug)]
pub struct TokenizedQuery {
    pub action_section: String,
    pub target_section: Vec<String>,
    pub metadata_section: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn multi_title_multi_meta() {
        let input_query =
            r#"s "AOT" "Attack On Titan" type:tv-series tg:action,monster release:>2020"#;
        let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

        assert_eq!(tokenized_query.action_section, "s");
        assert_eq!(
            tokenized_query.target_section,
            vec!["AOT".to_string(), "Attack On Titan".to_string()]
        );
        assert_eq!(
            tokenized_query.metadata_section,
            vec!["type:tv-series", "tg:action", "tg:monster", "release:>2020"]
        );
    }

    #[test]
    fn multi_title() {
        let input_query = r#"s "AOT" "Attack On Titan""#;
        let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

        assert_eq!(tokenized_query.action_section, "s");
        assert_eq!(
            tokenized_query.target_section,
            vec!["AOT".to_string(), "Attack On Titan".to_string()]
        );
        assert_eq!(tokenized_query.metadata_section.is_empty(), true);
    }

    #[test]
    fn single_title_single_tag() {
        let input_query = r#"s Attack On Titan tag:action"#;
        let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

        assert_eq!(tokenized_query.action_section, "s");
        assert_eq!(
            tokenized_query.target_section,
            vec!["Attack On Titan".to_string()]
        );
        assert_eq!(
            tokenized_query.metadata_section,
            vec!["tag:action".to_string()]
        );
    }

    #[test]
    fn action_metadata() {
        let input_query = r#"s tag:action"#;
        let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

        assert_eq!(tokenized_query.action_section, "s");
        assert_eq!(tokenized_query.target_section.is_empty(), true);
        assert_eq!(
            tokenized_query.metadata_section,
            vec!["tag:action".to_string()]
        );
    }

    #[test]
    fn single_title() {
        let input_query = r#"s Attack On Titan"#;
        let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

        assert_eq!(tokenized_query.action_section, "s");
        assert_eq!(
            tokenized_query.target_section,
            vec!["Attack On Titan".to_string()]
        );
        assert_eq!(tokenized_query.metadata_section.is_empty(), true);
    }

    #[test]
    fn empty_input() {
        let input_query = r#"  "#;
        let result = Tokenizer::new().tokenize(input_query);

        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "the input query was empty"
        );
    }

    #[test]
    fn only_action() {
        let input_query = r#"s"#;
        let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

        assert_eq!(tokenized_query.action_section, "s");
        assert_eq!(tokenized_query.target_section.is_empty(), true);
        assert_eq!(tokenized_query.metadata_section.is_empty(), true);
    }

    #[test]
    fn nested_meta() {
        let input_query = r#"s attack tag:action,adventure:minor,dark tag:fantasy"#;
        let tokenized_query = Tokenizer::new().tokenize(input_query).unwrap();

        assert_eq!(tokenized_query.action_section, "s");
        assert_eq!(tokenized_query.target_section, vec!["attack"]);
        assert_eq!(
            tokenized_query.metadata_section,
            vec![
                "tag:action",
                "tag:adventure:minor",
                "tag:dark",
                "tag:fantasy"
            ]
        );
    }
}
