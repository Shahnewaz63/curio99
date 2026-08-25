import nodemailer from "nodemailer";

// Define the shape of customer and order data
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * 1. Email sent when an order is successfully placed
 */
export async function sendOrderPlacedEmail(data: OrderNotificationData) {
  const { orderId, trackingId, customerName, customerEmail, phone, shippingAddress, items, totalAmount } = data;

const trackingUrl = `https://curio.bd/track?orderId=${orderId}&phone=${encodeURIComponent(phone)}`;

  const itemsListHtml = items && items.length > 0
    ? items.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name} (x${item.quantity})</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳${item.price * item.quantity}</td>
        </tr>
      `).join("")
    : "";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
      <h2 style="color: #2563eb; margin-top: 0;">Order Confirmed!</h2>
      <p>Hello <strong>${customerName}</strong>,</p>
      <p>Thank you for choosing <strong>Curio</strong>. We have received your request and are processing it now.</p>
      
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Order ID:</strong> #${orderId}</p>
        <p style="margin: 4px 0;"><strong>Tracking ID:</strong> <span style="color: #2563eb; font-weight: bold;">${trackingId}</span></p>
        <p style="margin: 4px 0;"><strong>Track Status:</strong> <a href="${trackingUrl}" style="color: #2563eb;">Track Here</a></p>
      </div>

      <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Customer & Delivery Details</h3>
      <p style="margin: 4px 0;"><strong>Name:</strong> ${customerName}</p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${customerEmail}</p>
      ${phone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${phone}</p>` : ""}
      ${shippingAddress ? `<p style="margin: 4px 0;"><strong>Delivery Address:</strong> ${shippingAddress}</p>` : ""}

      ${itemsListHtml ? `
        <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 24px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="padding: 8px;">Item</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>
      ` : ""}

      ${totalAmount ? `<p style="font-size: 16px; text-align: right;"><strong>Total: ৳${totalAmount}</strong></p>` : ""}

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        If you have any questions, contact us at <a href="mailto:admin.curiobd@gmail.com">admin.curiobd@gmail.com</a>.
      </p>
    </div>
  `;

  return transporter.sendMail({
    from: `"Curio" <admin.curiobd@gmail.com>`,
    to: customerEmail,
    subject: `Order Confirmation #${orderId} - Tracking ID: ${trackingId}`,
    text: `Hello ${customerName}, your order #${orderId} is confirmed. Track it here: https://curio.bd/track?orderId=${orderId}&phone=${phone}`,
    html: htmlContent,
  });
}

/**
 * 2. Email sent when order status changes to "Delivered"
 */
export async function sendOrderDeliveredEmail(data: OrderNotificationData) {
  const { orderId, trackingId, customerName, customerEmail, shippingAddress } = data;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
      <h2 style="color: #16a34a; margin-top: 0;">Your Order Has Been Delivered!</h2>
      <p>Hello <strong>${customerName}</strong>,</p>
      <p>Great news! Your service/product order <strong>#${orderId}</strong> has been successfully delivered.</p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Tracking ID:</strong> ${trackingId}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Delivered</span></p>
        ${shippingAddress ? `<p style="margin: 4px 0;"><strong>Delivered To:</strong> ${shippingAddress}</p>` : ""}
      </div>

      <p>Thank you for partnering with <strong>Curio</strong>. If you need further technical assistance or have questions about your service, please let us know.</p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        Need help? Contact <a href="mailto:admin.curiobd@gmail.com">admin.curiobd@gmail.com</a>
      </p>
    </div>
  `;

  return transporter.sendMail({
    from: `"Curio" <admin.curiobd@gmail.com>`,
    to: customerEmail,
    subject: `Delivered: Order #${orderId} (Tracking ID: ${trackingId})`,
    html: htmlContent,
  });
}