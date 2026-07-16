export const GOV_CHECKS = [
  { id: "jpj", name: "JPJ / NRD", label: "MyKad Identity", status: "verified", time: "1.2s", detail: "Name and IC match confirmed" },
  { id: "padu", name: "PADU", label: "Citizen Profile", status: "verified", time: "0.8s", detail: "Household data matched" },
  { id: "semakmule", name: "Semak Mule", label: "Scam Mule Check", status: "clear", time: "0.5s", detail: "No records found — clean" },
  { id: "mcmc", name: "MCMC", label: "Phone Ownership", status: "verified", time: "0.9s", detail: "Number registered to IC" },
  { id: "bnm", name: "BNM / CCRIS", label: "Financial Standing", status: "clear", time: "1.4s", detail: "No fraud flags detected" },
  { id: "ssm", name: "SSM", label: "Business Registry", status: "skipped", time: "-", detail: "Not applicable (not a business)" },
  { id: "lhdn", name: "LHDN", label: "Employment Status", status: "verified", time: "1.1s", detail: "Active employment confirmed" },
  { id: "mqa", name: "MQA", label: "Qualifications", status: "verified", time: "0.7s", detail: "Degree from UTM verified" },
];
