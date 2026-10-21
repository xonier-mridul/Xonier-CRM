from app.services.mail_queue import MailQueue
from app.config.email_config import EMAIL_USER, EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, FROM_EMAIL
from app.core.enums import OTP_TYPE
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

    async def send_otp_email(self, to, otp, type, *, session=None, key=None, expires_at=None, otp_ref=None):
        purpose = getattr(type, "value", type)
        subject = "OTP for login" if purpose == "login" else "OTP for email verification" if purpose == "email_verification" else "OTP for password reset"
        return await MailQueue().enqueue(to=[to], subject=subject,
            text=f"Your verification code is {otp}. Never share this code.",
            html=otp_template(title=subject, otp_code=otp), kind="otp", key=key,
            expires_at=expires_at, otp_ref=otp_ref, session=session)

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
        link: str,
        sub_total: float,
        total: float,
        currency_symbol: str = "$",
        currency_code: str = "USD",
        tax_amount: float = 0,
        tax_percent: float = 0,
        discount_amount: float = 0,
        discount_percent: float = 0,
        shipping_amount: float = 0,
        line_items: Optional[List[Dict]] = None,
        description: Optional[str] = None,
        company_logo: str = "",
        company_address: str = "",
        company_website: str = "",
        payment_terms: str = "",
        payment_method: str = "",
        terms_conditions: str = "",
        notes: str = "",
        quote_version: int = 1,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        session=None,
        queue_key=None,
    ):
        subject = f"Quotation #{quote_id} – {title}"

        body = quotation_template(
            quote_id=quote_id,
            title=title,
            description=description or "",
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone or "",
            company_name=company_name or "",
            issue_date=str(issue_date),
            valid_until=str(valid_until),
            link=link,
            sub_total=sub_total,
            total=total,
            currency_symbol=currency_symbol,
            currency_code=currency_code,
            tax_amount=tax_amount,
            tax_percent=tax_percent,
            discount_amount=discount_amount,
            discount_percent=discount_percent,
            shipping_amount=shipping_amount,
            line_items=line_items or [],
            company_logo=company_logo,
            company_address=company_address,
            company_website=company_website,
            payment_terms=payment_terms,
            payment_method=payment_method,
            terms_conditions=terms_conditions,
            notes=notes,
            quote_version=quote_version,
        )
        
            

        return await MailQueue().enqueue(to=[to], cc=cc, bcc=bcc, subject=subject,
            text=f"Quotation #{quote_id}: {title}. Total: {total:,.2f} {currency_code}. View details: {link}",
            html=body, kind="transactional", key=queue_key, session=session)


        
