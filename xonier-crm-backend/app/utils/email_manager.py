import aiosmtplib
from app.config.email_config import EMAIL_USER, EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, FROM_EMAIL
from app.core.enums import OTP_TYPE
from email.message import EmailMessage
from app.templates.email_template import otp_template
from app.templates.quotation_template import quotation_template
from typing import Optional, List, Dict


class EmailManager:
    def __init__(self):
        self.email_user = EMAIL_USER
        self.email_host = EMAIL_HOST
        self.email_pass = EMAIL_PASS
        self.email_port = EMAIL_PORT
        self.from_email = FROM_EMAIL

    async def send_otp_email(self, to: str, otp: int, type: OTP_TYPE):
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
            await aiosmtplib.send(
                message,
                hostname=self.email_host,
                port=465,
                username=self.email_user,
                password=self.email_pass,
                use_tls=True
            )
            return True
        
        except Exception as e:
            print("email error: ", e)
            return False
        
    async def send_quotation_email(
        self,
        to: str,
        quote_id: str,
        title: str,
        customer_name: str,
        customer_email: str,
        customer_phone: Optional[str],
        company_name: Optional[str],
        issue_date: str,
        valid_until: str,

        sub_total: float,
        total: float,
        description: Optional[str] = None,
        tax: float = 0,
        discount: float = 0,
        company_logo: str = "",
        company_address: str = "",
        terms_conditions: str = "",
        notes: str = "",
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ):
        
        
        subject = f"Quotation #{quote_id} - {title}"
        

        body = quotation_template(
            quote_id=quote_id,
            title=title,
            description=description or "",
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone or "",
            company_name=company_name or "",
            issue_date=issue_date,
            valid_until=valid_until,
      
            sub_total=sub_total,
            tax=tax,
            discount=discount,
            total=total,
            company_logo=company_logo,
            company_address=company_address,
            terms_conditions=terms_conditions,
            notes=notes
        )
        

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.from_email
        message["To"] = to
        

        if cc:
            message["Cc"] = ", ".join(cc)
        

        if bcc:
            message["Bcc"] = ", ".join(bcc)
        

        plain_text = f"""
        Quotation #{quote_id}
        
        Dear {customer_name},
        
        Thank you for your interest! Please find your quotation details below:
        
        Title: {title}
        Issue Date: {issue_date}
        Valid Until: {valid_until}
        
        Subtotal: ${sub_total:,.2f}
        {"Tax: $" + f"{tax:,.2f}" if tax > 0 else ""}
        {"Discount: -$" + f"{discount:,.2f}" if discount > 0 else ""}
        Total: ${total:,.2f}
        
        For the complete quotation with full details, please view this email in an HTML-compatible email client.
        
        If you have any questions, please don't hesitate to contact us.
        
        Best regards,
        Your Company Team
        """
        
        message.set_content(plain_text)
        message.add_alternative(body, subtype="html")
        
        try:
            await aiosmtplib.send(
                message,
                hostname=self.email_host,
                port=self.email_port,
                username=self.email_user,
                password=self.email_pass,
                # use_tls=True
                start_tls=True
            )
            return True
        except Exception as e:
            print(f"Quotation email error: {e}")
            return False


        