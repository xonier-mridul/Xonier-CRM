import unittest

from app.utils.pipeline_stats import normalize_status, summarize_lead_groups


def lead_group(count=1, **fields):
    return {"_id": fields, "count": count}


def breakdown(result):
    return {item["status"]: item["count"] for item in result["statusBreakdown"]}


class PipelineStatsTests(unittest.TestCase):
    def test_empty_pipeline_has_zero_counts(self):
        result = summarize_lead_groups([])
        self.assertEqual(result["totalLeads"], 0)
        self.assertEqual(result["totalInProgress"], 0)
        self.assertEqual(result["totalClosed"], 0)
        self.assertEqual(result["stats"], [])
        self.assertEqual(result["statusBreakdown"], [])
        self.assertTrue(all(value == 0 for value in result["highlights"].values()))

    def test_closed_and_deleted_leads_are_not_in_open_breakdown(self):
        result = summarize_lead_groups([
            lead_group(3, status="new", connectStatus="interested"),
            lead_group(2, status="won", connectStatus="interested", meetingScheduled="yes"),
            lead_group(4, status="lost", connectStatus="call_back"),
            lead_group(8, status="delete", connectStatus="interested"),
            lead_group(7, status="deleted"),
        ])
        self.assertEqual(result["totalLeads"], 9)
        self.assertEqual(result["totalClosed"], 6)
        self.assertEqual(result["totalInProgress"], 3)
        self.assertEqual(result["closedBreakdown"], {"won": 2, "lost": 4})
        self.assertEqual(breakdown(result), {"interested": 3})
        self.assertEqual(result["highlights"]["meetingsScheduled"], 0)
        self.assertEqual(sum(item["count"] for item in result["stats"]), 9)

    def test_not_interested_does_not_count_as_interested_or_change_lifecycle(self):
        result = summarize_lead_groups([
            lead_group(6, status="new", connectStatus="not_interested"),
            lead_group(2, status="qualified", connectStatus="interested"),
        ])
        self.assertEqual(result["highlights"]["interested"], 2)
        self.assertEqual(result["totalClosed"], 0)
        self.assertEqual(result["totalInProgress"], 8)

    def test_duplicate_aliases_across_fields_count_once_per_lead(self):
        result = summarize_lead_groups([
            lead_group(5, status="new", connectStatus="call_back", dataTag="Call Back",
                       customStatuses=[{"k": "Lead_Status", "v": "Callback"}]),
        ])
        self.assertEqual(breakdown(result), {"call_back": 5})
        self.assertEqual(result["highlights"]["callBack"], 5)
        self.assertEqual(result["totalInProgress"], 5)

    def test_follow_up_and_demo_highlights_count_unique_leads_not_labels(self):
        result = summarize_lead_groups([
            lead_group(2, customStatuses=[
                {"k": "status", "v": "Hot Follow Up"},
                {"k": "lead_status", "v": "Follow-up Requested"},
                {"k": "demoStatus", "v": "Demo Rescheduled"},
                {"k": "stage", "v": "Demo Scheduled"},
            ]),
            lead_group(3, dataTag="Cold Followup"),
        ])
        self.assertEqual(result["highlights"]["followUps"], 5)
        self.assertEqual(result["highlights"]["demosScheduled"], 2)
        self.assertEqual(breakdown(result)["follow_up_requested"], 2)

    def test_meeting_counts_union_flags_and_explicit_statuses(self):
        result = summarize_lead_groups([
            lead_group(2, connectStatus="meeting_scheduled", meetingScheduled="yes"),
            lead_group(3, connectStatus="interested", meetingScheduled="yes"),
            lead_group(4, meetingScheduled="yes", customStatuses=[{"k": "meetingStatus", "v": "Meeting Done"}]),
            # Past dates alone are not proof that a meeting took place.
            lead_group(1, meetingScheduled="yes", meetingEnd="2020-01-01"),
        ])
        self.assertEqual(result["highlights"]["meetingsScheduled"], 6)
        self.assertEqual(result["highlights"]["meetingsCompleted"], 4)
        self.assertEqual(breakdown(result)["meeting_scheduled"], 6)

    def test_requested_labels_are_reported_without_using_example_counts(self):
        values = [
            "Interested", "Hot Follow Up", "Cold Follow up", "Details Shared", "Call Back",
            "future lead", "Demo Rescheduled", "Demo Scheduled", "ERPJEE", "HRJEE",
            "Custom Requirement", "CRM", "Demo Pending", "Demo Completed", "Follow-up Requested",
            "Pricing Discussion Needed", "Decision Pending", "Feature Request", "Future Prospact",
            "No Need", "Not Interested", "Purchased Other Software", "Denay to Take Meeting",
            "Invalid Meeting", "Satisfy with Existing Software", "searching another software",
            "payment pending", "part payment recived", "under negotiation",
        ]
        result = summarize_lead_groups([
            lead_group(customStatuses=[{"k": "lead status", "v": value}]) for value in values
        ])
        counts = breakdown(result)
        for value in values:
            with self.subTest(status=value):
                self.assertEqual(counts[normalize_status(value)], 1)
        labels = {item["status"]: item["label"] for item in result["statusBreakdown"]}
        self.assertEqual(labels["erpjee"], "ERPJEE")
        self.assertEqual(labels["crm"], "CRM")
        self.assertEqual(result["totalInProgress"], len(values))

    def test_arbitrary_tags_notes_and_non_string_fields_are_not_statuses(self):
        result = summarize_lead_groups([
            lead_group(dataTag="October import", projectType="website", customStatuses=[
                {"k": "notes", "v": "Interested"}, {"k": "status", "v": None},
                {"k": "lead_status", "v": 42},
            ]),
            lead_group(projectType="CRM", customStatuses=[{"k": "salesStatus", "v": "Awaiting Approval"}]),
        ])
        counts = breakdown(result)
        self.assertNotIn("october_import", counts)
        self.assertNotIn("website", counts)
        self.assertNotIn("interested", counts)
        self.assertIn("awaiting_approval", counts)
        self.assertEqual(counts["crm"], 1)


if __name__ == "__main__":
    unittest.main()
