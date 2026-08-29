import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nodemailer from 'nodemailer';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Initialize Firebase Admin SDK
let adminDb;
let adminAuth;

try {
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({ credential: cert(serviceAccount) });
      adminDb = getFirestore();
      adminAuth = getAuth();
      console.log("Firebase Admin SDK initialized on server with service account key.");
    } else if (process.env.NODE_ENV === 'production') {
      initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'desmoproductsonline' });
      adminDb = getFirestore();
      adminAuth = getAuth();
      console.log("Firebase Admin SDK initialized on server via Default Credentials.");
    } else {
      console.warn("Local Dev Warning: FIREBASE_SERVICE_ACCOUNT_KEY is missing. Firestore Admin is disabled. Email & Checkout will require .env fallbacks.");
    }
  } else {
    adminDb = getFirestore();
    adminAuth = getAuth();
  }
} catch (err) {
  console.warn("Firebase Admin SDK initialization warning:", err.message);
}

// Enable JSON bodies with limit for Base64 PDF uploads
app.use(express.json({ limit: '10mb' }));

// Serve static files from the Vite build directory
app.use(express.static(join(__dirname, 'dist')));

// Middleware: Authenticate Firebase User via Bearer ID Token
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If running in development without adminAuth credentials, allow pass-through with warning
    if (!adminAuth) {
      req.user = { uid: req.body.customerId || 'dev-user', email: 'dev@desmoproducts.com.au' };
      return next();
    }
    return res.status(401).json({ success: false, error: "Unauthorized: Missing or invalid Bearer token." });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  try {
    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
    }
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired token." });
  }
};

// Middleware: Require Admin Privileges
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized: Authentication required." });
  }

  const adminEmails = ["lew@desmoproducts.com.au", "1@1.com"];
  const userEmail = req.user.email?.toLowerCase();
  
  if (userEmail && adminEmails.includes(userEmail)) {
    return next();
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (adminDb && req.user.uid) {
    try {
      const userDoc = await adminDb.collection('users').doc(req.user.uid).get();
      if (userDoc.exists && userDoc.data().role === 'admin') {
        return next();
      }
    } catch (err) {
      console.warn("Error checking admin user record:", err.message);
    }
  }

  return res.status(403).json({ success: false, error: "Forbidden: Administrator privileges required." });
};

// Endpoint for Server-side Checkout Math & Secure Order Creation
app.post('/api/checkout', authenticateUser, async (req, res) => {
  try {
    const { customerId, cartItems, documentType = 'INVOICE', notes, deliveryAddress, ownTransport } = req.body;

    if (!customerId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid checkout request: customerId and cartItems are required." });
    }

    if (!adminDb) {
      return res.status(500).json({ success: false, error: "Database service unavailable on server." });
    }

    // 1. Fetch customer profile
    const userDoc = await adminDb.collection('users').doc(customerId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Customer profile not found." });
    }
    const customer = { id: userDoc.id, ...userDoc.data() };

    // 2. Fetch products and calculate server-side item pricing
    const orderItems = [];
    let subtotal = 0;
    let totalWeightKg = 0;
    let totalCubicMeters = 0;
    let estimatedShippingTotal = 0;
    let allAutoApproved = true;

    for (const item of cartItems) {
      const productDoc = await adminDb.collection('products').doc(item.productId).get();
      if (!productDoc.exists) {
        return res.status(400).json({ success: false, error: `Product not found: ${item.productId}` });
      }
      const prod = { id: productDoc.id, ...productDoc.data() };

      if (prod.autoApprove === false) {
        allAutoApproved = false;
      }

      // Base price override from customer custom pricing
      const originalPrice = (customer.customPricing && customer.customPricing[prod.id] !== undefined)
        ? customer.customPricing[prod.id]
        : (prod.baseWholesalePrice || 0);

      let discountPercent = 0;
      let finalPricePerUnit = originalPrice;
      let applied = false;

      // Rate Break alignment
      const alignmentId = customer.productRateBreakAlignments?.[prod.id];
      const alignedRateBreak = prod.rateBreaks?.find(rb => rb.id === alignmentId);
      if (alignedRateBreak && alignedRateBreak.quantityBreaks) {
        const applicableBreak = [...alignedRateBreak.quantityBreaks]
          .sort((a, b) => b.minQty - a.minQty)
          .find(qb => item.qty >= qb.minQty);
        if (applicableBreak) {
          if (applicableBreak.discountType === 'percentage') {
            discountPercent = applicableBreak.discountValue;
            finalPricePerUnit = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
          } else {
            finalPricePerUnit = Math.max(0, originalPrice - applicableBreak.discountValue);
            discountPercent = Math.round(((originalPrice - finalPricePerUnit) / originalPrice) * 100);
          }
          applied = true;
        }
      }

      // Standard quantity breaks fallback
      if (!applied && prod.quantityBreaks && prod.quantityBreaks.length > 0) {
        const matchedBreak = [...prod.quantityBreaks]
          .sort((a, b) => b.minQty - a.minQty)
          .find(qb => item.qty >= qb.minQty);
        if (matchedBreak) {
          if (matchedBreak.discountType === 'fixed') {
            finalPricePerUnit = matchedBreak.discountValue;
          } else if (matchedBreak.discountType === 'percentage') {
            discountPercent = matchedBreak.discountValue;
            finalPricePerUnit = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
          }
        }
      }

      const totalLineAmount = Number((finalPricePerUnit * item.qty).toFixed(2));
      subtotal += totalLineAmount;

      totalWeightKg += (prod.weightKg || 0) * item.qty;
      const l = (prod.lengthCm || 0) / 100;
      const w = (prod.widthCm || 0) / 100;
      const h = (prod.heightCm || 0) / 100;
      totalCubicMeters += (l * w * h) * item.qty;

      estimatedShippingTotal += (prod.estimatedShippingCost || 0) * item.qty;

      orderItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        qty: item.qty,
        originalPrice,
        appliedDiscountPercent: discountPercent,
        finalPricePerUnit,
        totalLineAmount,
        ...(item.selectedColors && item.selectedColors.length > 0 ? { selectedColors: item.selectedColors } : {})
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    // Calculate freight
    let baseFreight = 15.00;
    let perKgRate = 1.50;
    let minFreight = 15.00;

    // Fetch company settings if present
    const settingsDoc = await adminDb.collection('settings').doc('company').get();
    if (settingsDoc.exists) {
      const s = settingsDoc.data();
      if (s.shippingBaseRate !== undefined) baseFreight = s.shippingBaseRate;
      if (s.shippingPerKgRate !== undefined) perKgRate = s.shippingPerKgRate;
      if (s.shippingMinPrice !== undefined) minFreight = s.shippingMinPrice;
    }

    const calculatedFreight = Math.max(minFreight, baseFreight + (totalWeightKg * perKgRate));
    const activeFreightCharge = ownTransport ? 0 : (estimatedShippingTotal > 0 ? estimatedShippingTotal : calculatedFreight);
    const gstAmount = Number(((subtotal + activeFreightCharge) * 0.10).toFixed(2));
    const totalAmount = Number((subtotal + activeFreightCharge + gstAmount).toFixed(2));

    const prefix = documentType === "QUOTE" ? "QTE" : "INV";
    const nextId = `${prefix}-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;

    let initialStatus = allAutoApproved ? "approved" : "pending_approval";
    if (documentType === "QUOTE") {
      initialStatus = "quote_requested";
    } else if (!ownTransport) {
      initialStatus = "pending_approval";
    }

    const orderData = {
      id: nextId,
      customerId: customer.id,
      customerEmail: customer.email,
      companyName: customer.companyName,
      documentType,
      items: orderItems,
      subtotal,
      gstAmount,
      totalAmount,
      status: initialStatus,
      createdAt: new Date().toISOString(),
      shippingCharge: activeFreightCharge,
      ...(notes ? { notes } : {}),
      ...(ownTransport !== undefined ? { ownTransport } : {}),
      ...(deliveryAddress ? { deliveryAddress } : {})
    };

    // Write to Firestore securely via Admin SDK
    await adminDb.collection('orders').doc(nextId).set(orderData);

    // Deduct stock if auto-approved
    if (initialStatus === "approved" && documentType !== "QUOTE") {
      for (const item of orderItems) {
        const prodRef = adminDb.collection('products').doc(item.productId);
        const pSnap = await prodRef.get();
        if (pSnap.exists) {
          const currentStock = pSnap.data().stock || 0;
          await prodRef.update({ stock: Math.max(0, currentStock - item.qty) });
        }
      }
    }

    res.json({ success: true, order: orderData });
  } catch (err) {
    console.error("Server Checkout Error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to process checkout" });
  }
});

// Endpoint to update order shipping charges and credit adjustments
app.post('/api/orders/:orderId/shipping', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shippingCharge = 0, creditAdjustment = 0 } = req.body;

    if (!adminDb) {
      return res.status(500).json({ success: false, error: "Database service unavailable on server." });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: "Order not found." });
    }

    const orderData = orderSnap.data();
    const rawSubtotal = Number(orderData.items.reduce((acc, item) => acc + (item.totalLineAmount || 0), 0).toFixed(2));
    const parsedShipping = Number(shippingCharge) || 0;
    const parsedCredit = Number(creditAdjustment) || 0;
    const taxableAmount = Math.max(0, rawSubtotal + parsedShipping - parsedCredit);
    const newGst = Number((taxableAmount * 0.10).toFixed(2));
    const newTotal = Number((taxableAmount + newGst).toFixed(2));

    const updates = {
      shippingCharge: parsedShipping,
      creditAdjustment: parsedCredit,
      gstAmount: newGst,
      totalAmount: newTotal,
      shippingReviewRequested: false
    };

    if (orderData.documentType === "QUOTE" && (orderData.status === "quote_requested" || orderData.status === "pending_approval")) {
      updates.status = "quote_finalized";
    }

    await orderRef.update(updates);
    res.json({ success: true, orderId, updates });
  } catch (err) {
    console.error("Failed to update shipping charge:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to update shipping charge" });
  }
});

// Helper to get Nodemailer Transporter using dynamic Firestore settings with process.env fallback
async function getEmailTransporter() {
  let user = process.env.GMAIL_USER;
  let pass = process.env.GMAIL_APP_PASSWORD;
  let senderName = "Desmo Products Online";

  if (adminDb) {
    try {
      const settingsDoc = await adminDb.collection('settings').doc('company').get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data.gmailUser) user = data.gmailUser;
        if (data.gmailAppPassword) pass = data.gmailAppPassword;
        if (data.emailSenderName) senderName = data.emailSenderName;
      }
    } catch (e) {
      console.warn("Could not read company email settings from Firestore:", e.message);
    }
  }

  if (!user || !pass) {
    throw new Error("SMTP email credentials are not configured. Please set your Google Business Email & App Password in the Admin Panel or environment variables.");
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  return { transporter, from: `"${senderName}" <${user}>` };
}

// Endpoint to send invoices/packing slips via email with PDF attachment
app.post('/api/send-invoice-email', authenticateUser, async (req, res) => {
  const { to, subject, body, pdfBase64, filename } = req.body;
  
  if (!to || !subject || !body) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: 'to', 'subject', or 'body'."
    });
  }

  try {
    const { transporter, from } = await getEmailTransporter();
    const mailOptions = {
      from,
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

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Email sending failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to send Account Welcome & Login / Password Reset Instructions
app.post('/api/send-welcome-email', authenticateUser, requireAdmin, async (req, res) => {
  const { to, companyName, resetLink } = req.body;

  if (!to) {
    return res.status(400).json({ success: false, error: "Recipient email 'to' is required." });
  }

  try {
    const { transporter, from } = await getEmailTransporter();
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Welcome to Desmo Products B2B Wholesale Portal</h2>
        <p style="color: #334155; line-height: 1.6;">Hello <strong>${companyName || 'Valued Customer'}</strong>,</p>
        <p style="color: #334155; line-height: 1.6;">Your wholesale account portal access has been setup for <strong>${to}</strong>.</p>
        <p style="color: #334155; line-height: 1.6;">To set or update your account password and log into your portal, please click the secure link below:</p>
        <p style="margin: 25px 0;">
          <a href="${resetLink || '#'}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Setup Account Password</a>
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          If you have any questions or require custom product pricing assistance, please reply directly to this email.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to,
      subject: "Your Wholesale Portal Account Setup & Login Details",
      html: htmlBody
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Welcome email failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to send Promotional Deals & Broadcast Emails
app.post('/api/send-broadcast-email', authenticateUser, requireAdmin, async (req, res) => {
  const { recipients, subject, body, dealTitle } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !body) {
    return res.status(400).json({ success: false, error: "Missing required fields: 'recipients' (array), 'subject', or 'body'." });
  }

  try {
    const { transporter, from } = await getEmailTransporter();
    let sentCount = 0;
    const errors = [];

    for (const email of recipients) {
      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            ${dealTitle ? `<div style="background-color: #f59e0b; color: #0f172a; text-transform: uppercase; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; display: inline-block; margin-bottom: 12px;">Special Offer</div>` : ''}
            <h2 style="color: #0f172a; margin-top: 0;">${subject}</h2>
            <div style="color: #334155; line-height: 1.6; whitespace: pre-wrap;">${body}</div>
            <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
              <a href="https://desmoproductsonline.firebaseapp.com" style="color: #2563eb; font-weight: bold; text-decoration: none;">Log in to Desmo Products Portal to place your order &rarr;</a>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from,
          to: email,
          subject,
          html: htmlBody
        });
        sentCount++;
      } catch (err) {
        errors.push(`${email}: ${err.message}`);
      }
    }

    res.json({ success: true, sentCount, total: recipients.length, errors });
  } catch (error) {
    console.error("Broadcast email failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Catch-all route to serve the React app for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
