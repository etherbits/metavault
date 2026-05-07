use chrono::NaiveDate;
use thiserror::Error;

use crate::tokenizer::ASTExpr;

pub const ENTRY_ID_TOKEN: &str = "ENTRY_ID";

pub struct SqlGenerator {}

impl SqlGenerator {
    pub fn new() -> Self {
        SqlGenerator {}
    }

    pub fn generate(
        &self,
        ast: ASTExpr,
        extras: Extras,
    ) -> Result<Vec<EzqSqlStep>, SqlGenerateError> {
        let ASTExpr::Root { action, expression } = ast else {
            return Err(SqlGenerateError::UnsupportedExpression);
        };

        match action.as_str() {
            "search" => self.build_select(*expression, &extras),
            "delete" => self.build_delete(*expression, &extras),
            "create" => self.build_create(*expression, &extras),
            "update" => self.build_update(*expression, &extras),
            other => Err(SqlGenerateError::UnknownAction(other.to_string())),
        }
    }

    fn build_select(
        &self,
        expr: ASTExpr,
        extras: &Extras,
    ) -> Result<Vec<EzqSqlStep>, SqlGenerateError> {
        let (filter_expr, sort) = self.extract_sort(expr)?;
        let mut params = vec![];
        let where_clause = self.build_where_with_extras(filter_expr, &mut params, extras)?;
        let select_cols = "library_entries.*, COALESCE((SELECT json_group_array(json_object('id', tags.id, 'value', tags.value, 'weight', tags.weight)) FROM library_entry_tags JOIN tags ON tags.id = library_entry_tags.tag_id WHERE library_entry_tags.library_entry_id = library_entries.id), '[]') AS tags";
        let where_part = if where_clause.is_empty() {
            String::new()
        } else {
            format!(" WHERE {}", where_clause)
        };
        let order_part = match sort {
            Some(Sort { column, direction }) => {
                format!(" ORDER BY library_entries.{} {}", column, direction)
            }
            None => String::new(),
        };
        Ok(vec![EzqSqlStep {
            sql: format!(
                "SELECT {} FROM library_entries{}{}",
                select_cols, where_part, order_part
            ),
            params,
            outputs: vec![],
        }])
    }

    fn build_delete(
        &self,
        expr: ASTExpr,
        extras: &Extras,
    ) -> Result<Vec<EzqSqlStep>, SqlGenerateError> {
        if self.is_empty_expr(&expr) {
            return Err(SqlGenerateError::MissingMatchCriteria);
        }
        self.assert_no_sort(&expr)?;
        let mut params = vec![];
        let where_clause = self.build_where_with_extras(expr, &mut params, extras)?;
        Ok(vec![EzqSqlStep {
            sql: format!("DELETE FROM library_entries WHERE {}", where_clause),
            params,
            outputs: vec![],
        }])
    }

    fn build_create(
        &self,
        expr: ASTExpr,
        extras: &Extras,
    ) -> Result<Vec<EzqSqlStep>, SqlGenerateError> {
        self.assert_no_sort(&expr)?;
        let leaves = self
            .extract_write_leaves(expr)
            .ok_or(SqlGenerateError::UnsupportedCreateShape)?;
        let WriteParts {
            mut scalar_cols,
            tag_values,
        } = self.collect_write_parts(leaves)?;
        if let Some(user_id) = &extras.user_id {
            scalar_cols.insert(0, ("user_id".to_string(), user_id.clone()));
        }

        let mut statements = vec![];

        let cols = scalar_cols
            .iter()
            .map(|(c, _)| c.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        let placeholders = vec!["?"; scalar_cols.len()].join(", ");
        let entry_params: Vec<String> = scalar_cols.into_iter().map(|(_, v)| v).collect();
        statements.push(EzqSqlStep {
            sql: format!(
                "INSERT INTO library_entries ({}) VALUES ({}) RETURNING id",
                cols, placeholders
            ),
            params: entry_params,
            outputs: vec![ENTRY_ID_TOKEN.to_string()],
        });

        for tag in tag_values {
            if let Some(user_id) = &extras.user_id {
                statements.push(EzqSqlStep {
                    sql: "INSERT INTO tags (user_id, value, weight) VALUES (?, ?, ?) ON CONFLICT(value, weight, user_id) DO NOTHING"
                        .to_string(),
                    params: vec![user_id.clone(), tag.value.clone(), tag.weight.clone()],
                    outputs: vec![],
                });
                statements.push(EzqSqlStep {
                    sql: "INSERT INTO library_entry_tags (library_entry_id, tag_id) SELECT ?, tags.id FROM tags WHERE tags.user_id = ? AND tags.value = ? AND tags.weight = ?"
                        .to_string(),
                    params: vec![
                        ENTRY_ID_TOKEN.to_string(),
                        user_id.clone(),
                        tag.value,
                        tag.weight,
                    ],
                    outputs: vec![],
                });
            } else {
                statements.push(EzqSqlStep {
                    sql: "INSERT INTO tags (value, weight) VALUES (?, ?) ON CONFLICT(value, weight) DO NOTHING"
                        .to_string(),
                    params: vec![tag.value.clone(), tag.weight.clone()],
                    outputs: vec![],
                });
                statements.push(EzqSqlStep {
                    sql: "INSERT INTO library_entry_tags (library_entry_id, tag_id) SELECT ?, tags.id FROM tags WHERE tags.value = ? AND tags.weight = ?"
                        .to_string(),
                    params: vec![
                        ENTRY_ID_TOKEN.to_string(),
                        tag.value,
                        tag.weight,
                    ],
                    outputs: vec![],
                });
            }
        }

        Ok(statements)
    }

    fn build_update(
        &self,
        expr: ASTExpr,
        extras: &Extras,
    ) -> Result<Vec<EzqSqlStep>, SqlGenerateError> {
        let ASTExpr::Update { selection, values } = expr else {
            return Err(SqlGenerateError::UnsupportedUpdateShape);
        };

        if self.is_empty_expr(selection.as_ref()) {
            return Err(SqlGenerateError::MissingMatchCriteria);
        }
        self.assert_no_sort(&selection)?;
        self.assert_no_sort(&values)?;

        let mut match_params = vec![];
        let where_clause = self.build_where_with_extras(*selection, &mut match_params, extras)?;
        if where_clause.is_empty() {
            return Err(SqlGenerateError::MissingMatchCriteria);
        }

        let leaves = self
            .extract_write_leaves(*values)
            .ok_or(SqlGenerateError::UnsupportedUpdateWriteShape)?;
        let WriteParts {
            scalar_cols: set_pairs,
            tag_values,
        } = self.collect_write_parts(leaves)?;
        let mut statements = vec![];

        if !set_pairs.is_empty() {
            let mut set_clause_parts: Vec<String> = set_pairs
                .iter()
                .map(|(c, _)| format!("{} = ?", c))
                .collect();
            set_clause_parts.push("updated_at = CURRENT_TIMESTAMP".to_string());
            let set_clause = set_clause_parts.join(", ");
            let mut params: Vec<String> = set_pairs.into_iter().map(|(_, v)| v).collect();
            params.extend(match_params.iter().cloned());
            statements.push(EzqSqlStep {
                sql: format!(
                    "UPDATE library_entries SET {} WHERE {}",
                    set_clause, where_clause
                ),
                params,
                outputs: vec![],
            });
        }

        for tag in tag_values {
            if let Some(user_id) = &extras.user_id {
                statements.push(EzqSqlStep {
                    sql: "INSERT INTO tags (user_id, value, weight) VALUES (?, ?, ?) ON CONFLICT(value, weight, user_id) DO NOTHING"
                        .to_string(),
                    params: vec![user_id.clone(), tag.value.clone(), tag.weight.clone()],
                    outputs: vec![],
                });
                let mut params = vec![user_id.clone(), tag.value.clone(), tag.weight.clone()];
                params.extend(match_params.iter().cloned());
                statements.push(EzqSqlStep {
                    sql: format!(
                        "INSERT INTO library_entry_tags (library_entry_id, tag_id) \
                         SELECT library_entries.id, tags.id FROM library_entries \
                         JOIN tags ON tags.user_id = ? AND tags.value = ? AND tags.weight = ? \
                         WHERE {} AND NOT EXISTS (\
                             SELECT 1 FROM library_entry_tags \
                             WHERE library_entry_tags.library_entry_id = library_entries.id \
                               AND library_entry_tags.tag_id = tags.id\
                         )",
                        where_clause
                    ),
                    params,
                    outputs: vec![],
                });
            } else {
                statements.push(EzqSqlStep {
                    sql: "INSERT INTO tags (value, weight) VALUES (?, ?) ON CONFLICT(value, weight) DO NOTHING"
                        .to_string(),
                    params: vec![tag.value.clone(), tag.weight.clone()],
                    outputs: vec![],
                });
                let mut params = vec![tag.value.clone(), tag.weight.clone()];
                params.extend(match_params.iter().cloned());
                statements.push(EzqSqlStep {
                    sql: format!(
                        "INSERT INTO library_entry_tags (library_entry_id, tag_id) \
                         SELECT library_entries.id, tags.id FROM library_entries \
                         JOIN tags ON tags.value = ? AND tags.weight = ? \
                         WHERE {} AND NOT EXISTS (\
                             SELECT 1 FROM library_entry_tags \
                             WHERE library_entry_tags.library_entry_id = library_entries.id \
                               AND library_entry_tags.tag_id = tags.id\
                         )",
                        where_clause
                    ),
                    params,
                    outputs: vec![],
                });
            }
        }

        Ok(statements)
    }

    fn build_where_with_extras(
        &self,
        expr: ASTExpr,
        params: &mut Vec<String>,
        extras: &Extras,
    ) -> Result<String, SqlGenerateError> {
        let inner = if self.is_empty_expr(&expr) {
            String::new()
        } else {
            self.build_where(expr, params)?
        };

        Ok(match (inner.is_empty(), &extras.user_id) {
            (true, None) => String::new(),
            (true, Some(user_id)) => {
                params.push(user_id.to_string());
                "library_entries.user_id = ?".to_string()
            }
            (false, None) => inner,
            (false, Some(user_id)) => {
                params.push(user_id.to_string());
                format!("({}) AND library_entries.user_id = ?", inner)
            }
        })
    }
    fn build_where(
        &self,
        expr: ASTExpr,
        params: &mut Vec<String>,
    ) -> Result<String, SqlGenerateError> {
        match expr {
            ASTExpr::Leaf(s) => self.build_leaf_filter(&s, params),
            ASTExpr::And(items) => {
                let parts = items
                    .into_iter()
                    .map(|i| self.build_where(i, params))
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(format!("({})", parts.join(" AND ")))
            }
            ASTExpr::Or(items) => {
                let parts = items
                    .into_iter()
                    .map(|i| self.build_where(i, params))
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(format!("({})", parts.join(" OR ")))
            }
            ASTExpr::Not(inner) => {
                let inner_sql = self.build_where(*inner, params)?;
                Ok(format!("NOT ({})", inner_sql))
            }
            ASTExpr::Update { .. } => Err(SqlGenerateError::UnsupportedExpression),
            ASTExpr::Root { .. } => Err(SqlGenerateError::UnsupportedExpression),
        }
    }

    fn collect_write_parts(&self, leaves: Vec<String>) -> Result<WriteParts, SqlGenerateError> {
        let mut scalar_cols = vec![];
        let mut tag_values = vec![];
        let mut title_value: Option<String> = None;

        for leaf in &leaves {
            let (prefix, segments) = self.split_leaf(leaf)?;
            match prefix {
                "id" => return Err(SqlGenerateError::IdNotAllowedInWriteContext),
                "status" | "media_type" => {
                    let value = first_segment(&segments, leaf)?;
                    scalar_cols.push((prefix.to_string(), value.to_string()));
                }
                "public_rating" | "personal_rating" => {
                    let value = first_segment(&segments, leaf)?;
                    let (op, num) = split_op_value(value);
                    if op != "=" {
                        return Err(SqlGenerateError::InequalityInWriteContext(leaf.clone()));
                    }
                    scalar_cols.push((prefix.to_string(), num));
                }
                "created_at" => {
                    let value = first_segment(&segments, leaf)?;
                    let (op, date) = split_op_value(value);
                    if op != "=" {
                        return Err(SqlGenerateError::InequalityInWriteContext(leaf.clone()));
                    }
                    scalar_cols.push((prefix.to_string(), reformat_date(&date)?));
                }
                "tag" => {
                    tag_values.push(TagWrite {
                        value: first_segment(&segments, leaf)?.to_string(),
                        weight: nth_segment(&segments, 1, leaf)?.to_string(),
                    });
                }
                "title" => {
                    if title_value.is_some() {
                        return Err(SqlGenerateError::MultipleTitlesNotAllowed);
                    }
                    title_value = Some(first_segment(&segments, leaf)?.replace('_', " "));
                }
                other => return Err(SqlGenerateError::UnknownQualifier(other.to_string())),
            }
        }

        if let Some(title) = title_value {
            scalar_cols.push(("title".to_string(), title));
        }

        Ok(WriteParts {
            scalar_cols,
            tag_values,
        })
    }

    fn build_leaf_filter(
        &self,
        leaf: &str,
        params: &mut Vec<String>,
    ) -> Result<String, SqlGenerateError> {
        let (prefix, segments) = self.split_leaf(leaf)?;
        match prefix {
            "id" => {
                params.push(first_segment(&segments, leaf)?.to_string());
                Ok("library_entries.id = ?".to_string())
            }
            "status" => {
                params.push(first_segment(&segments, leaf)?.to_string());
                Ok("library_entries.status = ?".to_string())
            }
            "media_type" => {
                params.push(first_segment(&segments, leaf)?.to_string());
                Ok("library_entries.media_type = ?".to_string())
            }
            "public_rating" | "personal_rating" => {
                let value = first_segment(&segments, leaf)?;
                let (op, num) = split_op_value(value);
                params.push(num);
                Ok(format!("library_entries.{} {} ?", prefix, op))
            }
            "created_at" => {
                let value = first_segment(&segments, leaf)?;
                let (op, date) = split_op_value(value);
                params.push(reformat_date(&date)?);
                Ok(format!("date(library_entries.{}) {} date(?)", prefix, op))
            }
            "tag" => {
                params.push(first_segment(&segments, leaf)?.to_string());
                params.push(nth_segment(&segments, 1, leaf)?.to_string());
                Ok(
                    "library_entries.id IN (SELECT library_entry_tags.library_entry_id FROM library_entry_tags JOIN tags ON tags.id = library_entry_tags.tag_id WHERE tags.value = ? AND tags.weight = ?)"
                        .to_string(),
                )
            }
            "title" => {
                let value = first_segment(&segments, leaf)?;
                params.push(format!("%{}%", value.replace('_', " ")));
                Ok("library_entries.title LIKE ?".to_string())
            }
            other => Err(SqlGenerateError::UnknownQualifier(other.to_string())),
        }
    }

    fn split_leaf<'a>(&self, leaf: &'a str) -> Result<(&'a str, Vec<&'a str>), SqlGenerateError> {
        let mut parts = leaf.split(':');
        let prefix = parts
            .next()
            .ok_or_else(|| SqlGenerateError::MalformedQualifier(leaf.to_string()))?;
        let segments: Vec<&str> = parts.collect();
        if segments.is_empty() {
            return Err(SqlGenerateError::MalformedQualifier(leaf.to_string()));
        }
        Ok((prefix, segments))
    }

    fn extract_write_leaves(&self, expr: ASTExpr) -> Option<Vec<String>> {
        match expr {
            ASTExpr::Leaf(s) => Some(vec![s]),
            ASTExpr::And(items) => {
                let mut out = Vec::with_capacity(items.len());
                for item in items {
                    match item {
                        ASTExpr::Leaf(s) => out.push(s),
                        _ => return None,
                    }
                }
                Some(out)
            }
            _ => None,
        }
    }

    fn is_empty_expr(&self, expr: &ASTExpr) -> bool {
        match expr {
            ASTExpr::Leaf(s) => s.trim().is_empty(),
            ASTExpr::And(items) | ASTExpr::Or(items) => items.is_empty(),
            ASTExpr::Not(inner) => self.is_empty_expr(inner),
            ASTExpr::Update { .. } | ASTExpr::Root { .. } => false,
        }
    }

    fn extract_sort(
        &self,
        expr: ASTExpr,
    ) -> Result<(ASTExpr, Option<Sort>), SqlGenerateError> {
        match expr {
            ASTExpr::Leaf(s) if is_sort_leaf(&s) => {
                Ok((ASTExpr::Leaf(String::new()), Some(parse_sort_leaf(&s)?)))
            }
            ASTExpr::And(items) => {
                let mut sort: Option<Sort> = None;
                let mut filtered = Vec::with_capacity(items.len());
                for item in items {
                    if let ASTExpr::Leaf(ref s) = item {
                        if is_sort_leaf(s) {
                            if sort.is_some() {
                                return Err(SqlGenerateError::MultipleSortsNotAllowed);
                            }
                            sort = Some(parse_sort_leaf(s)?);
                            continue;
                        }
                    }
                    self.assert_no_sort(&item)?;
                    filtered.push(item);
                }
                Ok((ASTExpr::And(filtered), sort))
            }
            other => {
                self.assert_no_sort(&other)?;
                Ok((other, None))
            }
        }
    }

    fn assert_no_sort(&self, expr: &ASTExpr) -> Result<(), SqlGenerateError> {
        match expr {
            ASTExpr::Leaf(s) if is_sort_leaf(s) => {
                Err(SqlGenerateError::SortInInvalidPosition)
            }
            ASTExpr::Leaf(_) => Ok(()),
            ASTExpr::And(items) | ASTExpr::Or(items) => {
                items.iter().try_for_each(|i| self.assert_no_sort(i))
            }
            ASTExpr::Not(inner) => self.assert_no_sort(inner),
            ASTExpr::Update { selection, values } => {
                self.assert_no_sort(selection)?;
                self.assert_no_sort(values)
            }
            ASTExpr::Root { .. } => Ok(()),
        }
    }
}

struct WriteParts {
    scalar_cols: Vec<(String, String)>,
    tag_values: Vec<TagWrite>,
}

struct TagWrite {
    value: String,
    weight: String,
}

struct Sort {
    column: String,
    direction: &'static str,
}

const SORTABLE_COLUMNS: &[&str] = &[
    "id",
    "title",
    "status",
    "media_type",
    "public_rating",
    "personal_rating",
    "created_at",
];

fn is_sort_leaf(leaf: &str) -> bool {
    leaf == "sort" || leaf.starts_with("sort:")
}

fn parse_sort_leaf(leaf: &str) -> Result<Sort, SqlGenerateError> {
    let mut parts = leaf.split(':');
    let prefix = parts.next().unwrap_or("");
    if prefix != "sort" {
        return Err(SqlGenerateError::MalformedQualifier(leaf.to_string()));
    }
    let column = parts
        .next()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| SqlGenerateError::MalformedQualifier(leaf.to_string()))?;
    if !SORTABLE_COLUMNS.contains(&column) {
        return Err(SqlGenerateError::InvalidSortColumn(column.to_string()));
    }
    let direction = match parts.next() {
        Some("ascending") => "ASC",
        Some("descending") | None => "DESC",
        Some(other) => {
            return Err(SqlGenerateError::InvalidSortDirection(other.to_string()));
        }
    };
    Ok(Sort {
        column: column.to_string(),
        direction,
    })
}

fn first_segment<'a>(segments: &'a [&'a str], leaf: &str) -> Result<&'a str, SqlGenerateError> {
    nth_segment(segments, 0, leaf)
}

fn nth_segment<'a>(
    segments: &'a [&'a str],
    idx: usize,
    leaf: &str,
) -> Result<&'a str, SqlGenerateError> {
    segments
        .get(idx)
        .copied()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| SqlGenerateError::MalformedQualifier(leaf.to_string()))
}

fn split_op_value(value: &str) -> (String, String) {
    let split_idx = value.find(|c: char| c.is_ascii_digit()).unwrap_or(0);
    let (op_str, num) = value.split_at(split_idx);
    let op = if op_str.is_empty() { "=" } else { op_str };
    (op.to_string(), num.to_string())
}

fn reformat_date(date_str: &str) -> Result<String, SqlGenerateError> {
    NaiveDate::parse_from_str(date_str, "%d-%m-%Y")
        .map(|d| d.format("%Y-%m-%d").to_string())
        .map_err(|_| SqlGenerateError::MalformedQualifier(format!("invalid date: {}", date_str)))
}

#[derive(Debug, Default, Clone, serde::Deserialize, tsify_next::Tsify)]
#[tsify(from_wasm_abi)]
pub struct Extras {
    pub user_id: Option<String>,
}

#[derive(Debug, serde::Serialize, tsify_next::Tsify)]
#[tsify(into_wasm_abi)]
pub struct EzqSqlStep {
    pub sql: String,
    pub params: Vec<String>,
    pub outputs: Vec<String>,
}

#[derive(Debug, Error)]
pub enum SqlGenerateError {
    #[error("Did not pass Root ASTExpr into generate")]
    UnsupportedExpression,
    #[error("Unknown action `{0}`")]
    UnknownAction(String),
    #[error("Unknown qualifier prefix `{0}`")]
    UnknownQualifier(String),
    #[error("Malformed qualifier leaf: {0}")]
    MalformedQualifier(String),
    #[error("`create` expression must be a flat AND of qualifier leaves")]
    UnsupportedCreateShape,
    #[error("`update` expression must use `<match query> > <write query>`")]
    UnsupportedUpdateShape,
    #[error("`update` write expression must be a flat AND of qualifier leaves")]
    UnsupportedUpdateWriteShape,
    #[error("`update` requires a non-empty match query")]
    MissingMatchCriteria,
    #[error("Inequality operator not allowed in write-context value: {0}")]
    InequalityInWriteContext(String),
    #[error("write expressions do not allow setting `id`")]
    IdNotAllowedInWriteContext,
    #[error("`create` allows at most one `title` qualifier")]
    MultipleTitlesNotAllowed,
    #[error("only one `sort` qualifier is allowed per query")]
    MultipleSortsNotAllowed,
    #[error("`sort` qualifier is only allowed at the top level of a search query")]
    SortInInvalidPosition,
    #[error("invalid sort column `{0}`")]
    InvalidSortColumn(String),
    #[error("invalid sort direction `{0}`")]
    InvalidSortDirection(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generator() -> SqlGenerator {
        SqlGenerator::new()
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

    #[test]
    fn generate_rejects_non_root_input() {
        let err = generator()
            .generate(leaf("status:finished"), Extras::default())
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::UnsupportedExpression));
    }

    #[test]
    fn search_builds_nested_where_clause_and_params() {
        let ast = root(
            "search",
            and(vec![
                leaf("status:finished"),
                or(vec![
                    leaf("tag:action:major"),
                    not(leaf("media_type:movie")),
                ]),
                leaf("title:attack_on_titan"),
                leaf("created_at:>=01-06-2024"),
            ]),
        );

        let sql = generator().generate(ast, Extras::default()).unwrap();
        assert_eq!(sql.len(), 1);
        assert_eq!(
            sql[0].sql,
            "SELECT library_entries.*, COALESCE((SELECT json_group_array(json_object('id', tags.id, 'value', tags.value, 'weight', tags.weight)) FROM library_entry_tags JOIN tags ON tags.id = library_entry_tags.tag_id WHERE library_entry_tags.library_entry_id = library_entries.id), '[]') AS tags FROM library_entries WHERE (library_entries.status = ? AND (library_entries.id IN (SELECT library_entry_tags.library_entry_id FROM library_entry_tags JOIN tags ON tags.id = library_entry_tags.tag_id WHERE tags.value = ? AND tags.weight = ?) OR NOT (library_entries.media_type = ?)) AND library_entries.title LIKE ? AND date(library_entries.created_at) >= date(?))"
        );
        assert_eq!(
            sql[0].params,
            vec![
                "finished".to_string(),
                "action".to_string(),
                "major".to_string(),
                "movie".to_string(),
                "%attack on titan%".to_string(),
                "2024-06-01".to_string(),
            ]
        );
    }

    #[test]
    fn search_with_empty_expression_selects_all_without_extras() {
        let ast = root("search", leaf(""));
        let sql = generator().generate(ast, Extras::default()).unwrap();
        assert_eq!(sql.len(), 1);
        assert_eq!(
            sql[0].sql,
            "SELECT library_entries.*, COALESCE((SELECT json_group_array(json_object('id', tags.id, 'value', tags.value, 'weight', tags.weight)) FROM library_entry_tags JOIN tags ON tags.id = library_entry_tags.tag_id WHERE library_entry_tags.library_entry_id = library_entries.id), '[]') AS tags FROM library_entries"
        );
        assert_eq!(sql[0].params, Vec::<String>::new());
    }

    #[test]
    fn search_with_empty_expression_scopes_by_user_when_provided() {
        let ast = root("search", leaf(""));
        let sql = generator()
            .generate(
                ast,
                Extras {
                    user_id: Some("user-1".to_string()),
                },
            )
            .unwrap();
        assert_eq!(sql.len(), 1);
        assert_eq!(
            sql[0].sql,
            "SELECT library_entries.*, COALESCE((SELECT json_group_array(json_object('id', tags.id, 'value', tags.value, 'weight', tags.weight)) FROM library_entry_tags JOIN tags ON tags.id = library_entry_tags.tag_id WHERE library_entry_tags.library_entry_id = library_entries.id), '[]') AS tags FROM library_entries WHERE library_entries.user_id = ?"
        );
        assert_eq!(sql[0].params, vec!["user-1".to_string()]);
    }

    #[test]
    fn search_with_only_sort_appends_order_by_descending_default() {
        let ast = root("search", leaf("sort:personal_rating"));
        let sql = generator().generate(ast, Extras::default()).unwrap();
        assert_eq!(sql.len(), 1);
        assert!(sql[0]
            .sql
            .ends_with(" FROM library_entries ORDER BY library_entries.personal_rating DESC"));
        assert_eq!(sql[0].params, Vec::<String>::new());
    }

    #[test]
    fn search_with_sort_and_filters_keeps_filters_and_appends_order() {
        let ast = root(
            "search",
            and(vec![
                leaf("status:finished"),
                leaf("sort:title:ascending"),
            ]),
        );
        let sql = generator().generate(ast, Extras::default()).unwrap();
        assert_eq!(sql.len(), 1);
        assert!(sql[0].sql.contains("WHERE (library_entries.status = ?)"));
        assert!(sql[0]
            .sql
            .ends_with(" ORDER BY library_entries.title ASC"));
        assert_eq!(sql[0].params, vec!["finished".to_string()]);
    }

    #[test]
    fn search_sort_with_user_scope_keeps_user_id_in_where() {
        let ast = root("search", leaf("sort:created_at:descending"));
        let sql = generator()
            .generate(
                ast,
                Extras {
                    user_id: Some("user-1".to_string()),
                },
            )
            .unwrap();
        assert!(sql[0]
            .sql
            .contains("WHERE library_entries.user_id = ?"));
        assert!(sql[0]
            .sql
            .ends_with(" ORDER BY library_entries.created_at DESC"));
        assert_eq!(sql[0].params, vec!["user-1".to_string()]);
    }

    #[test]
    fn search_rejects_multiple_sort_qualifiers() {
        let ast = root(
            "search",
            and(vec![leaf("sort:title:ascending"), leaf("sort:status:descending")]),
        );
        let err = generator().generate(ast, Extras::default()).unwrap_err();
        assert!(matches!(err, SqlGenerateError::MultipleSortsNotAllowed));
    }

    #[test]
    fn search_rejects_sort_inside_or_or_not() {
        let or_err = generator()
            .generate(
                root(
                    "search",
                    or(vec![leaf("status:finished"), leaf("sort:title:ascending")]),
                ),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(or_err, SqlGenerateError::SortInInvalidPosition));

        let not_err = generator()
            .generate(
                root("search", not(leaf("sort:title:ascending"))),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(not_err, SqlGenerateError::SortInInvalidPosition));
    }

    #[test]
    fn delete_rejects_sort_qualifier() {
        let err = generator()
            .generate(
                root(
                    "delete",
                    and(vec![leaf("status:finished"), leaf("sort:title:ascending")]),
                ),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::SortInInvalidPosition));
    }

    #[test]
    fn create_rejects_sort_qualifier() {
        let err = generator()
            .generate(
                root(
                    "create",
                    and(vec![leaf("status:finished"), leaf("sort:title:ascending")]),
                ),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::SortInInvalidPosition));
    }

    #[test]
    fn update_rejects_sort_qualifier_in_either_side() {
        let in_selection = generator()
            .generate(
                root(
                    "update",
                    update(
                        and(vec![leaf("id:42"), leaf("sort:title:ascending")]),
                        leaf("status:finished"),
                    ),
                ),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(
            in_selection,
            SqlGenerateError::SortInInvalidPosition
        ));

        let in_values = generator()
            .generate(
                root(
                    "update",
                    update(
                        leaf("id:42"),
                        and(vec![leaf("status:finished"), leaf("sort:title:ascending")]),
                    ),
                ),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(in_values, SqlGenerateError::SortInInvalidPosition));
    }

    #[test]
    fn delete_builds_single_statement() {
        let ast = root("delete", leaf("id:42"));
        let sql = generator().generate(ast, Extras::default()).unwrap();
        assert_eq!(sql.len(), 1);
        assert_eq!(
            sql[0].sql,
            "DELETE FROM library_entries WHERE library_entries.id = ?"
        );
        assert_eq!(sql[0].params, vec!["42".to_string()]);
    }

    #[test]
    fn delete_rejects_empty_expression() {
        let err = generator()
            .generate(root("delete", leaf("")), Extras::default())
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::MissingMatchCriteria));
    }

    #[test]
    fn create_rejects_non_flat_expression() {
        let err = generator()
            .generate(
                root(
                    "create",
                    or(vec![leaf("status:finished"), leaf("tag:action:major")]),
                ),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::UnsupportedCreateShape));
    }

    #[test]
    fn create_generates_entry_and_tag_statements() {
        let sql = generator()
            .generate(
                root(
                    "create",
                    and(vec![
                        leaf("title:attack_on_titan"),
                        leaf("status:finished"),
                        leaf("public_rating:8.5"),
                        leaf("created_at:01-06-2024"),
                        leaf("tag:action:major"),
                        leaf("tag:drama:minor"),
                    ]),
                ),
                Extras::default(),
            )
            .unwrap();

        assert_eq!(sql.len(), 5);
        assert_eq!(
            sql[0].sql,
            "INSERT INTO library_entries (status, public_rating, created_at, title) VALUES (?, ?, ?, ?) RETURNING id"
        );
        assert_eq!(
            sql[0].params,
            vec![
                "finished".to_string(),
                "8.5".to_string(),
                "2024-06-01".to_string(),
                "attack on titan".to_string(),
            ]
        );
        assert_eq!(sql[0].outputs, vec![ENTRY_ID_TOKEN.to_string()]);
        assert_eq!(
            sql[1].sql,
            "INSERT INTO tags (value, weight) VALUES (?, ?) ON CONFLICT(value, weight) DO NOTHING"
        );
        assert_eq!(
            sql[1].params,
            vec!["action".to_string(), "major".to_string()]
        );
        assert_eq!(sql[1].outputs, Vec::<String>::new());
        assert_eq!(
            sql[2].sql,
            "INSERT INTO library_entry_tags (library_entry_id, tag_id) SELECT ?, tags.id FROM tags WHERE tags.value = ? AND tags.weight = ?"
        );
        assert_eq!(
            sql[2].params,
            vec![
                ENTRY_ID_TOKEN.to_string(),
                "action".to_string(),
                "major".to_string(),
            ]
        );
        assert_eq!(sql[2].outputs, Vec::<String>::new());
        assert_eq!(
            sql[3].params,
            vec!["drama".to_string(), "minor".to_string()]
        );
        assert_eq!(
            sql[4].params,
            vec![
                ENTRY_ID_TOKEN.to_string(),
                "drama".to_string(),
                "minor".to_string(),
            ]
        );
        assert_eq!(sql[4].outputs, Vec::<String>::new());
    }

    #[test]
    fn create_uses_optional_user_id_when_provided() {
        let sql = generator()
            .generate(
                root(
                    "create",
                    and(vec![leaf("status:finished"), leaf("tag:action:major")]),
                ),
                Extras {
                    user_id: Some("user-1".to_string()),
                },
            )
            .unwrap();

        assert_eq!(
            sql[0].sql,
            "INSERT INTO library_entries (user_id, status) VALUES (?, ?) RETURNING id"
        );
        assert_eq!(sql[0].outputs, vec![ENTRY_ID_TOKEN.to_string()]);
        assert_eq!(
            sql[0].params,
            vec!["user-1".to_string(), "finished".to_string()]
        );
        assert_eq!(
            sql[1].sql,
            "INSERT INTO tags (user_id, value, weight) VALUES (?, ?, ?) ON CONFLICT(value, weight, user_id) DO NOTHING"
        );
        assert_eq!(
            sql[2].sql,
            "INSERT INTO library_entry_tags (library_entry_id, tag_id) SELECT ?, tags.id FROM tags WHERE tags.user_id = ? AND tags.value = ? AND tags.weight = ?"
        );
        assert_eq!(sql[2].outputs, Vec::<String>::new());
    }

    #[test]
    fn create_rejects_id_and_inequality() {
        let id_err = generator()
            .generate(root("create", leaf("id:42")), Extras::default())
            .unwrap_err();
        assert!(matches!(
            id_err,
            SqlGenerateError::IdNotAllowedInWriteContext
        ));

        let inequality_err = generator()
            .generate(root("create", leaf("public_rating:>8")), Extras::default())
            .unwrap_err();
        assert!(matches!(
            inequality_err,
            SqlGenerateError::InequalityInWriteContext(_)
        ));
    }

    #[test]
    fn update_requires_match_criteria() {
        let err = generator()
            .generate(
                root("update", update(and(vec![]), leaf("status:finished"))),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::MissingMatchCriteria));
    }

    #[test]
    fn update_rejects_non_split_expression() {
        let err = generator()
            .generate(
                root("update", or(vec![leaf("id:42"), leaf("status:finished")])),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::UnsupportedUpdateShape));
    }

    #[test]
    fn update_rejects_non_flat_write_expression() {
        let err = generator()
            .generate(
                root(
                    "update",
                    update(
                        leaf("id:42"),
                        or(vec![leaf("status:finished"), leaf("tag:action:major")]),
                    ),
                ),
                Extras::default(),
            )
            .unwrap_err();
        assert!(matches!(err, SqlGenerateError::UnsupportedUpdateWriteShape));
    }

    #[test]
    fn update_generates_update_and_conditional_tag_insert() {
        let sql = generator()
            .generate(
                root(
                    "update",
                    update(
                        and(vec![leaf("id:42"), leaf("title:attack_on_titan")]),
                        and(vec![
                            leaf("status:finished"),
                            leaf("created_at:01-06-2024"),
                            leaf("tag:action:major"),
                        ]),
                    ),
                ),
                Extras::default(),
            )
            .unwrap();

        assert_eq!(sql.len(), 3);
        assert_eq!(
            sql[0].sql,
            "UPDATE library_entries SET status = ?, created_at = ?, updated_at = CURRENT_TIMESTAMP WHERE (library_entries.id = ? AND library_entries.title LIKE ?)"
        );
        assert_eq!(
            sql[0].params,
            vec![
                "finished".to_string(),
                "2024-06-01".to_string(),
                "42".to_string(),
                "%attack on titan%".to_string(),
            ]
        );
        assert_eq!(sql[0].outputs, Vec::<String>::new());
        assert_eq!(
            sql[1].sql,
            "INSERT INTO tags (value, weight) VALUES (?, ?) ON CONFLICT(value, weight) DO NOTHING"
        );
        assert_eq!(
            sql[1].params,
            vec!["action".to_string(), "major".to_string()]
        );
        assert_eq!(sql[1].outputs, Vec::<String>::new());
        assert_eq!(
            sql[2].sql,
            "INSERT INTO library_entry_tags (library_entry_id, tag_id) SELECT library_entries.id, tags.id FROM library_entries JOIN tags ON tags.value = ? AND tags.weight = ? WHERE (library_entries.id = ? AND library_entries.title LIKE ?) AND NOT EXISTS (SELECT 1 FROM library_entry_tags WHERE library_entry_tags.library_entry_id = library_entries.id AND library_entry_tags.tag_id = tags.id)"
        );
        assert_eq!(
            sql[2].params,
            vec![
                "action".to_string(),
                "major".to_string(),
                "42".to_string(),
                "%attack on titan%".to_string(),
            ]
        );
        assert_eq!(sql[2].outputs, Vec::<String>::new());
    }

    #[test]
    fn update_can_generate_only_tag_insert() {
        let sql = generator()
            .generate(
                root("update", update(leaf("id:42"), leaf("tag:action:major"))),
                Extras::default(),
            )
            .unwrap();

        assert_eq!(sql.len(), 2);
        assert_eq!(
            sql[0].sql,
            "INSERT INTO tags (value, weight) VALUES (?, ?) ON CONFLICT(value, weight) DO NOTHING"
        );
        assert_eq!(sql[0].outputs, Vec::<String>::new());
        assert!(sql[1].sql.starts_with("INSERT INTO library_entry_tags (library_entry_id, tag_id) SELECT library_entries.id, tags.id FROM library_entries JOIN tags ON tags.value = ? AND tags.weight = ? WHERE library_entries.id = ?"));
        assert_eq!(sql[1].outputs, Vec::<String>::new());
    }

    #[test]
    fn update_applies_optional_user_id_scope_when_provided() {
        let sql = generator()
            .generate(
                root(
                    "update",
                    update(
                        leaf("id:42"),
                        and(vec![leaf("status:finished"), leaf("tag:action:major")]),
                    ),
                ),
                Extras {
                    user_id: Some("user-1".to_string()),
                },
            )
            .unwrap();

        assert_eq!(
            sql[0].sql,
            "UPDATE library_entries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE (library_entries.id = ?) AND library_entries.user_id = ?"
        );
        assert_eq!(
            sql[0].params,
            vec![
                "finished".to_string(),
                "42".to_string(),
                "user-1".to_string()
            ]
        );
        assert_eq!(sql[0].outputs, Vec::<String>::new());
        assert_eq!(
            sql[1].sql,
            "INSERT INTO tags (user_id, value, weight) VALUES (?, ?, ?) ON CONFLICT(value, weight, user_id) DO NOTHING"
        );
        assert_eq!(sql[1].outputs, Vec::<String>::new());
        assert_eq!(
            sql[2].sql,
            "INSERT INTO library_entry_tags (library_entry_id, tag_id) SELECT library_entries.id, tags.id FROM library_entries JOIN tags ON tags.user_id = ? AND tags.value = ? AND tags.weight = ? WHERE (library_entries.id = ?) AND library_entries.user_id = ? AND NOT EXISTS (SELECT 1 FROM library_entry_tags WHERE library_entry_tags.library_entry_id = library_entries.id AND library_entry_tags.tag_id = tags.id)"
        );
        assert_eq!(sql[2].outputs, Vec::<String>::new());
    }

    #[test]
    fn update_can_reuse_complex_search_query_and_create_like_values() {
        let sql = generator()
            .generate(
                root(
                    "update",
                    update(
                        and(vec![
                            or(vec![leaf("status:planning"), leaf("status:on_hold")]),
                            not(leaf("media_type:movie")),
                        ]),
                        and(vec![
                            leaf("title:legend_of_the_galactic_heroes"),
                            leaf("public_rating:9.5"),
                        ]),
                    ),
                ),
                Extras::default(),
            )
            .unwrap();

        assert_eq!(sql.len(), 1);
        assert_eq!(
            sql[0].sql,
            "UPDATE library_entries SET public_rating = ?, title = ?, updated_at = CURRENT_TIMESTAMP WHERE ((library_entries.status = ? OR library_entries.status = ?) AND NOT (library_entries.media_type = ?))"
        );
        assert_eq!(
            sql[0].params,
            vec![
                "9.5".to_string(),
                "legend of the galactic heroes".to_string(),
                "planning".to_string(),
                "on_hold".to_string(),
                "movie".to_string(),
            ]
        );
    }
}
