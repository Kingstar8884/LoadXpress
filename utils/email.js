require('dotenv').config();
const nodemailer = require('nodemailer');
const { SITE_URL } = process.env;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

const sendVerificationEmail = async (email, activationCode) => {
  const  url = `${SITE_URL}/auth/activate?token=${activationCode}`;
  const mailOptions = {
    from: `LoadXpress <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activate Your LoadXpress Account</title>
    <style>
        /* Base styles for email clients */
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        table { border-spacing: 0; width: 100%; }
        img { border: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1e293b; border-radius: 16px; overflow: hidden; }

        /* Typography */
        h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 15px; }
        p { font-size: 16px; line-height: 1.6; color: #64748b; margin-bottom: 20px; }

        /* Button */
        .btn-container { padding: 20px 0 30px; text-align: center; }
        .button { 
            background-color: #6366f1; 
            color: #ffffff !important; 
            text-decoration: none; 
            padding: 16px 32px; 
            border-radius: 12px; 
            font-size: 16px; 
            font-weight: 700; 
            display: inline-block;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        /* Header Logo */
        .header { padding: 40px 0 20px; text-align: center; }
        .logo-text { font-size: 22px; font-weight: 800; color: #0f172a; text-decoration: none; }

        /* Footer */
        .footer { text-align: center; padding: 30px 0; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <a href="#" class="logo-text">
                <img src="${SITE_URL}/assets/logo.png"/> 
            </a>
        </div>

        <table class="main">
            <tr>
                <td style="padding: 40px 30px;">
                    <h1>Welcome to the future of payments!</h1>
                    <p>Hello there,</p>
                    <p>We're excited to have you join **LoadXpress**. Your account has been successfully created with the email: <br>
                       <strong style="color: #0f172a;">${email}</strong>
                    </p>
                    <p>Before you can start funding your wallet and buying airtime, data, or paying bills, you need to verify your email address by clicking the button below.</p>

                    <div class="btn-container">
                        <a href="${url}" class="button">Activate Account</a>
                    </div>

                    <p style="font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                        <strong>Security Tip:</strong> If you didn't create this account, please ignore this email or contact our support team immediately.
                    </p>
                </td>
            </tr>
        </table>

        <div class="footer">
            <table width="100%">
                <tr>
                    <td align="center" style="padding-bottom: 15px;">
                        <a href="#" style="margin: 0 8px; text-decoration: none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                        </a>
                        <a href="#" style="margin: 0 8px; text-decoration: none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        </a>
                    </td>
                </tr>
                <tr>
                    <td>
                        &copy; 2026 LoadXpress Technologies. <br>
                        Kingstar, Ibadan, Nigeria.
                    </td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
`
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  sendVerificationEmail
};