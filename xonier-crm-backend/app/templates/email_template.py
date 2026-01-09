from datetime import datetime

def otp_template(title: str, otp_code: int) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: Arial, Helvetica, sans-serif;
    }}
    .container {{
      max-width: 520px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }}
    .header {{
      background: linear-gradient(135deg, #2563eb, #1e40af);
      padding: 20px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }}
    .content {{
      padding: 30px;
      color: #333333;
    }}
    .content p {{
      margin: 0 0 16px;
      font-size: 15px;
      line-height: 1.6;
    }}
    .otp-box {{
      margin: 24px 0;
      text-align: center;
    }}
    .otp {{
      display: inline-block;
      background: #f1f5f9;
      color: #1e293b;
      font-size: 28px;
      letter-spacing: 6px;
      padding: 14px 24px;
      border-radius: 8px;
      font-weight: bold;
    }}
    .warning {{
      background: #fff7ed;
      color: #9a3412;
      padding: 14px;
      border-radius: 6px;
      font-size: 14px;
      margin-top: 20px;
    }}
    .footer {{
      background: #f8fafc;
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }}
    .footer a {{
      color: #2563eb;
      text-decoration: none;
    }}
  </style>
</head>

<body>
  <div class="container">

    <div class="header">
      <h1>{title}</h1>
    </div>

    <div class="content">
      <p>Hello 👋,</p>

      <p>
        Use the following One-Time Password (OTP) to continue.
        This OTP is valid for a limited time.
      </p>

      <div class="otp-box">
        <div class="otp">{otp_code}</div>
      </div>

      <p>
        If you did not request this, please ignore this email.
      </p>

      <div class="warning">
        ⚠️ Do not share this OTP with anyone.
      </div>
    </div>

    <div class="footer">
      <p>© {datetime.now().year} Your Company Name. All rights reserved.</p>
      <p>
        Need help? <a href="mailto:support@yourcompany.com">Contact Support</a>
      </p>
    </div>

  </div>
</body>
</html>
"""
