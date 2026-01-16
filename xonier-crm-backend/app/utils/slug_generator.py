import re


def generate_slug(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\s]", "", value)  
    value = re.sub(r"\s+", "_", value)         
    return value