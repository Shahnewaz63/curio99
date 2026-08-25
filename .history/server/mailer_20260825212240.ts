import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOrderEmail(to: string, orderId: string, status: "placed" | "delivered") {
  const isPlaced = status === "placed";
  
  await transporter.sendMail({
    from: `"Curio Tech" <${process.env.GMAIL_USER}>`,
    to,
    subject: isPlaced ? `Order Confirmed - #${orderId}` : `Order Delivered - #${orderId}`,
    html: `
      <h2>${isPlaced ? "Thank you for your order!" : "Your order has been delivered!"}</h2>
      <p>Order ID: <strong>${orderId}</strong></p>
      <p>${isPlaced ? "We are processing your technology service request." : "Your package/service is marked as completed."}</p>
    `,
  });
}