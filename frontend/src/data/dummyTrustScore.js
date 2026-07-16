export const TRUST_BREAKDOWN = {
  total: 847,
  maxPossible: 1000,
  band: "Highly Trusted",
  lastUpdated: "2025-05-17",
  categories: [
    {
      name: "Identity Layer",
      score: 280,
      max: 300,
      color: "#6C63FF",
      items: [
        { label: "MyKad verified", pts: 150, max: 150, status: "pass" },
        { label: "Face match", pts: 95, max: 100, status: "pass" },
        { label: "Phone verified", pts: 35, max: 50, status: "pass" },
      ]
    },
    {
      name: "Government Layer",
      score: 220,
      max: 250,
      color: "#0DCCB1",
      items: [
        { label: "PADU matched", pts: 78, max: 80, status: "pass" },
        { label: "Semak Mule clear", pts: 90, max: 90, status: "pass" },
        { label: "CCRIS clear", pts: 52, max: 80, status: "pass" },
      ]
    },
    {
      name: "Professional Layer",
      score: 172,
      max: 200,
      color: "#F59E0B",
      items: [
        { label: "MQA degree verified", pts: 100, max: 100, status: "pass" },
        { label: "Employment status", pts: 60, max: 60, status: "pass" },
        { label: "SSM business", pts: 12, max: 40, status: "partial" },
      ]
    },
    {
      name: "Community Layer",
      score: 118,
      max: 150,
      color: "#22C55E",
      items: [
        { label: "Endorsements", pts: 40, max: 50, status: "pass" },
        { label: "Zero scam reports", pts: 60, max: 60, status: "pass" },
        { label: "Account standing", pts: 18, max: 40, status: "partial" },
      ]
    },
    {
      name: "Behaviour Layer",
      score: 57,
      max: 100,
      color: "#EF4444",
      items: [
        { label: "No suspicious transfers", pts: 50, max: 50, status: "pass" },
        { label: "Consistent location", pts: 7, max: 30, status: "partial" },
        { label: "No deepfake uploads", pts: 0, max: 20, status: "pending" },
      ]
    },
  ],
  history: [
    { date: "2025-01", score: 720 },
    { date: "2025-02", score: 755 },
    { date: "2025-03", score: 790 },
    { date: "2025-04", score: 820 },
    { date: "2025-05", score: 847 },
  ]
};
