export const AI_INSIGHTS = [
  {
    id: "INS001",
    title: "Deepfake surge in Klang Valley",
    body: "DJAGA detected a 340% increase in deepfake video calls targeting residents in KL City Centre and Petaling Jaya over the past 72 hours. Victims report receiving WhatsApp calls from AI-generated faces claiming to be family members or bank officers.",
    severity: "critical",
    confidence: 94,
    affectedArea: "Kuala Lumpur, Selangor",
    affectedCount: 1240,
    trend: "rising",
    generatedAt: new Date(Date.now() - 8 * 60000),
    tags: ["deepfake", "klang-valley", "whatsapp"],
    recommendation: "Do not answer video calls from unknown numbers. Ask callers to prove identity via a separate channel."
  },
  {
    id: "INS002",
    title: "Investment scam network identified",
    body: "Pattern analysis has linked 47 separate reports across Penang and Johor to a single organised scam network. The group operates WhatsApp groups promising 15-30% monthly returns on cryptocurrency. DJAGA has flagged 23 phone numbers associated with this network.",
    severity: "high",
    confidence: 88,
    affectedArea: "Penang, Johor Bahru",
    affectedCount: 560,
    trend: "stable",
    generatedAt: new Date(Date.now() - 23 * 60000),
    tags: ["investment", "crypto", "organised-crime"],
    recommendation: "Report any guaranteed return investment offers immediately to Semak Mule and PDRM."
  },
  {
    id: "INS003",
    title: "PDRM impersonation spike in Ipoh",
    body: "Macau scam calls impersonating PDRM officers have increased by 180% in Ipoh and surrounding Perak districts this week. Scammers claim victims are linked to drug trafficking cases and demand RM2,000–RM8,000 in 'bail money'. All calls show spoofed Malaysian government numbers.",
    severity: "high",
    confidence: 91,
    affectedArea: "Ipoh, Perak",
    affectedCount: 340,
    trend: "rising",
    generatedAt: new Date(Date.now() - 45 * 60000),
    tags: ["macau-scam", "pdrm-impersonation", "perak"],
    recommendation: "PDRM never calls to demand money. Hang up immediately. Call PDRM at 999 to verify."
  },
  {
    id: "INS004",
    title: "New phishing domain cluster detected",
    body: "DJAGA's scraper engine identified 12 new malicious domains registered in the past 48 hours mimicking Maybank2U, CIMB Clicks, and Touch 'n Go eWallet login pages. These domains are being distributed via SMS and Telegram. Users in Selangor and KL are primary targets.",
    severity: "high",
    confidence: 96,
    affectedArea: "Nationwide",
    affectedCount: 2100,
    trend: "rising",
    generatedAt: new Date(Date.now() - 2 * 3600000),
    tags: ["phishing", "banking", "sms"],
    recommendation: "Always verify URLs before entering banking credentials. Bookmark your bank's official website."
  },
  {
    id: "INS005",
    title: "Fake job scam targeting fresh graduates",
    body: "A coordinated fake job scam is targeting recent university graduates across KL and Selangor. Victims are offered RM3,000–RM5,000 monthly work-from-home positions and asked to pay RM300–RM500 in 'registration fees'. DJAGA has identified 8 unique scam job portals.",
    severity: "medium",
    confidence: 82,
    affectedArea: "KL, Selangor",
    affectedCount: 890,
    trend: "stable",
    generatedAt: new Date(Date.now() - 5 * 3600000),
    tags: ["job-scam", "graduates", "work-from-home"],
    recommendation: "Legitimate employers never ask for upfront fees. Verify company registration at SSM."
  },
  {
    id: "INS006",
    title: "Sabah romance scam network active",
    body: "Kota Kinabalu has seen a 220% increase in romance scam reports this month. Scammers establish online relationships over 2-4 weeks before requesting money for 'emergencies'. DJAGA analysis shows most accounts use stolen profile photos from social media.",
    severity: "medium",
    confidence: 79,
    affectedArea: "Kota Kinabalu, Sandakan",
    affectedCount: 210,
    trend: "rising",
    generatedAt: new Date(Date.now() - 8 * 3600000),
    tags: ["romance-scam", "sabah", "social-media"],
    recommendation: "Reverse image search profile photos. Never send money to someone you have not met in person."
  },
];

// Real-time statistics (mock)
export const LIVE_STATS = {
  totalReportsToday: 847,
  activeAlerts: 23,
  newSinceYesterday: 134,
  mostAffectedCity: "Kuala Lumpur",
  topScamType: "macau",
  aiScansToday: 3241,
};
