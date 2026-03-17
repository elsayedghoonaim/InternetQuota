"""
Statistics Service — Aggregates quota_logs into monthly per-account summaries,
cleans up raw logs, and purges old statistics (>1 year).
"""

import calendar
import logging
from datetime import datetime, timedelta
from collections import defaultdict

from backend.database import get_log_collection, get_statistics_collection, get_account_collection

logger = logging.getLogger(__name__)


def generate_monthly_statistics(force=False):
    """
    Aggregates quota_logs into monthly statistics per account.

    Uses the `used_gb` field (reported directly by WE API) to compute
    consumption delta — this avoids inflated numbers when logs start mid-month.
    Falls back to `remain_gb` drop if `used_gb` is unavailable.

    Adds `data_coverage_days` and `total_days_in_month` so the UI can warn
    the user when a month only has partial data.
    """
    logs_col = get_log_collection()
    stats_col = get_statistics_collection()
    accounts_col = get_account_collection()

    # If force mode, wipe all existing stats so they get recomputed
    if force:
        deleted = stats_col.delete_many({})
        logger.info(f"🔄 Force mode: deleted {deleted.deleted_count} existing statistics")

    now = datetime.utcnow()
    current_month = now.month
    current_year = now.year

    accounts = list(accounts_col.find())
    generated_count = 0

    for acc in accounts:
        identifier = acc["identifier"]
        acc_name = acc.get("name", identifier)
        acc_type = acc.get("type", "UNKNOWN")

        logs = list(logs_col.find(
            {"account_identifier": identifier}
        ).sort("checked_at", 1))

        if not logs:
            continue

        # Group logs by (year, month)
        monthly_groups = defaultdict(list)
        for log in logs:
            checked = log.get("checked_at")
            if not checked:
                continue
            key = (checked.year, checked.month)
            monthly_groups[key].append(log)

        for (year, month), month_logs in monthly_groups.items():
            # We now allow calculating stats for the current month!
            # The UI will show these as ongoing partial stats.
            is_current_month = (year == current_year and month == current_month)

            # Skip if already computed
            existing = stats_col.find_one({
                "account_identifier": identifier,
                "year": year,
                "month": month
            })
            if existing:
                continue

            # --- Day grouping ---
            daily_data = defaultdict(list)
            for log in month_logs:
                day_key = log["checked_at"].strftime("%Y-%m-%d")
                daily_data[day_key].append(log)

            sorted_days = sorted(daily_data.keys())
            total_days_in_month = calendar.monthrange(year, month)[1]
            data_coverage_days = len(sorted_days)

            # --- Smart Data Threshold ---
            # Require at least 30% coverage of the period to be statistically relevant
            if is_current_month:
                elapsed_days = now.day
                required_days = max(3, int(elapsed_days * 0.3))
            else:
                required_days = max(7, int(total_days_in_month * 0.3))
                
            if data_coverage_days < required_days:
                logger.info(f"⏭️ Skipping {identifier} {year}-{month:02d}: Insufficient data ({data_coverage_days}/{required_days} required days)")
                continue

            # --- Compute total consumption ---
            # Primary: use used_gb delta (WE API reports cumulative used_gb per billing cycle).
            # max - min = consumption during the logged period only (honest to the data we have).
            used_values = [
                l.get("used_gb") for l in month_logs
                if l.get("used_gb") is not None
            ]

            if used_values and len(used_values) >= 2:
                total_consumed = max(0, max(used_values) - min(used_values))
            else:
                # Fallback: remain_gb drop from first to last log
                first_remain = month_logs[0].get("remain_gb") or 0
                last_remain = month_logs[-1].get("remain_gb") or 0
                total_consumed = max(0, first_remain - last_remain)

            # --- Daily usage (for peak calculation) ---
            remaining_values = []
            total_gb_values = []
            daily_usage = {}

            for day in sorted_days:
                day_logs = daily_data[day]
                for dl in day_logs:
                    r = dl.get("remain_gb")
                    if r is not None:
                        remaining_values.append(r)
                    t = dl.get("total_gb")
                    if t:
                        total_gb_values.append(t)

                # Daily usage = remain drop within the day
                first_remain_day = day_logs[0].get("remain_gb") or 0
                last_remain_day = day_logs[-1].get("remain_gb") or 0
                daily_usage[day] = max(0, first_remain_day - last_remain_day)

            num_days = max(data_coverage_days, 1)
            avg_daily = total_consumed / num_days

            # Peak day
            peak_day = max(daily_usage, key=daily_usage.get) if daily_usage else (sorted_days[0] if sorted_days else None)
            peak_usage = daily_usage.get(peak_day, 0) if peak_day else 0

            # Remaining stats
            min_remaining = min(remaining_values) if remaining_values else 0
            avg_remaining = sum(remaining_values) / len(remaining_values) if remaining_values else 0

            # Plan size
            current_plan = max(total_gb_values) if total_gb_values else acc.get("total_gb") or 0

            # Recommendation (kept for model compat, not shown in UI)
            recommended = round(total_consumed * 1.2, 1) if total_consumed > 0 else current_plan
            if current_plan > 0 and total_consumed > 0:
                utilization = total_consumed / current_plan
                recommendation = "UPGRADE" if utilization > 0.85 else ("DOWNGRADE" if utilization < 0.50 else "GOOD")
            else:
                recommendation = "GOOD"

            stat_doc = {
                "account_identifier": identifier,
                "account_name": acc_name,
                "account_type": acc_type,
                "year": year,
                "month": month,
                "period": f"{year}-{month:02d}",
                "avg_daily_usage_gb": round(avg_daily, 2),
                "total_consumed_gb": round(total_consumed, 2),
                "peak_usage_gb": round(peak_usage, 2),
                "peak_usage_date": peak_day,
                "min_remaining_gb": round(min_remaining, 2),
                "avg_remaining_gb": round(avg_remaining, 2),
                "current_plan_gb": round(current_plan, 2),
                "recommended_quota_gb": round(recommended, 2),
                "recommendation": recommendation,
                "data_points": len(month_logs),
                "data_coverage_days": data_coverage_days,
                "total_days_in_month": total_days_in_month,
                "computed_at": datetime.utcnow()
            }

            # Use upsert to cleanly update ongoing stats for the current month or rewrite old ones if ?force=true
            stats_col.update_one(
                {
                    "account_identifier": identifier,
                    "year": year,
                    "month": month
                },
                {"$set": stat_doc},
                upsert=True
            )
            
            generated_count += 1
            if existing:
                logger.info(f"🔄 Updated stats for {identifier} {year}-{month:02d}: {total_consumed:.1f} GB consumed ({data_coverage_days} days)")
            else:
                logger.info(
                    f"📊 Created stats for {identifier} {year}-{month:02d}: "
                    f"{total_consumed:.1f} GB consumed, "
                    f"{data_coverage_days}/{total_days_in_month} days covered"
                )

    logger.info(f"📊 Statistics generation complete. {generated_count} new records created.")
    return generated_count


def cleanup_old_logs():
    """
    Deletes raw quota_logs older than 45 days to manage database size,
    while ensuring we have enough data to generate the previous month's and
    current month's statistics.
    """
    logs_col = get_log_collection()
    
    # Safely cutoff everything older than 45 days
    cutoff = datetime.utcnow() - timedelta(days=45)

    result = logs_col.delete_many({"checked_at": {"$lt": cutoff}})
    logger.info(f"🗑️ Cleaned up {result.deleted_count} old quota_logs (older than 45 days)")
    return result.deleted_count


def cleanup_old_statistics():
    """
    Removes statistics older than 1 year to manage storage.
    """
    stats_col = get_statistics_collection()
    
    now = datetime.utcnow()
    cutoff_year = now.year - 1
    cutoff_month = now.month

    # Delete stats where (year < cutoff_year) OR (year == cutoff_year AND month < cutoff_month)
    result = stats_col.delete_many({
        "$or": [
            {"year": {"$lt": cutoff_year}},
            {"year": cutoff_year, "month": {"$lt": cutoff_month}}
        ]
    })
    logger.info(f"🗑️ Cleaned up {result.deleted_count} old statistics (older than 1 year)")
    return result.deleted_count


def run_statistics_pipeline(force=False):
    """
    Full pipeline: generate stats → clean old logs → clean old stats.
    Called by the scheduler or manually via API.
    """
    logger.info("🚀 Starting statistics pipeline...")
    stats_generated = generate_monthly_statistics(force=force)
    logs_deleted = cleanup_old_logs()
    stats_deleted = cleanup_old_statistics()
    
    return {
        "stats_generated": stats_generated,
        "old_logs_deleted": logs_deleted,
        "old_stats_deleted": stats_deleted
    }
