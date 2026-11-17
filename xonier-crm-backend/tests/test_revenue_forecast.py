import unittest
from datetime import datetime, timezone

from bson import DBRef, ObjectId

from app.services.revenue_forecast_service import summarize


class RevenueForecastTests(unittest.TestCase):
    def test_groups_by_close_month_and_assigned_owner(self):
        owner_a, owner_b = ObjectId(), ObjectId()
        deals = [
            {"amount": 1000, "closeDate": datetime(2027, 1, 10, tzinfo=timezone.utc),
             "assignedTo": DBRef("users", owner_a), "dealProbability": 40},
            {"amount": 2000, "closeDate": datetime(2027, 1, 20, tzinfo=timezone.utc),
             "assignedTo": DBRef("users", owner_a), "forecastProbability": 75, "dealProbability": 10},
            {"amount": 500, "closeDate": datetime(2027, 2, 1, tzinfo=timezone.utc),
             "createdBy": DBRef("users", owner_b)},
            {"amount": 300, "closeDate": None, "createdBy": DBRef("users", owner_b)},
        ]
        result = summarize(deals, {str(owner_a): "Alice", str(owner_b): "Bob"}, "2027-01", "2027-02")
        self.assertEqual(result["rows"][0], {
            "month": "2027-01", "ownerId": str(owner_a), "ownerName": "Alice",
            "dealCount": 2, "amount": 3000, "weightedAmount": 1900,
            "missingProbabilityCount": 0,
        })
        self.assertEqual(result["rows"][1]["missingProbabilityCount"], 1)
        self.assertEqual(result["total"]["amount"], 3500)
        self.assertEqual(result["undated"], {"dealCount": 1, "amount": 300})

    def test_excludes_other_months_from_forecast_totals(self):
        result = summarize([{"amount": 100, "closeDate": datetime(2028, 1, 1, tzinfo=timezone.utc)}], {}, "2027-01", "2027-12")
        self.assertEqual(result["rows"], [])
        self.assertEqual(result["total"]["amount"], 0)


if __name__ == "__main__":
    unittest.main()
