from cryptography.fernet import Fernet
from app.core.config import EnvSettings 

Settings = EnvSettings()


class Encryption:
    def __init__(self):
        
      self.fernet = Fernet(Settings.FERNET_SECRET_KEY.encode())


    def encrypt_data(self, data: str)-> str:
        
        encrypted: bytes = self.fernet.encrypt(data.encode("utf-8"))
        return encrypted.decode("utf-8")

    def decrypt_data(self, data: str)-> str:
        decrypted: bytes = self.fernet.decrypt(data.encode("utf-8"))
        return decrypted.decode("utf-8")
    

encryptor = Encryption()