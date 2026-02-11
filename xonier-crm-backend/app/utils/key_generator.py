def key_generator(field: str) -> str:
    
    field = field.strip()
    
    
    words = field.split()
    
    
    if not words:
        return ""
    
    
    result = words[0].lower()
    
    
    for word in words[1:]:
        result += word.capitalize()
    
    return result


