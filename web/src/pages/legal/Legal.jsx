// web/src/pages/legal/Legal.jsx

import { Link } from "react-router-dom";

const DOCS = {
  privacy: {
    title: "Privacy Policy",
    updated: "August 2026",
    body: [
      ["What we collect",
        "Account info (name, email, hashed password, optional UPI ID for reference only — SplitEase never processes payments), the expense/group data you enter, a push notification token, and technical request metadata like your IP address."],
      ["Signup security data",
        "When you create an account, we log the signup IP and derive an approximate city/region/country from it for abuse and fraud monitoring. This is not GPS or device location — we never request or access your device's precise location — and it isn't shown to other users."],
      ["Why we collect it",
        "To create and secure your account, run the app's core functionality, and detect abusive signups. We don't sell your data or use it for advertising."],
      ["Who we share it with",
        "Brevo (verification/reset emails), Expo (push notifications), and our hosting/database providers — each sees only what's necessary to do their job. Group members see your name, shared expenses, and your UPI ID if you added one — never your email, password, IP, or location data."],
      ["Your choices",
        "Update your profile anytime in the app. Use \"Reset my data\" to clear your expense/group history. Email us to request full account deletion."],
      ["Contact",
        "sabihul2005@gmail.com"],
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "August 2026",
    body: [
      ["What SplitEase is",
        "A tool for tracking shared expenses and who owes whom. SplitEase does not process, hold, or transfer money — any UPI ID shown is provided by users for their own convenience, and settlements happen entirely outside the app."],
      ["Your account",
        "You must provide a real, working email — verification depends on it. Don't create accounts using someone else's email without their knowledge, or impersonate another person."],
      ["Acceptable use",
        "Don't use SplitEase to defraud or mislead other users about money owed, bypass verification or rate limits, or interfere with normal operation."],
      ["Financial disclaimer",
        "SplitEase is a record-keeping tool, not a financial service. We're not responsible for disputes over whether a debt was actually paid — settle-up records reflect what users choose to enter."],
      ["No warranty / liability",
        "Provided \"as is,\" in active development, without guarantee of being error-free. To the extent permitted by law, we're not liable for indirect or consequential damages, including disputes between users."],
      ["Governing law",
        "These terms are governed by the laws of India."],
      ["Contact",
        "sabihul2005@gmail.com"],
    ],
  },
};

export default function Legal({ doc }) {
  const d = DOCS[doc];
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px" }}>
      <Link to="/signup" style={{ fontSize: 13, color: "var(--text3)" }}>← Back</Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "16px 0 4px" }}>{d.title}</h1>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 28 }}>Last updated: {d.updated}</div>
      {d.body.map(([heading, text]) => (
        <div key={heading} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{heading}</div>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>{text}</p>
        </div>
      ))}
    </div>
  );
}