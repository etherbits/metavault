use QualifierSegmentRule::*;
use chrono::NaiveDate;

pub const KEYWORD_SPACE: &str = "_";

pub const ACTION_KEYWORDS: &[&str] = &["search", "create", "delete", "update"];
pub const QUALIFIER_SEMANTICS: &[&[QualifierSegmentRule]] = &[
    &[Single("id"), NonEmpty],
    &[
        Single("tag"),
        NonEmpty,
        FuzzyListWithDefault(&["major", "minor"], "major"),
    ],
    &[
        Single("status"),
        FuzzyList(&["in_progress", "dropped", "planning", "on_hold", "finished"]),
    ],
    &[Single("public_rating"), RATING_RULE],
    &[Single("personal_rating"), RATING_RULE],
    &[
        Single("media_type"),
        FuzzyList(&[
            "movie", "tv_show", "anime", "game", "book", "manga", "other",
        ]),
    ],
    &[Single("created_at"), Date],
    &[Single("updated_at"), Date],
];

const RATING_RULE: QualifierSegmentRule = Float { min: 0., max: 10. };

pub enum QualifierSegmentRule<'a> {
    NonEmpty,
    Single(&'a str),
    FuzzyList(&'a [&'a str]),
    FuzzyListWithDefault(&'a [&'a str], &'a str),
    Float { min: f64, max: f64 },
    Date,
}

impl QualifierSegmentRule<'_> {
    pub fn is_valid(&self, value: &str) -> bool {
        match self {
            NonEmpty => !value.is_empty(),
            FuzzyList(_) => !value.is_empty(),
            Float { min, max } => {
                let (inequality, value) = self.split_inequality_value(value);
                self.validate_inequality(inequality.as_str());

                value
                    .parse::<f64>()
                    .map_or(false, |f| f >= *min && f <= *max)
            }
            Date => {
                let (inequality, value) = self.split_inequality_value(value);
                self.validate_inequality(inequality.as_str());

                NaiveDate::parse_from_str(
                    value.trim_start_matches(|c: char| !c.is_ascii_digit()),
                    "%d-%m-%Y",
                )
            }
            .is_ok(),
            _ => true,
        }
    }

    fn validate_inequality(&self, inequality: &str) -> bool {
        match inequality {
            ">" | "<" | "=" | ">=" | "<=" | "" => true,
            _ => false,
        }
    }

    pub fn split_inequality_value(&self, value: &str) -> (String, String) {
        let split_idx = value.find(|c: char| c.is_ascii_digit()).unwrap_or(0);
        let (inequality, value) = value.split_at(split_idx);

        (inequality.to_string(), value.to_string())
    }

    pub fn get_err_msg(&self, value: &str) -> String {
        match self {
            NonEmpty => format!("The provided value: {} is empty", value),
            FuzzyList(options) => format!(
                "The provided value: {} did not match any possible option {:?}",
                value, options
            ),
            Float { min, max } => format!(
                "The provide value: {} is not between the required range [{} - {}] (inclusive)",
                value, min, max
            ),
            Date => format!(
                "The provided value: {} is not a valid date. Please use the following format: (>,<,>=,<=)dd-mm-yyyy",
                value
            ),
            _ => format!(
                "Something went wrong with qualification rule validation for value: {}",
                value
            ),
        }
    }
}
