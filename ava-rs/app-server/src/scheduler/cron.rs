//! Minimal 5-field cron expression parser and evaluator for scheduled tasks.
//!
//! Supported field syntax: `*`, `*/step`, `a-b`, `a-b/step`, `a,b,c`, plain
//! numbers, and (for month / day-of-week) English names like `jan` or `mon`.
//! Day matching follows the Vixie cron rule: when both day-of-month and
//! day-of-week are restricted, a day matching *either* field triggers.

use chrono::Datelike;
use chrono::TimeZone;
use chrono::Timelike;
use chrono::Utc;

#[derive(Debug, Clone)]
pub(crate) struct CronSchedule {
    minutes: Vec<u32>,
    hours: Vec<u32>,
    days_of_month: Vec<u32>,
    months: Vec<u32>,
    days_of_week: Vec<u32>,
    day_of_month_is_star: bool,
    day_of_week_is_star: bool,
}

struct FieldSpec {
    min: u32,
    max: u32,
    names: &'static [(&'static str, u32)],
}

const MINUTE: FieldSpec = FieldSpec {
    min: 0,
    max: 59,
    names: &[],
};
const HOUR: FieldSpec = FieldSpec {
    min: 0,
    max: 23,
    names: &[],
};
const DAY_OF_MONTH: FieldSpec = FieldSpec {
    min: 1,
    max: 31,
    names: &[],
};
const MONTH: FieldSpec = FieldSpec {
    min: 1,
    max: 12,
    names: &[
        ("jan", 1),
        ("feb", 2),
        ("mar", 3),
        ("apr", 4),
        ("may", 5),
        ("jun", 6),
        ("jul", 7),
        ("aug", 8),
        ("sep", 9),
        ("oct", 10),
        ("nov", 11),
        ("dec", 12),
    ],
};
const DAY_OF_WEEK: FieldSpec = FieldSpec {
    min: 0,
    max: 7,
    names: &[
        ("sun", 0),
        ("mon", 1),
        ("tue", 2),
        ("wed", 3),
        ("thu", 4),
        ("fri", 5),
        ("sat", 6),
    ],
};

/// Parses `minute hour day-of-month month day-of-week`.
pub(crate) fn parse_cron(expression: &str) -> Result<CronSchedule, String> {
    let fields: Vec<&str> = expression.split_whitespace().collect();
    if fields.len() != 5 {
        return Err(format!(
            "cron expression must have 5 fields, got {}: {expression}",
            fields.len()
        ));
    }
    let minutes = parse_field(fields[0], &MINUTE)?;
    let hours = parse_field(fields[1], &HOUR)?;
    let days_of_month = parse_field(fields[2], &DAY_OF_MONTH)?;
    let months = parse_field(fields[3], &MONTH)?;
    // Day-of-week accepts 7 as an alias for Sunday; normalize it to 0.
    let days_of_week: Vec<u32> = parse_field(fields[4], &DAY_OF_WEEK)?
        .into_iter()
        .map(|value| value % 7)
        .collect();
    Ok(CronSchedule {
        minutes,
        hours,
        days_of_month,
        months,
        days_of_week,
        day_of_month_is_star: fields[2] == "*",
        day_of_week_is_star: fields[4] == "*",
    })
}

fn parse_field(field: &str, spec: &FieldSpec) -> Result<Vec<u32>, String> {
    let mut values: Vec<u32> = Vec::new();
    for part in field.split(',') {
        if part.is_empty() {
            return Err(format!("empty cron list element in {field:?}"));
        }
        let (range, step) = match part.split_once('/') {
            Some((range, step)) => {
                let step: u32 = step
                    .parse()
                    .map_err(|_| format!("invalid cron step in {part:?}"))?;
                if step == 0 {
                    return Err(format!("cron step must be >= 1 in {part:?}"));
                }
                (range, step)
            }
            None => (part, 1),
        };
        let (start, end) = if range == "*" || range.is_empty() {
            (spec.min, spec.max)
        } else if let Some(dash) = range.find('-') {
            let start = parse_value(&range[..dash], spec)?;
            let end = parse_value(&range[dash + 1..], spec)?;
            if start > end {
                return Err(format!("invalid cron range in {part:?}"));
            }
            (start, end)
        } else {
            let value = parse_value(range, spec)?;
            (value, value)
        };
        let mut value = start;
        while value <= end {
            if (value - start) % step == 0 {
                values.push(value);
            }
            value += 1;
        }
    }
    if values.is_empty() {
        return Err(format!("cron field {field:?} matched no values"));
    }
    values.sort_unstable();
    values.dedup();
    Ok(values)
}

fn parse_value(token: &str, spec: &FieldSpec) -> Result<u32, String> {
    let lowered = token.to_lowercase();
    for (name, value) in spec.names {
        if lowered == *name {
            return Ok(*value);
        }
    }
    let value: u32 = token
        .parse()
        .map_err(|_| format!("invalid cron value {token:?}"))?;
    if value < spec.min || value > spec.max {
        return Err(format!(
            "cron value {value} out of range {}-{}",
            spec.min, spec.max
        ));
    }
    Ok(value)
}

/// Returns the next Unix timestamp (seconds) strictly after `after_unix_secs`
/// at which the schedule fires, or `None` when nothing matches within a year.
pub(crate) fn next_run_after(schedule: &CronSchedule, after_unix_secs: i64) -> Option<i64> {
    // Start at the next whole minute boundary.
    let mut candidate = after_unix_secs - (after_unix_secs % 60) + 60;
    // Bound the search to ~366 days of minutes.
    let deadline = candidate + 366 * 24 * 60 * 60;
    while candidate <= deadline {
        let Some(datetime) = Utc.timestamp_opt(candidate, 0).single() else {
            return None;
        };
        if schedule.minutes.contains(&datetime.minute())
            && schedule.hours.contains(&datetime.hour())
            && schedule.months.contains(&datetime.month())
            && day_matches(schedule, &datetime)
        {
            return Some(candidate);
        }
        candidate += 60;
    }
    None
}

fn day_matches(schedule: &CronSchedule, datetime: &chrono::DateTime<Utc>) -> bool {
    let dom_match = schedule.days_of_month.contains(&datetime.day());
    // chrono: Monday = 0 .. Sunday = 6; cron: Sunday = 0 .. Saturday = 6.
    let dow = (datetime.weekday().num_days_from_monday() + 1) % 7;
    let dow_match = schedule.days_of_week.contains(&dow);
    match (
        schedule.day_of_month_is_star,
        schedule.day_of_week_is_star,
    ) {
        (true, true) => true,
        (true, false) => dow_match,
        (false, true) => dom_match,
        (false, false) => dom_match || dow_match,
    }
}

#[cfg(test)]
#[path = "cron_tests.rs"]
mod tests;
