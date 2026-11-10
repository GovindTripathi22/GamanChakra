import jsPDF from "jspdf";
import { ClaimCase } from "@/types/claim";
import { getIncidentTypeLabel, getMissingEvidence } from "./checklist";

const cleanText = (text: string | undefined | null): string => {
  if (!text) return "";
  return text
    .replace(/[→➔➜➝]/g, " -> ")
    .replace(/[•●]/g, "-")
    .replace(/₹/g, "Rs. ")
    .replace(/€/g, "EUR ")
    .replace(/£/g, "GBP ")
    .replace(/[^\x20-\x7E\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export interface GenerateClaimPdfOptions {
  claim: ClaimCase;
  destination: string;
  tripTitle?: string;
  tripDates?: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Generates an insurer-ready Claim Summary PDF containing the incident timeline,
 * category-specific evidence checklist, missing items alert, and IRDAI disclaimers.
 */
export function generateClaimSummaryPdf({
  claim,
  destination,
  tripTitle,
  tripDates,
}: GenerateClaimPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("VOYAGE MISSION CONTROL - TRAVEL CLAIM CASE DOSSIER", margin + 4, y + 9);

  y += 20;

  // Case Title & Reference
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanText(getIncidentTypeLabel(claim.incidentType)), margin, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const dateStr = tripDates?.startDate ? `${tripDates.startDate} - ${tripDates.endDate || ""}` : "Ongoing";
  doc.text(`Journey: ${cleanText(tripTitle || destination)} | Travel Dates: ${dateStr}`, margin, y);

  y += 5;
  doc.text(`Case ID: ${claim.id} | Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`, margin, y);

  y += 9;

  // Prominent Status & IRDAI Warning Box
  doc.setFillColor(claim.isSimulatedDisruption ? 254 : 254, claim.isSimulatedDisruption ? 226 : 243, claim.isSimulatedDisruption ? 226 : 199);
  doc.setDrawColor(claim.isSimulatedDisruption ? 239 : 245, claim.isSimulatedDisruption ? 68 : 158, claim.isSimulatedDisruption ? 68 : 11);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(claim.isSimulatedDisruption ? 185 : 180, claim.isSimulatedDisruption ? 28 : 83, claim.isSimulatedDisruption ? 28 : 9);
  const statusHeading = claim.isSimulatedDisruption
    ? "STATUS: DEMO DISRUPTION (INELIGIBLE AS CLAIM EVIDENCE)"
    : "STATUS: DRAFT DOSSIER (NOT SUBMITTED BY VOYAGE)";
  doc.text(statusHeading, margin + 3, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(claim.isSimulatedDisruption ? 153 : 146, claim.isSimulatedDisruption ? 27 : 64, claim.isSimulatedDisruption ? 27 : 14);
  const warningText = claim.isSimulatedDisruption
    ? "Interactive Demo Notice: This case was prefilled from a simulated disruption demo. Simulated disruptions are ineligible as claim evidence with insurers. For actual claims, official carrier confirmation is mandatory."
    : "IRDAI Notice: IRDAI warns policyholders never to pay fees or scan QR codes promising claim disbursement. " +
      "Voyage prepares documentation for your personal review. Voyage does not determine policy coverage or disburse funds.";
  const wrappedWarning = doc.splitTextToSize(warningText, contentWidth - 6);
  doc.text(wrappedWarning, margin + 3, y + 12);

  y += 28;

  // Metadata Table
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text("Incident Date:", margin + 4, y + 6);
  doc.text("Carrier / Provider:", margin + 55, y + 6);
  doc.text("Insurer:", margin + 115, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(cleanText(claim.incidentDate), margin + 4, y + 12);
  doc.text(cleanText(claim.provider), margin + 55, y + 12);
  const insurerDisplay = claim.policyDetails?.insurerName
    ? `${cleanText(claim.policyDetails.insurerName)} (Ref: ****${claim.policyDetails.policyNumberLast4 || "----"})`
    : "Self-insured / Pending Insurer Selection";
  doc.text(insurerDisplay, margin + 115, y + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Case Status:", margin + 4, y + 18);
  doc.text("Follow-Up Due:", margin + 55, y + 18);
  doc.text("Simulated / Demo:", margin + 115, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(claim.status.replace(/_/g, " ").toUpperCase(), margin + 25, y + 18);
  doc.text(claim.followUpDate || "Not scheduled", margin + 80, y + 18);
  doc.text(claim.isSimulatedDisruption ? "YES (Demo - Ineligible)" : "NO (Real Disruption)", margin + 150, y + 18);

  y += 30;

  // Description / Narrative
  if (claim.description) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Incident Summary", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(cleanText(claim.description), contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 4.5 + 4;
  }

  // Missing Evidence Summary Callout (if any missing)
  const checklist = Array.isArray(claim.evidenceChecklist) ? claim.evidenceChecklist : [];
  const timeline = Array.isArray(claim.incidentTimeline) ? claim.incidentTimeline : [];

  const { missingRequired, totalCollected, totalItems } = getMissingEvidence(checklist);

  if (missingRequired.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(239, 68, 68); // red-500
    doc.roundedRect(margin, y, contentWidth, 14 + missingRequired.length * 4.5, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text(`ATTENTION: ${missingRequired.length} REQUIRED EVIDENCE ITEM(S) MISSING`, margin + 3, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);
    let my = y + 11;
    missingRequired.forEach((item) => {
      const lineText = `- Missing: ${cleanText(item.label)}`;
      const wrapped = doc.splitTextToSize(lineText, contentWidth - 6);
      doc.text(wrapped, margin + 3, my);
      my += wrapped.length * 4;
    });

    y += 18 + missingRequired.length * 4.5;
  }

  // Evidence Checklist Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Evidence Checklist (${totalCollected} of ${totalItems} collected)`, margin, y);
  y += 5;

  checklist.forEach((item) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }

    const isCol = item.collected;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(isCol ? 22 : 185, isCol ? 101 : 28, isCol ? 52 : 28);
    const marker = isCol ? "[COLLECTED]" : item.required ? "[MISSING - REQUIRED]" : "[MISSING - OPTIONAL]";
    const headerLines = doc.splitTextToSize(`${marker} ${cleanText(item.label)}`, contentWidth);
    doc.text(headerLines, margin, y);

    y += headerLines.length * 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const desc = doc.splitTextToSize(cleanText(item.description), contentWidth);
    doc.text(desc, margin, y);
    y += desc.length * 3.5 + 2;
  });

  y += 4;

  // Incident Timeline Section
  if (timeline.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Incident Chronological Timeline", margin, y);
    y += 5;

    timeline.forEach((t) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const titleLines = doc.splitTextToSize(`${cleanText(t.timestamp)} - ${cleanText(t.title)}`, contentWidth);
      doc.text(titleLines, margin, y);

      y += titleLines.length * 3.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const desc = doc.splitTextToSize(cleanText(t.description), contentWidth);
      doc.text(desc, margin, y);
      y += desc.length * 3.5 + 2;
    });
  }

  // Footer & IRDAI Escalation Information
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 20;
  } else {
    y += 6;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Insurer Follow-Up & Regulatory Escalation (IRDAI Bima Bharosa)", margin, y);

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const escalationNote =
    "Under IRDAI guidelines, registered insurers must acknowledge claims and respond within 15 days of document submission. " +
    "If your insurer does not resolve your claim within the mandated turnaround time or rejects it unfairly, you can lodge an escalation via " +
    "IRDAI Bima Bharosa portal: https://bimabharosa.irdai.gov.in/ (Grievance FAQ: https://bimabharosa.irdai.gov.in/Home/FAQ).";
  const escLines = doc.splitTextToSize(escalationNote, contentWidth);
  doc.text(escLines, margin, y);

  return doc;
}
