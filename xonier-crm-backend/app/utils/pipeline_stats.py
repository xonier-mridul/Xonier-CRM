"""Read-only pipeline reporting; never changes a lead's saved lifecycle status."""

import re
from collections import Counter


STATUS_LABELS = {
    "interested": "Interested",
    "hot_follow_up": "Hot Follow Up",
    "cold_follow_up": "Cold Follow Up",
    "details_shared": "Details Shared",
    "call_back": "Call Back",
    "future_lead": "Future Lead",
    "demo_rescheduled": "Demo Rescheduled",
    "demo_scheduled": "Demo Scheduled",
    "erpjee": "ERPJEE",
    "hrjee": "HRJEE",
    "custom_requirement": "Custom Requirement",
    "crm": "CRM",
    "demo_pending": "Demo Pending",
    "demo_completed": "Demo Completed",
    "meeting_scheduled": "Meeting Scheduled",
    "meeting_completed": "Meeting Completed",
    "follow_up_requested": "Follow-up Requested",
    "pricing_discussion_needed": "Pricing Discussion Needed",
    "decision_pending": "Decision Pending",
    "feature_request": "Feature Request",
    "future_prospect": "Future Prospect",
    "no_need": "No Need",
    "not_interested": "Not Interested",
    "purchased_other_software": "Purchased Other Software",
    "deny_to_take_meeting": "Deny to Take Meeting",
    "invalid_meeting": "Invalid Meeting",
    "satisfy_with_existing_software": "Satisfied with Existing Software",
    "searching_another_software": "Searching Another Software",
    "payment_pending": "Payment Pending",
    "part_payment_received": "Part Payment Received",
    "under_negotiation": "Under Negotiation",
}

ALIASES = {
    "intrested": "interested",
    "callback": "call_back",
    "followup": "follow_up",
    "followups": "follow_up",
    "follow_ups": "follow_up",
    "hot_followup": "hot_follow_up",
    "cold_followup": "cold_follow_up",
    "followup_requested": "follow_up_requested",
    "future_prospact": "future_prospect",
    "denay_to_take_meeting": "deny_to_take_meeting",
    "part_payment_recived": "part_payment_received",
    "part_payment_received": "part_payment_received",
    "satisfied_with_existing_software": "satisfy_with_existing_software",
    "demo_done": "demo_completed",
    "meeting_done": "meeting_completed",
}

# Extra fields are user-defined. Inspect explicit status/stage/disposition fields,
# not arbitrary notes whose text might happen to contain a status label.
CUSTOM_STATUS_KEYS = {
    "status", "leadstatus", "stage", "leadstage", "disposition",
    "connectstatus", "engagementstatus", "salesstatus", "followupstatus",
    "demostatus", "meetingstatus",
}


def normalize_status(value):
    if not isinstance(value, str):
        return ""
    key = re.sub(r"[\s_-]+", "_", value.strip().lower())
    return ALIASES.get(key, key)


def lead_reporting_fields(lead):
    """Return the normalized lifecycle, engagement status, and reporting labels."""
    status = normalize_status(lead.get("status")) or "new"
    contact = normalize_status(lead.get("connectStatus")) or "not_reached"

    labels = {contact}
    if status != "new":
        labels.add(status)

    for field in lead.get("customStatuses") or []:
        if not isinstance(field, dict):
            continue
        key = re.sub(r"[\s_-]+", "", str(field.get("k", "")).lower())
        if key in CUSTOM_STATUS_KEYS:
            labels.add(normalize_status(field.get("v")))

    # Only recognizable labels in tags/product types represent these metrics.
    for field in ("dataTag", "projectType"):
        value = normalize_status(lead.get(field))
        if value in STATUS_LABELS:
            labels.add(value)

    if normalize_status(lead.get("meetingScheduled")) == "yes" and "meeting_completed" not in labels:
        labels.add("meeting_scheduled")

    labels.discard("")
    labels.difference_update({"won", "lost", "delete", "deleted", "new"})
    return status, contact, labels


def matches_pipeline_filter(lead, filter_name):
    """Match a lead to one of the clickable pipeline cards/funnel stages."""
    status, contact, labels = lead_reporting_fields(lead)
    if status in {"delete", "deleted"}:
        return False

    if filter_name in {None, "", "all"}:
        return True
    if filter_name == "in_progress":
        return status not in {"won", "lost"}
    if filter_name == "fresh_enquiry":
        return contact == "not_reached"
    if filter_name == "contacted":
        return contact not in {"not_reached", "not_connected"}
    if filter_name == "interested":
        return status not in {"won", "lost"} and "interested" in labels
    if filter_name == "meetings_scheduled":
        return status not in {"won", "lost"} and bool(labels & {"meeting_scheduled", "demo_scheduled", "demo_rescheduled"})
    if filter_name == "meetings_done":
        return status not in {"won", "lost"} and bool(labels & {"meeting_completed", "demo_completed"})
    if filter_name == "follow_ups":
        return status not in {"won", "lost"} and any("follow_up" in key for key in labels)
    if filter_name == "engaged":
        return status not in {"won", "lost"} and bool(
            labels & {
                "interested", "follow_up", "follow_up_requested", "hot_follow_up",
                "cold_follow_up", "meeting_scheduled", "demo_scheduled",
                "demo_rescheduled", "meeting_completed", "demo_completed", "call_back",
            }
        )
    if filter_name == "meetings":
        return status not in {"won", "lost"} and bool(
            labels & {"meeting_scheduled", "demo_scheduled", "demo_rescheduled", "meeting_completed", "demo_completed"}
        )
    if filter_name == "closed_won":
        return status == "won"
    return False


def summarize_lead_groups(groups):
    """Groups contain reporting fields and a count of unique leads with those fields.

    Won/lost close the lead. Every other non-deleted lead is open/in progress.
    Each open lead counts once per normalized label and once per highlight;
    different labels can overlap (e.g. interested + meeting scheduled).
    """
    engagement = Counter()
    fresh_breakdown = Counter()
    in_progress_breakdown = Counter()
    lost_breakdown = Counter()
    lifecycle = Counter()
    highlights = Counter({key: 0 for key in (
        "interested", "meetingsScheduled", "meetingsCompleted", "demosScheduled", "callBack", "followUps",
    )})
    for group in groups:
        lead, count = group["_id"], group["count"]
        status, contact, labels = lead_reporting_fields(lead)
        if status in {"delete", "deleted"}:
            continue
        lifecycle[status] += count
        engagement[contact] += count

        is_won_or_lost = status in {"won", "lost"}
        is_lost = status == "lost"
        is_fresh = (contact == "not_reached" or status == "new") and not is_won_or_lost
        is_in_progress = not is_fresh and not is_won_or_lost

        for label in labels:
            if is_fresh:
                fresh_breakdown[label] += count
            elif is_in_progress:
                in_progress_breakdown[label] += count
            elif is_lost:
                lost_breakdown[label] += count

        highlight_matches = {
            "interested": "interested" in labels,
            "meetingsScheduled": bool(labels & {"meeting_scheduled", "demo_scheduled", "demo_rescheduled"}),
            "meetingsCompleted": bool(labels & {"meeting_completed", "demo_completed"}),
            "demosScheduled": bool(labels & {"demo_scheduled", "demo_rescheduled"}),
            "callBack": "call_back" in labels,
            "followUps": any("follow_up" in key for key in labels),
        }
        for key, matches in highlight_matches.items():
            if matches:
                highlights[key] += count

    total = sum(lifecycle.values())
    closed = lifecycle["won"] + lifecycle["lost"]
    funnel_filters = (
        "all", "contacted", "engaged", "meetings", "closed_won",
    )
    return {
        "stats": [{"status": key, "count": count} for key, count in engagement.most_common()],
        "statusBreakdown": [],
        "pieBreakdown": {
            "fresh": [
                {"status": key, "label": STATUS_LABELS.get(key, key.replace("_", " ").title()), "count": count}
                for key, count in sorted(fresh_breakdown.items(), key=lambda pair: (-pair[1], pair[0]))
            ],
            "inProgress": [
                {"status": key, "label": STATUS_LABELS.get(key, key.replace("_", " ").title()), "count": count}
                for key, count in sorted(in_progress_breakdown.items(), key=lambda pair: (-pair[1], pair[0]))
            ],
            "lost": [
                {"status": key, "label": STATUS_LABELS.get(key, key.replace("_", " ").title()), "count": count}
                for key, count in sorted(lost_breakdown.items(), key=lambda pair: (-pair[1], pair[0]))
            ],
        },
        "totalLeads": total,
        "totalInProgress": total - closed,
        "totalClosed": closed,
        "closedBreakdown": {"won": lifecycle["won"], "lost": lifecycle["lost"]},
        "highlights": dict(highlights),
        "funnel": {
            filter_name: sum(
                group["count"]
                for group in groups
                if matches_pipeline_filter(group["_id"], filter_name)
            )
            for filter_name in funnel_filters
        },
    }
