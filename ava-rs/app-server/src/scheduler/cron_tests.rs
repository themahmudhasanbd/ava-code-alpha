use super::next_run_after;
use super::parse_cron;
use chrono::TimeZone;
use chrono::Utc;
use pretty_assertions::assert_eq;

fn unix(year: i32, month: u32, day: u32, hour: u32, minute: u32) -> i64 {
    Utc.with_ymd_and_hms(year, month, day, hour, minute, 0)
        .single()
        .expect("valid test datetime")
        .timestamp()
}

#[test]
fn parses_every_minute() {
    let schedule = parse_cron("* * * * *").expect("valid cron");
    // 2026-09-30 12:00:30 -> next run 12:01:00.
    let after = unix(2026, 9, 30, 12, 0) + 30;
    assert_eq!(next_run_after(&schedule, after), Some(unix(2026, 9, 30, 12, 1)));
}

#[test]
fn parses_daily_at_fixed_time() {
    let schedule = parse_cron("30 9 * * *").expect("valid cron");
    // After 09:30 today -> tomorrow 09:30.
    let after = unix(2026, 9, 30, 9, 30) + 10;
    assert_eq!(
        next_run_after(&schedule, after),
        Some(unix(2026, 10, 1, 9, 30))
    );
}

#[test]
fn parses_step_and_names() {
    let schedule = parse_cron("*/15 9-17 * * mon-fri").expect("valid cron");
    // Friday 2026-10-02 17:50 -> next Monday 09:00.
    let after = unix(2026, 10, 2, 17, 50);
    assert_eq!(
        next_run_after(&schedule, after),
        Some(unix(2026, 10, 5, 9, 0))
    );
}

#[test]
fn day_of_week_seven_is_sunday() {
    let schedule = parse_cron("0 12 * * 7").expect("valid cron");
    // Saturday 2026-10-03 12:00 -> Sunday 2026-10-04 12:00.
    let after = unix(2026, 10, 3, 12, 0);
    assert_eq!(
        next_run_after(&schedule, after),
        Some(unix(2026, 10, 4, 12, 0))
    );
}

#[test]
fn day_of_month_or_day_of_week_when_both_restricted() {
    // Fires on the 1st of the month OR every Monday at 08:00.
    let schedule = parse_cron("0 8 1 * mon").expect("valid cron");
    // Thursday 2026-10-01 09:00 -> Monday 2026-10-05 08:00 (not Nov 1st).
    let after = unix(2026, 10, 1, 9, 0);
    assert_eq!(
        next_run_after(&schedule, after),
        Some(unix(2026, 10, 5, 8, 0))
    );
}

#[test]
fn rejects_bad_expressions() {
    assert!(parse_cron("* * * *").is_err());
    assert!(parse_cron("61 * * * *").is_err());
    assert!(parse_cron("*/0 * * * *").is_err());
    assert!(parse_cron("0 0 * * * *").is_err());
    assert!(parse_cron("nope * * * *").is_err());
}
