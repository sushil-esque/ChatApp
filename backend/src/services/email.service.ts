// import nodemailer from 'nodemailer';
// import { Resend } from 'resend'
// import sgMail from "@sendgrid/mail";

import config from '../config/config.js'

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': config.brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'GuffVerse',
          email: config.senderEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html ?? `<p>${text}</p>`,
        textContent: text,
      }),
    })

    const data = await response.json() as {
      code: number
      message: string
      messageId: string
    }

    if (!response.ok) {
      console.error('Brevo error:', data)
      return false  // ← return false on failure
    }
  
    console.log('Email sent successfully:', data.messageId)
    return true  // ← return true on success
  } catch (error) {
    console.error('Error sending email:', error)
    return false  // ← return false on exception
  }
}
// sgMail.setApiKey(config.sendgridApiKey);
// console.log("SendGrid API key:", config.sendgridApiKey.slice(0, 10));

// export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
//   try {
//     await sgMail.send({
//       to,
//       from: "GuffVerse <[EMAIL_ADDRESS]>", // must be verified sender
//       subject,
//       text,
//       html: html ?? text,
//     });
//     console.log("Email sent successfully");
//     return true;
//   } catch (error: any) {
//     console.log("error", error)
//     console.error("Error sending email:", error.response?.body);
//     return false;
//   }
// };
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     type: 'OAuth2',
//     user: config.googleConfig.googleUser,
//     clientId: config.googleConfig.googleClientId,
//     clientSecret: config.googleConfig.googleClientSecret,
//     refreshToken: config.googleConfig.googleRefreshToken
//   }
// });

// // Verify the connection configuration
// transporter.verify((error: unknown) => {
//   if (error) {
//     console.error('Error connecting to email server:', error);
//   } else {
//     console.log('Email server is ready to send messages');
//   }
// });

// // Function to send email
// export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
//   try {
//     const info = await transporter.sendMail({
//       from: `"Your Name" <${config.googleConfig.googleUser}>`, // sender address
//       to, // list of receivers
//       subject, // Subject line
//       text, // plain text body
//       html, // html body
//     });

//     console.log('Message sent: %s', info.messageId);
//     console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
//   } catch (error) {
//     console.error('Error sending email:', error);
//   }
// };

// const resend = new Resend(config.resendApiKey)

// export const sendEmail = async (
//   to: string,
//   subject: string,
//   text: string,
//   html?: string
// ) => {
//   try {
//     const { data, error } = await resend.emails.send({
//       from: 'GuffVerse <onboarding@resend.dev>',
//       to,
//       subject,
//       text,
//       html: html ?? text,
//     })

//     if (error) {
//       console.error('Error sending email:', error)
//       return
//     }

//     console.log('Message sent:', data?.id)
//   } catch (error) {
//     console.error('Error sending email:', error)
//   }
// }
