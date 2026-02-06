from datetime import datetime


from datetime import datetime
from typing import List, Dict


def quotation_template(
    quote_id: str,
    title: str,
    description: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    company_name: str,
    issue_date: str,
    valid_until: str,

    sub_total: float,
    tax: float = 0,
    discount: float = 0,
    total: float = 0,
    company_logo: str = "",
    company_address: str = "",
    terms_conditions: str = "",
    notes: str = ""
) -> str:
    """
    Generate a beautiful quotation email template
    
    items format: [
        {
            "name": "Product/Service Name",
            "description": "Item description",
            "quantity": 1,
            "unit_price": 100.00,
            "amount": 100.00
        }
    ]
    """
    

    
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quotation - {quote_id}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 0;">
            <tr>
                <td align="center">
                    <!-- Main Container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 50px 40px; text-align: center;">
                                {f'<img src="{company_logo}" alt="Company Logo" style="max-width: 180px; margin-bottom: 20px;">' if company_logo else ''}
                                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                    QUOTATION
                                </h1>
                                <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                                    Quote #{quote_id}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                
                                <!-- Greeting -->
                                <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                    Dear <strong>{customer_name}</strong>,
                                </p>
                                
                                <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.7;">
                                    Thank you for your interest! We're pleased to provide you with the following quotation for your consideration.
                                </p>
                                
                                <!-- Quotation Details Box -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                                    <tr>
                                        <td style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="padding-bottom: 16px;">
                                                        <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 700;">
                                                            {title}
                                                        </h2>
                                                        {f'<p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">{description}</p>' if description else ''}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                            <tr>
                                                                <td width="50%" style="padding: 8px 0;">
                                                                    <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 4px;">Issue Date</span>
                                                                    <span style="color: #111827; font-size: 15px; font-weight: 600;">{issue_date}</span>
                                                                </td>
                                                                <td width="50%" style="padding: 8px 0; text-align: right;">
                                                                    <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 4px;">Valid Until</span>
                                                                    <span style="color: #dc2626; font-size: 15px; font-weight: 600;">{valid_until}</span>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Customer & Company Info -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                                    <tr>
                                        <td width="48%" style="vertical-align: top;">
                                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px;">
                                                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                                                    Bill To
                                                </h3>
                                                <p style="margin: 0 0 6px 0; color: #111827; font-size: 15px; font-weight: 600;">
                                                    {customer_name}
                                                </p>
                                                {f'<p style="margin: 0 0 6px 0; color: #374151; font-size: 14px;">{company_name}</p>' if company_name else ''}
                                                <p style="margin: 0 0 4px 0; color: #4b5563; font-size: 14px;">
                                                    📧 {customer_email}
                                                </p>
                                                {f'<p style="margin: 0; color: #4b5563; font-size: 14px;">📞 {customer_phone}</p>' if customer_phone else ''}
                                            </div>
                                        </td>
                                        <td width="4%"></td>
                                        <td width="48%" style="vertical-align: top;">
                                            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px;">
                                                <h3 style="margin: 0 0 12px 0; color: #047857; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                                                    From
                                                </h3>
                                                <p style="margin: 0 0 6px 0; color: #111827; font-size: 15px; font-weight: 600;">
                                                    Your Company Name
                                                </p>
                                                {f'<p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">{company_address}</p>' if company_address else ''}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Items Table -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                    <thead>
                                        <tr style="background-color: #f9fafb;">
                                            <th style="padding: 14px 12px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                                                Item Description
                                            </th>
                                            <th style="padding: 14px 12px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                                                Qty
                                            </th>
                                            <th style="padding: 14px 12px; text-align: right; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                                                Unit Price
                                            </th>
                                            <th style="padding: 14px 12px; text-align: right; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                            
                                    </tbody>
                                </table>
                                
                                <!-- Totals -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                                    <tr>
                                        <td width="60%"></td>
                                        <td width="40%">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="padding: 10px 0; color: #4b5563; font-size: 15px;">Subtotal:</td>
                                                    <td style="padding: 10px 0; text-align: right; color: #111827; font-size: 15px; font-weight: 600;">
                                                        ${sub_total:,.2f}
                                                    </td>
                                                </tr>
                                                {f'''<tr>
                                                    <td style="padding: 10px 0; color: #4b5563; font-size: 15px;">Tax:</td>
                                                    <td style="padding: 10px 0; text-align: right; color: #111827; font-size: 15px; font-weight: 600;">
                                                        ${tax:,.2f}
                                                    </td>
                                                </tr>''' if tax > 0 else ''}
                                                {f'''<tr>
                                                    <td style="padding: 10px 0; color: #10b981; font-size: 15px;">Discount:</td>
                                                    <td style="padding: 10px 0; text-align: right; color: #10b981; font-size: 15px; font-weight: 600;">
                                                        -${discount:,.2f}
                                                    </td>
                                                </tr>''' if discount > 0 else ''}
                                                <tr>
                                                    <td style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; color: #111827; font-size: 18px; font-weight: 700;">
                                                        Total:
                                                    </td>
                                                    <td style="padding: 16px 0 0 0; border-top: 2px solid #e5e7eb; text-align: right; color: #7c3aed; font-size: 24px; font-weight: 700;">
                                                        ${total:,.2f}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Notes -->
                                {f'''<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin-bottom: 30px;">
                                    <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 700; text-transform: uppercase;">
                                        📝 Notes
                                    </h3>
                                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                                        {notes}
                                    </p>
                                </div>''' if notes else ''}
                                
                                <!-- Terms & Conditions -->
                                {f'''<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                    <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 14px; font-weight: 700; text-transform: uppercase;">
                                        Terms & Conditions
                                    </h3>
                                    <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.7;">
                                        {terms_conditions}
                                    </p>
                                </div>''' if terms_conditions else ''}
                                
                                <!-- Call to Action -->
                                <div style="text-align: center; margin: 40px 0 30px 0;">
                                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px;">
                                        If you have any questions or would like to proceed, please don't hesitate to contact us.
                                    </p>
                                    <a href="mailto:{customer_email}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                                        Accept Quotation
                                    </a>
                                </div>
                                
                                <!-- Closing -->
                                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.7;">
                                    Best regards,<br>
                                    <strong style="color: #111827;">Your Company Team</strong>
                                </p>
                                
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                                    This quotation is valid until <strong>{valid_until}</strong>
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                    © 2024 Your Company. All rights reserved.
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """