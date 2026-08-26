import nodemailer from "nodemailer";

export interface OrderNotificationData {
  orderId: string;
  trackingId: string;
  customerName: string;
  customerEmail: string;
  phone?: string;
  shippingAddress?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  totalAmount?: number;
}

// Brevo SMTP Transporter Setup
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("[Nodemailer] Brevo SMTP Connection Error:", error);
  } else {
    console.log("[Nodemailer] Brevo SMTP Server is ready to send messages");
  }
});

// Helper configuration helpers
const getBaseUrl = () => process.env.APP_URL || "https://curio.bd";
const getSender = () => `"Curio" <${process.env.SENDER_EMAIL || process.env.BREVO_SMTP_USER}>`;
const getSupportEmail = () => "info.curiobd@gmail.com";

/**
 * 1. Email sent when an order is successfully placed
 */
export async function sendOrderPlacedEmail(data: OrderNotificationData) {
  const { orderId, trackingId, customerName, customerEmail, phone, shippingAddress, items, totalAmount } = data;
  const trackingUrl = `${getBaseUrl()}/track?orderId=${orderId}&phone=${encodeURIComponent(phone || "")}`;
  const supportEmail = getSupportEmail();
  const logoUrl = `${getBaseUrl()}/logo.png`;

  const itemsListHtml = items && items.length > 0
    ? items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px;">${item.name} <span style="color: #64748b;">(x${item.quantity})</span></td>
          <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; text-align: right; font-weight: bold;">৳${item.price * item.quantity}</td>
        </tr>
      `).join("")
    : "";

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-sizing: border-box;">
      
      <!-- Logo Header -->
      <div style="text-align: left; margin-bottom: 24px;">
        <img src="${logoUrl}" alt="Curio Logo" style="height: 36px; width: auto; max-width: 180px; display: block;" />
      </div>

      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Order Confirmed!</h2>
      <p style="font-size: 15px; line-height: 1.5; color: #334155; margin-top: 0;">Hello <strong>${customerName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.5; color: #334155;">Thank you for your order with <strong>Curio</strong>. We have received your order details and are preparing it for dispatch.</p>

      <!-- Order Tracking Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 24px 0;">
        <p style="margin: 4px 0; font-size: 14px;"><strong>Order ID:</strong> #${orderId}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Tracking ID:</strong> <span style="color: #2563eb; font-weight: 600;">${trackingId}</span></p>
        <p style="margin: 12px 0 4px 0; font-size: 14px;">
          <a href="${trackingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 8px 16px; border-radius: 4px; font-size: 13px;">Track Order Status →</a>
        </p>
      </div>

      <!-- Customer & Delivery Details -->
      <h3 style="font-size: 16px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px;">Delivery Information</h3>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Name:</strong> ${customerName}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Email:</strong> ${customerEmail}</p>
      ${phone ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Phone:</strong> ${phone}</p>` : ""}
      ${shippingAddress ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Delivery Address:</strong> ${shippingAddress}</p>` : ""}

      <!-- Order Summary -->
      ${itemsListHtml ? `
        <h3 style="font-size: 16px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f8fafc; text-align: left;">
              <th style="padding: 8px 10px; font-size: 13px; color: #475569;">Item</th>
              <th style="padding: 8px 10px; font-size: 13px; color: #475569; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>
      ` : ""}

      ${totalAmount ? `<p style="font-size: 16px; text-align: right; margin-top: 16px;"><strong>Total: ৳${totalAmount}</strong></p>` : ""}

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
        Need help with your order? Reply directly to this email or contact us at <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none;">${supportEmail}</a>.
      </p>
    </div>
  `;

  return transporter.sendMail({
    from: getSender(),
    to: customerEmail,
    subject: `Order Confirmation #${orderId}`,
    text: `Hello ${customerName}, your order #${orderId} is confirmed. Track status here: ${trackingUrl}`,
    html: htmlContent,
    headers: {
      "X-Entity-Ref-ID": orderId,
      "Importance": "high",
      "X-Priority": "1",
    },
  });
}

/**
 * 2. Email sent when order status changes to "Delivered"
 */
export async function sendOrderDeliveredEmail(data: OrderNotificationData) {
  const { orderId, trackingId, customerName, customerEmail, phone, shippingAddress } = data;
  const trackingUrl = `${getBaseUrl()}/track?orderId=${orderId}&phone=${encodeURIComponent(phone || "")}`;
  const supportEmail = getSupportEmail();
  const logoUrl = `${getBaseUrl()}/logo.png`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-sizing: border-box;">
      
      <!-- Logo Header -->
      <div style="text-align: left; margin-bottom: 24px;">
        <img src="${logoUrl}" alt="Curio Logo" style="height: 36px; width: auto; max-width: 180px; display: block;" />
      </div>

      <h2 style="color: #16a34a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Order Delivered!</h2>
      <p style="font-size: 15px; line-height: 1.5; color: #334155; margin-top: 0;">Hello <strong>${customerName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.5; color: #334155;">Great news! Your package for order <strong>#${orderId}</strong> has been successfully delivered.</p>

      <!-- Status Box -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 24px 0;">
        <p style="margin: 4px 0; font-size: 14px;"><strong>Tracking ID:</strong> ${trackingId}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: 700;">Delivered</span></p>
        ${shippingAddress ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Delivered To:</strong> ${shippingAddress}</p>` : ""}
      </div>

      <p style="font-size: 15px; line-height: 1.5; color: #334155;">Thank you for shopping with <strong>Curio</strong>. We hope you enjoy your purchase!</p>

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
        Questions or feedback? Reach out to <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none;">${supportEmail}</a>.
      </p>
    </div>
  `;

  return transporter.sendMail({
    from: getSender(),
    to: customerEmail,
    subject: `Delivered: Order #${orderId}`,
    text: `Hello ${customerName}, your order #${orderId} has been delivered. View tracking details: ${trackingUrl}`,
    html: htmlContent,
    headers: {
      "X-Entity-Ref-ID": orderId,
      "Importance": "high",
      "X-Priority": "1",
    },
  });
}