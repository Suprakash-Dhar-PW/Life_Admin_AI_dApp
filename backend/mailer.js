import nodemailer from "nodemailer";

let transporter;

export function initMailer() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  console.log("📧 Mailer initialized");
  return transporter;
}

export async function sendEmail({ to, subject, html, text, icalEvent }) {
  if (!transporter) initMailer();

  const opts = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  };

  if (icalEvent) {
    opts.icalEvent = {
      filename: 'commitment.ics',
      method: 'request',
      content: icalEvent
    };
  }

  return transporter.sendMail(opts);
}

export function generateICal({ service, start, end, description, url }) {
  const formatDate = (date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const now = formatDate(new Date());

  return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Protocol.Commit//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${Date.now()}@protocol.commit
DTSTAMP:${now}
DTSTART:${formatDate(new Date(start))}
DTEND:${formatDate(new Date(end))}
SUMMARY:${service} (Protocol.Commit)
DESCRIPTION:${description}
URL:${url}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR
`.trim();
}
