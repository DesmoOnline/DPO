import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Enable JSON bodies with limit for Base64 PDF uploads
app.use(express.json({ limit: '10mb' }));

// Serve static files from the Vite build directory
app.use(express.static(join(__dirname, 'dist')));

// Endpoint to send invoices/packing slips via email with PDF attachment
app.post('/api/send-invoice-email', async (req, res) => {
  const { to, subject, body, pdfBase64, filename } = req.body;
  
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  
  if (!user || !pass) {
    return res.status(400).json({ 
      success: false, 
      error: "SMTP email credentials (GMAIL_USER and GMAIL_APP_PASSWORD) are not configured in the server environment." 
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  const mailOptions = {
    from: `"Desmo Products Online" <${user}>`,
    to,
    subject,
    text: body,
    attachments: pdfBase64 ? [
      {
        filename: filename || 'invoice.pdf',
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }
    ] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Email sending failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Catch-all route to serve the React app for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
