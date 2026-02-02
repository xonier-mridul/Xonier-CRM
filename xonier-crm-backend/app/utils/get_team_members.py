
from app.repositories.team_repository import TeamRepository
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder


class GetTeamMembers():
    def __init__(self):
        self.repo = TeamRepository()


    async def get_team_members(self, userId: str):
    
        user_obj_id = PydanticObjectId(userId)
        

        teams = await self.repo.find(
            {"manager.$id": {"$in": [user_obj_id]}}, 
            populate=["members"]
        )


        if not teams:
            return []
        
        teams = jsonable_encoder(teams)


        selectedMembers = set()

        for item in teams:
            for i in item["members"]:
               
                selectedMembers.add(PydanticObjectId(i["id"]))


        return list(selectedMembers) if selectedMembers else []




        
    