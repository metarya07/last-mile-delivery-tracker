package com.lastmile.delivery.service;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromEmail;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:dispatch@lastmiledelivery.com}") String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    public void sendEmail(String recipient, String subject, String message) {
        if (smtpUsername == null || smtpUsername.isBlank() || "none".equalsIgnoreCase(smtpUsername)) {
            logger.warn("Brevo SMTP credentials not configured. Email notification skipped for: {}", recipient);
            logger.info("Email Content Preview -> To: {} | Subject: {} | Content:\n{}", recipient, subject, message);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");

            helper.setFrom(fromEmail);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(message, false);

            mailSender.send(mimeMessage);
            logger.info("Successfully dispatched plain text email notification to {}", recipient);
        } catch (Exception e) {
            logger.error("Failed to send email notification to {}: {}", recipient, e.getMessage(), e);
        }
    }

    public void sendHtmlEmail(String recipient, String subject, String htmlContent) {
        if (smtpUsername == null || smtpUsername.isBlank() || "none".equalsIgnoreCase(smtpUsername)) {
            logger.warn("Brevo SMTP credentials not configured. HTML email skipped for: {}", recipient);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "utf-8");

            helper.setFrom(fromEmail);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            logger.info("Successfully dispatched rich HTML email notification to {}", recipient);
        } catch (Exception e) {
            logger.error("Failed to send HTML email notification to {}: {}", recipient, e.getMessage(), e);
        }
    }

    /**
     * Send beautifully styled OTP Verification Email
     */
    public void sendPasswordResetOtpEmail(String recipient, String userName, String otp) {
        String subject = "🔒 Your Password Reset Code - Last Mile Delivery Tracker";
        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset OTP</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #112622;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="table-layout: fixed; background-color: #f4f7f6; padding: 40px 10px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8e5; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 61, 54, 0.05);">
                      <!-- Brand Header -->
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #0f3d36 0%%, #164e45 100%%); padding: 32px 24px; text-align: center;">
                          <div style="display: inline-block; width: 44px; height: 44px; background: rgba(255, 255, 255, 0.12); border-radius: 8px; line-height: 44px; font-size: 24px; text-align: center; margin-bottom: 8px;">🚚</div>
                          <h1 style="margin: 0; font-size: 19px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">LAST MILE DELIVERY</h1>
                          <p style="margin: 4px 0 0; font-size: 11px; font-weight: 600; color: #d97706; text-transform: uppercase; letter-spacing: 1px;">Security & Account Verification</p>
                        </td>
                      </tr>
                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 32px 28px;">
                          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #112622;">Hello <strong>%s</strong>,</p>
                          <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #526b65;">
                            We received a request to reset your password for your Last Mile Delivery Tracker account. Use the one-time verification code below to proceed:
                          </p>
                          
                          <!-- OTP Box -->
                          <div style="background: #f0f7f5; border: 2px dashed #0f3d36; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                            <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0f3d36; margin-bottom: 6px;">Your 6-Digit Verification Code</span>
                            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0f3d36; margin-left: 10px;">%s</span>
                          </div>

                          <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin-top: 18px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 14px;">
                            <tr>
                              <td style="font-size: 12px; color: #b45309; line-height: 1.5;">
                                ⏱️ <strong>Valid for 10 minutes.</strong> Never share this code with anyone. If you didn't request a password reset, you can safely ignore this email.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8faf9; border-top: 1px solid #edf2f0; padding: 20px 24px; text-align: center;">
                          <p style="margin: 0; font-size: 12px; color: #819b95;">
                            © %d Last Mile Delivery Operations Desk. All rights reserved.
                          </p>
                          <p style="margin: 4px 0 0; font-size: 11px; color: #819b95;">
                            Automated security dispatch notification.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                userName != null ? userName : "Valued User",
                otp,
                java.time.Year.now().getValue()
            );

        sendHtmlEmail(recipient, subject, html);
    }

    /**
     * Send Order Confirmation Email
     */
    public void sendOrderConfirmationEmail(
            String recipient,
            String userName,
            Long orderId,
            String pickupAddress,
            String dropAddress,
            String orderType,
            BigDecimal finalCharge) {

        String subject = "📦 Order #" + orderId + " Confirmed - Last Mile Delivery Tracker";
        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Order Confirmation</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #112622;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f4f7f6; padding: 40px 10px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8e5; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 61, 54, 0.05);">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #0f3d36 0%%, #164e45 100%%); padding: 28px 24px; text-align: center;">
                          <h1 style="margin: 0; font-size: 19px; font-weight: 700; color: #ffffff;">Order Placed Successfully!</h1>
                          <p style="margin: 4px 0 0; font-size: 12px; color: #d97706; font-weight: 600; text-transform: uppercase;">Booking Reference #%d</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 28px 24px;">
                          <p style="margin: 0 0 16px; font-size: 14.5px;">Hello <strong>%s</strong>,</p>
                          <p style="margin: 0 0 20px; font-size: 13.5px; color: #526b65;">
                            Your shipment has been registered in the dispatch queue. A delivery partner will be allocated shortly.
                          </p>

                          <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f8faf9; border: 1px solid #e2e8e5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                            <tr>
                              <td style="font-size: 12px; color: #526b65; padding-bottom: 8px;"><strong>Pickup:</strong> %s</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; color: #526b65; padding-bottom: 8px;"><strong>Destination:</strong> %s</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; color: #526b65;"><strong>Total Fare:</strong> ₹%s (%s)</td>
                            </tr>
                          </table>

                          <div style="text-align: center; margin-top: 24px;">
                            <a href="https://last-mile-delivery-11622.vercel.app" style="display: inline-block; background-color: #0f3d36; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                              Track Delivery Live
                            </a>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #f8faf9; border-top: 1px solid #edf2f0; padding: 16px 24px; text-align: center;">
                          <p style="margin: 0; font-size: 11.5px; color: #819b95;">© %d Last Mile Delivery Tracker.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                orderId,
                userName != null ? userName : "Customer",
                pickupAddress,
                dropAddress,
                finalCharge != null ? finalCharge.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() : "0.00",
                orderType,
                java.time.Year.now().getValue()
            );

        sendHtmlEmail(recipient, subject, html);
    }
}