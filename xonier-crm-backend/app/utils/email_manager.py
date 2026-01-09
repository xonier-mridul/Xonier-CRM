import smtplib
from app.config.email_config import EMAIL_USER, EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, FROM_EMAIL
from app.core.enums import OTP_TYPE
from email.message import EmailMessage
from app.templates.email_template import otp_template


class EmailManager:
    def __init__(self):
        self.email_user = EMAIL_USER
        self.email_host = EMAIL_HOST
        self.email_pass = EMAIL_PASS
        self.email_port = EMAIL_PORT
        self.from_email = FROM_EMAIL

    async def send_otp_email(self,to:str, otp: int, type: OTP_TYPE):
        match type:
            case OTP_TYPE.EMAIL_VERIFICATION:
                subject = "OTP for email verification"

            case OTP_TYPE.LOGIN:
                subject = "OTP for login"

            case OTP_TYPE.PASSWORD_RESET:
                subject = "OTP for password reset"

            case _:
                raise ValueError(f"Unsupported OTP type: {type}")

        body = otp_template(title=subject, otp_code=otp)

        message = EmailMessage()

        message["Subject"] = subject
        message["From"] = self.from_email
        message["To"] = to
        message.set_content(f"your verification otp is {otp}")
        message.add_alternative(body, subtype="html")

        try: 
        
            with smtplib.SMTP_SSL(self.email_host, 465) as smtp:
                smtp.login(EMAIL_USER, self.email_pass)  
                smtp.send_message(message)
                return True
        
        except Exception as e:
            print("email error: ", e)
            return False



        

        