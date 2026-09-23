from app.repositories.rating_repository import RatingRepository
from app.core.crypto import encryptor


class RatingService:
    def __init__(self):
        self.rating_repo = RatingRepository()

    async def get_all_ratings(
        self, companyId, page, limit, search, role, rating, department, designation
    ):
        raw_data = await self.rating_repo.get_all_user_ratings(companyId)

        processed = []
        for doc in raw_data:
            roles = doc.get("roles") or []

            try:
                email = encryptor.decrypt_data(doc.get("email", ""))
            except Exception:
                email = ""

            processed.append(
                {
                    "name": f"{doc.get('firstName', '')} {doc.get('lastName', '')}".strip(),
                    "email": email,
                    "role": roles[0] if roles else "N/A",
                    "department": doc.get("department") or "N/A",
                    "designation": doc.get("designation") or "N/A",
                    "rating": round(doc.get("rating") or 0, 1),
                    "reviews": doc.get("reviews", 0),
                    "lastRated": doc["lastRated"].strftime("%b %d, %Y")
                    if doc.get("lastRated")
                    else "",
                    "_lastRatedRaw": doc.get("lastRated"),
                }
            )

        # --- build dynamic filter option lists from FULL unfiltered dataset ---
        role_options = sorted({u["role"] for u in processed if u["role"] != "N/A"})
        department_options = sorted(
            {u["department"] for u in processed if u["department"] != "N/A"}
        )
        designation_options = sorted(
            {u["designation"] for u in processed if u["designation"] != "N/A"}
        )

        # --- apply filters ---
        if search:
            s = search.lower()
            processed = [
                u for u in processed
                if s in u["name"].lower() or s in u["email"].lower()
            ]

        if role:
            processed = [u for u in processed if u["role"] == role]

        if department:
            processed = [u for u in processed if u["department"] == department]

        if designation:
            processed = [u for u in processed if u["designation"] == designation]

        rating_range = self._parse_rating_filter(rating)
        if rating_range:
            low, high = rating_range
            processed = [u for u in processed if low <= u["rating"] <= high]

        # --- stats (on filtered set) ---
        totalRatedUsers = len(processed)
        averageRating = (
            round(sum(u["rating"] for u in processed) / totalRatedUsers, 1)
            if totalRatedUsers
            else 0
        )
        highestRating = round(max((u["rating"] for u in processed), default=0), 1)

        # --- sort + paginate ---
        processed.sort(key=lambda u: u["_lastRatedRaw"] or "", reverse=True)

        totalUsers = len(processed)
        totalPages = (totalUsers + limit - 1) // limit if totalUsers else 1
        start = (page - 1) * limit
        end = start + limit
        page_data = processed[start:end]

        for u in page_data:
            u.pop("_lastRatedRaw", None)

        return {
            "users": page_data,
            "totalPages": totalPages,
            "totalUsers": totalUsers,
            "stats": {
                "totalRatedUsers": totalRatedUsers,
                "averageRating": averageRating,
                "highestRating": highestRating,
            },
            "filters": {
                "roles": role_options,
                "departments": department_options,
                "designations": designation_options,
            },
        }

    def _parse_rating_filter(self, rating: str):
        mapping = {
            "4.5 & above": (4.5, 5.0),
            "4.0 - 4.5": (4.0, 4.5),
            "3.5 - 4.0": (3.5, 4.0),
            "Below 3.5": (0, 3.5),
        }
        return mapping.get(rating)