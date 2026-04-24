from datetime import datetime
from typing import List, Dict, Optional


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
    company_logo: str = "",
    company_address: str = "",
    company_website: str = "",
    payment_terms: str = "",
    payment_method: str = "",
    terms_conditions: str = "",
    notes: str = "",
    quote_version: int = 1,
) -> str:

    def fmt(amount: float) -> str:
        return f"{currency_symbol}{amount:,.2f}"


    line_items_html = ""
    if line_items:
        for i, item in enumerate(line_items):
            bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
            disc_html = f'<span style="color:#10b981;font-size:12px;"> (-{item.get("discount",0)}%)</span>' if item.get("discount") else ""
            tax_html  = f'<span style="color:#6366f1;font-size:12px;"> (+{item.get("taxRate",0)}% tax)</span>' if item.get("taxRate") else ""
            unit_html = f' <span style="color:#9ca3af;font-size:12px;">/ {item["unit"]}</span>' if item.get("unit") else ""

            line_items_html += f"""
            <tr style="background-color:{bg};">
                <td style="padding:14px 16px;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">
                    <span style="font-weight:600;">{item.get("description","—")}</span>
                    {disc_html}{tax_html}
                </td>
                <td style="padding:14px 12px;text-align:center;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6;">
                    {item.get("quantity", 1)}{unit_html}
                </td>
                <td style="padding:14px 12px;text-align:right;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6;">
                    {fmt(item.get("unitPrice", 0))}
                </td>
                <td style="padding:14px 16px;text-align:right;color:#111827;font-size:14px;font-weight:700;border-bottom:1px solid #f3f4f6;">
                    {fmt(item.get("total", 0))}
                </td>
            </tr>
            """
    else:
        line_items_html = f"""
        <tr>
            <td colspan="4" style="padding:24px;text-align:center;color:#9ca3af;font-size:14px;">
                No line items provided.
            </td>
        </tr>
        """


    tax_row = ""
    if tax_amount > 0 or tax_percent > 0:
        label = f"Tax ({tax_percent}%)" if tax_percent else "Tax"
        amount = tax_amount if tax_amount else (sub_total * tax_percent / 100)
        tax_row = f"""
        <tr>
            <td style="padding:8px 0;color:#4b5563;font-size:14px;">{label}:</td>
            <td style="padding:8px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;">+{fmt(amount)}</td>
        </tr>"""

    discount_row = ""
    if discount_amount > 0 or discount_percent > 0:
        label = f"Discount ({discount_percent}%)" if discount_percent else "Discount"
        amount = discount_amount if discount_amount else (sub_total * discount_percent / 100)
        discount_row = f"""
        <tr>
            <td style="padding:8px 0;color:#10b981;font-size:14px;">{label}:</td>
            <td style="padding:8px 0;text-align:right;color:#10b981;font-size:14px;font-weight:600;">-{fmt(amount)}</td>
        </tr>"""

    shipping_row = ""
    if shipping_amount > 0:
        shipping_row = f"""
        <tr>
            <td style="padding:8px 0;color:#4b5563;font-size:14px;">Shipping:</td>
            <td style="padding:8px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;">+{fmt(shipping_amount)}</td>
        </tr>"""

    version_badge = f'<span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:12px;padding:3px 10px;border-radius:20px;margin-left:10px;">v{quote_version}</span>' if quote_version > 1 else ""

    logo_html = f'<img src="{company_logo}" alt="Logo" style="max-height:60px;max-width:180px;margin-bottom:20px;object-fit:contain;">' if company_logo else ""

    website_html = f'<a href="{company_website}" style="color:#6366f1;font-size:13px;text-decoration:none;">{company_website}</a>' if company_website else ""

    payment_block = ""
    if payment_terms or payment_method:
        terms_row   = f'<p style="margin:0 0 6px 0;color:#374151;font-size:14px;"><strong>Terms:</strong> {payment_terms}</p>' if payment_terms else ""
        method_row  = f'<p style="margin:0;color:#374151;font-size:14px;"><strong>Method:</strong> {payment_method}</p>' if payment_method else ""
        payment_block = f"""
        <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:6px;margin-bottom:24px;">
            <h3 style="margin:0 0 10px 0;color:#047857;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                💳 Payment Information
            </h3>
            {terms_row}{method_row}
        </div>"""

    notes_block = f"""
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:6px;margin-bottom:24px;">
        <h3 style="margin:0 0 8px 0;color:#92400e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
            📝 Notes
        </h3>
        <p style="margin:0;color:#78350f;font-size:14px;line-height:1.7;">{notes}</p>
    </div>""" if notes else ""

    terms_block = f"""
    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin-bottom:24px;">
        <h3 style="margin:0 0 10px 0;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
            📋 Terms & Conditions
        </h3>
        <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.8;">{terms_conditions}</p>
    </div>""" if terms_conditions else ""

    description_html = f'<p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">{description}</p>' if description else ""

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation #{quote_id}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;padding:40px 0;">
    <tr>
        <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="660"
               style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

            <!-- ── HEADER ── -->
            <tr>
                <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:40px;text-align:center;">
                    {logo_html}
                    <h1 style="margin:0;color:#fff;font-size:30px;font-weight:800;letter-spacing:-0.5px;">
                        QUOTATION {version_badge}
                    </h1>
                    <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
                        Quote #{quote_id} &nbsp;·&nbsp; {currency_code}
                    </p>
                </td>
            </tr>

            <!-- ── BODY ── -->
            <tr>
                <td style="padding:40px;">

                    <!-- Greeting -->
                    <p style="margin:0 0 10px 0;color:#374151;font-size:16px;line-height:1.6;">
                        Dear <strong>{customer_name}</strong>,
                    </p>
                    <p style="margin:0 0 30px 0;color:#4b5563;font-size:15px;line-height:1.7;">
                        Thank you for your interest. Please find your quotation below. Click the button at the bottom to accept.
                    </p>

                    <!-- Quote Meta -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:30px;">
                        <tr>
                            <td style="padding:0 0 14px 0;">
                                <h2 style="margin:0 0 6px 0;color:#111827;font-size:19px;font-weight:700;">{title}</h2>
                                {description_html}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td width="33%" style="padding:10px 0;">
                                            <span style="color:#9ca3af;font-size:12px;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Issue Date</span>
                                            <span style="color:#111827;font-size:15px;font-weight:600;">{issue_date}</span>
                                        </td>
                                        <td width="33%" style="padding:10px 0;text-align:center;">
                                            <span style="color:#9ca3af;font-size:12px;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Valid Until</span>
                                            <span style="color:#dc2626;font-size:15px;font-weight:600;">{valid_until}</span>
                                        </td>
                                        <td width="33%" style="padding:10px 0;text-align:right;">
                                            <span style="color:#9ca3af;font-size:12px;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Currency</span>
                                            <span style="color:#111827;font-size:15px;font-weight:600;">{currency_code}</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Bill To / From -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:30px;">
                        <tr>
                            <td width="48%" style="vertical-align:top;">
                                <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:18px;border-radius:8px;">
                                    <h3 style="margin:0 0 10px 0;color:#1e40af;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                                        Bill To
                                    </h3>
                                    <p style="margin:0 0 5px 0;color:#111827;font-size:15px;font-weight:700;">{customer_name}</p>
                                    {"" if not company_name else f'<p style="margin:0 0 5px 0;color:#374151;font-size:14px;">{company_name}</p>'}
                                    <p style="margin:0 0 4px 0;color:#4b5563;font-size:13px;">✉️ {customer_email}</p>
                                    {"" if not customer_phone else f'<p style="margin:0;color:#4b5563;font-size:13px;">📞 {customer_phone}</p>'}
                                </div>
                            </td>
                            <td width="4%"></td>
                            <td width="48%" style="vertical-align:top;">
                                <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:18px;border-radius:8px;">
                                    <h3 style="margin:0 0 10px 0;color:#047857;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                                        From
                                    </h3>
                                    <p style="margin:0 0 5px 0;color:#111827;font-size:15px;font-weight:700;">{company_name}</p>
                                    {"" if not company_address else f'<p style="margin:0 0 5px 0;color:#4b5563;font-size:13px;line-height:1.6;">{company_address}</p>'}
                                    {website_html}
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Line Items Table -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="margin-bottom:30px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                        <thead>
                            <tr style="background:#f9fafb;">
                                <th style="padding:13px 16px;text-align:left;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">
                                    Description
                                </th>
                                <th style="padding:13px 12px;text-align:center;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">
                                    Qty
                                </th>
                                <th style="padding:13px 12px;text-align:right;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">
                                    Unit Price
                                </th>
                                <th style="padding:13px 16px;text-align:right;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {line_items_html}
                        </tbody>
                    </table>

                    <!-- Totals -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:30px;">
                        <tr>
                            <td width="55%"></td>
                            <td width="45%">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                                       style="border-top:1px solid #e5e7eb;padding-top:12px;">
                                    <tr>
                                        <td style="padding:8px 0;color:#4b5563;font-size:14px;">Subtotal:</td>
                                        <td style="padding:8px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;">{fmt(sub_total)}</td>
                                    </tr>
                                    {discount_row}
                                    {tax_row}
                                    {shipping_row}
                                    <tr>
                                        <td style="padding:16px 0 4px 0;border-top:2px solid #111827;color:#111827;font-size:17px;font-weight:700;">
                                            Total:
                                        </td>
                                        <td style="padding:16px 0 4px 0;border-top:2px solid #111827;text-align:right;color:#4f46e5;font-size:24px;font-weight:800;">
                                            {fmt(total)}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Payment / Notes / Terms -->
                    {payment_block}
                    {notes_block}
                    {terms_block}

                    <!-- CTA -->
                    <div style="text-align:center;margin:36px 0 28px 0;">
                        <p style="margin:0 0 20px 0;color:#4b5563;font-size:15px;line-height:1.7;">
                            Review the quotation and click below to accept it online.
                        </p>
                        <a href="{link}"
                           style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#fff;text-decoration:none;padding:15px 40px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
                            ✅ Accept Quotation
                        </a>
                        
                    </div>

                    <!-- Sign-off -->
                    <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">
                        Best regards,<br>
                        <strong style="color:#111827;">Trakeroo Team</strong>
                    </p>

                </td>
            </tr>

            <!-- ── FOOTER ── -->
            <tr>
                <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="margin:0 0 6px 0;color:#6b7280;font-size:13px;">
                        This quotation is valid until <strong>{valid_until}</strong>
                    </p>
                    <p style="margin:0;color:#9ca3af;font-size:12px;">
                        © {datetime.now().year} Trakeroo Team· All rights reserved
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