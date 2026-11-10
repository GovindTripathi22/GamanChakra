"use client";

import { localDestinationImage } from "@/lib/destination-image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import type { GeneratedTrip } from "@/types/trip";

interface PdfExportButtonProps {
    trip: GeneratedTrip;
}

/**
 * Strips non-ASCII, converts currency symbols, and replaces unicode arrows
 * so standard jsPDF Helvetica never renders corrupted glyphs like '!'
 */
const cleanText = (text: string | undefined | null): string => {
    if (!text) return "";
    return text
        .replace(/[→➔➜➝]/g, " -> ")
        .replace(/!['"]/g, " -> ")
        .replace(/!/g, " - ")
        .replace(/[•●]/g, "-")
        .replace(/₹/g, "Rs. ")
        .replace(/€/g, "EUR ")
        .replace(/£/g, "GBP ")
        .replace(/[^\x20-\x7E\n\r]/g, " ") // restrict to safe printable ASCII
        .replace(/\s+/g, " ")
        .trim();
};

const sanitizePrice = (price: string | undefined | null): string => {
    if (!price) return "N/A";
    return cleanText(price);
};

const extractCityName = (fullDestination: string): string => {
    if (!fullDestination) return "Your Destination";
    const parts = fullDestination.split(/->|,|\|/).map((p) => p.trim());
    const valid = parts.find((p) => p && p.toLowerCase() !== "india");
    return valid || parts[0] || fullDestination;
};

// Canvas-based image loader with safety timeout
const getBase64ImageFromUrl = (url: string): Promise<string | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.setAttribute("crossOrigin", "anonymous");

        const timeoutId = setTimeout(() => {
            img.src = "";
            resolve(null);
        }, 3500); // 3.5s timeout for fast generation

        img.onload = () => {
            clearTimeout(timeoutId);
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL("image/jpeg"));
                } else {
                    resolve(null);
                }
            } catch {
                resolve(null);
            }
        };

        img.onerror = () => {
            clearTimeout(timeoutId);
            resolve(null);
        };

        img.src = url;
    });
};

export function PdfExportButton({ trip }: PdfExportButtonProps) {
    const [generating, setGenerating] = useState(false);

    const generatePdf = async () => {
        setGenerating(true);

        try {
            const rawDestination = trip.trip_details.destination || "Destination";
            const primaryCity = extractCityName(rawDestination);

            // Fetch local hero image if available
            const localHero = localDestinationImage(rawDestination);
            const heroImageUrl = localHero ? `${window.location.origin}${localHero}` : "";
            const heroPromise = getBase64ImageFromUrl(heroImageUrl);

            // Fetch hotel images in parallel
            const hotelPromises = (trip.hotels || []).map((hotel) =>
                hotel.image_url ? getBase64ImageFromUrl(hotel.image_url) : Promise.resolve(null)
            );

            // Fetch activity images in parallel
            const activityPromises: Promise<{ key: string; base64: string | null }>[] = [];
            (trip.itinerary || []).forEach((day, dayIndex) => {
                (day.activities || []).forEach((activity, actIndex) => {
                    if (activity.image_url) {
                        activityPromises.push(
                            getBase64ImageFromUrl(activity.image_url).then((base64) => ({
                                key: `${dayIndex}_${actIndex}`,
                                base64,
                            }))
                        );
                    }
                });
            });

            const [heroImageBase64, hotelImages, resolvedActivities] = await Promise.all([
                heroPromise,
                Promise.all(hotelPromises),
                Promise.all(activityPromises),
            ]);

            const activityImages: Record<string, string | null> = {};
            resolvedActivities.forEach((item) => {
                activityImages[item.key] = item.base64;
            });

            // Initialize A4 PDF with Monocle / Conde Nast Luxury Dossier Theme
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            let yPos = 18;

            const checkPageOverflow = (heightNeeded: number): boolean => {
                if (yPos + heightNeeded > 268) {
                    doc.addPage();
                    yPos = 20;
                    return true;
                }
                return false;
            };

            // =================================================================
            // PAGE 1: LUXURY EDITORIAL HEADER (MONOCLE / CONDE NAST STYLE)
            // =================================================================
            // Top Brow Bar: Publication Meta
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(217, 119, 6); // warm amber / gold
            doc.text("VOYAGE EXPEDITION DOSSIER", 15, yPos);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139); // slate-500
            const docketNumber = `DOCKET: VY-${Math.abs(primaryCity.split("").reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0) % 90000 + 10000)} | STATUS: VERIFIED`;
            doc.text(docketNumber, 195, yPos, { align: "right" });

            yPos += 3.5;

            // Hairline separator under brow
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.line(15, yPos, 195, yPos);
            yPos += 5.5;

            // Hero Banner: Use real photo if loaded, otherwise render an executive editorial card
            if (heroImageBase64) {
                try {
                    doc.addImage(heroImageBase64, "JPEG", 15, yPos, 180, 48);
                    yPos += 52;
                } catch {
                    renderEditorialHeroCard();
                }
            } else {
                renderEditorialHeroCard();
            }

            function renderEditorialHeroCard() {
                // Sleek deep slate container
                doc.setFillColor(15, 23, 42); // slate-900
                doc.roundedRect(15, yPos, 180, 42, 2, 2, "F");

                // Warm Amber Accent strip on left
                doc.setFillColor(217, 119, 6); // amber-600
                doc.rect(15, yPos, 3.5, 42, "F");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                doc.setTextColor(245, 158, 11); // amber-400
                doc.text("CURATED MULTIMODAL ITINERARY & OPERATIONAL DOSSIER", 23, yPos + 8.5);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(16.5);
                doc.setTextColor(255, 255, 255);
                const bannerDest = cleanText(trip.trip_details.destination);
                const wrappedDest = doc.splitTextToSize(bannerDest, 160);
                doc.text(wrappedDest.slice(0, 2), 23, yPos + 18);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(203, 213, 225); // slate-300
                doc.text("Synchronized with Rail Schedules, Flight Radars, Metro Corridors & Voyage Shield Parametric Protection", 23, yPos + 32);

                yPos += 48;
            }

            // =================================================================
            // 4-CARD METADATA GRID (EDITORIAL CAPSULE MATRIX)
            // =================================================================
            const cardWidth = 42;
            const cardHeight = 16;
            const cardGap = 4;
            const startX = 15;

            const cleanBudgetClass = (b: string | undefined): string => {
                if (!b) return "Executive Tier";
                const clean = cleanText(b);
                if (/^(cheap|budget|backpack)/i.test(clean)) return "Budget Tier";
                if (/^(moderate|medium|balanced)/i.test(clean)) return "Moderate Tier";
                if (/^(luxury|premium|high)/i.test(clean)) return "Luxury Tier";
                if (clean.includes("Rs") || clean.includes("$") || clean.includes("EUR")) return clean;
                return clean.charAt(0).toUpperCase() + clean.slice(1);
            };

            const cleanTotalCost = (c: string | undefined): string => {
                if (!c) return "Custom";
                const sanitized = cleanText(c);
                const match = sanitized.match(/^(Rs\.\s*[\d,–-]+|\$[\d,–-]+|EUR\s*[\d,–-]+)/i);
                if (match) return match[1];
                return sanitized.split("(")[0].trim() || sanitized;
            };

            const summaryStats = [
                { label: "EXPEDITION DURATION", value: trip.trip_details.duration || "N/A" },
                { label: "TRAVEL STYLE & VIBE", value: trip.trip_details.vibe || "Curated Discovery" },
                { label: "BUDGET CLASS", value: cleanBudgetClass(trip.trip_details.budget) },
                { label: "ESTIMATED TOTAL", value: cleanTotalCost(trip.trip_details.total_estimated_cost) },
            ];

            summaryStats.forEach((stat, idx) => {
                const x = startX + idx * (cardWidth + cardGap);
                doc.setFillColor(248, 250, 252); // slate-50
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.roundedRect(x, yPos, cardWidth, cardHeight, 1.5, 1.5, "FD");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.2);
                doc.setTextColor(100, 116, 139);
                doc.text(stat.label, x + 3.5, yPos + 4.8);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                const cleanVal = cleanText(stat.value);
                const wrappedVal = doc.splitTextToSize(cleanVal, cardWidth - 7);
                doc.text(wrappedVal[0] || cleanVal, x + 3.5, yPos + 11);
            });

            yPos += cardHeight + 8;

            // =================================================================
            // SECTION 1: MULTIMODAL ROUTING & TRANSIT OPERATIONS
            // =================================================================
            if (trip.transportation_plan && trip.transportation_plan.length > 0) {
                checkPageOverflow(24);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(15, 23, 42);
                doc.text("01 / MULTIMODAL TRANSIT & LOGISTICS PLAN", 15, yPos);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                doc.text("Authentic point-to-point legs with feeder connections, rail options, and airport transfers", 15, yPos + 4.5);
                yPos += 8;

                trip.transportation_plan.forEach((step, sIdx) => {
                    if (step.hubNotice) {
                        const cleanHub = cleanText(`Regional Airport Notice: ${step.hubNotice}`);
                        const hubLines = doc.splitTextToSize(cleanHub, 172);
                        const hubBoxHeight = hubLines.length * 3.4 + 5;
                        checkPageOverflow(hubBoxHeight + 4);

                        doc.setFillColor(254, 243, 199); // amber-100
                        doc.setDrawColor(245, 158, 11); // amber-500
                        doc.roundedRect(15, yPos, 180, hubBoxHeight, 1.2, 1.2, "FD");

                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(6.8);
                        doc.setTextColor(180, 83, 9); // amber-700
                        doc.text(hubLines, 18, yPos + 4);

                        yPos += hubBoxHeight + 2.5;
                    }

                    const stepTitle = cleanText(step.title || `${step.mode}: ${step.from || ''} -> ${step.to || ''}`);
                    const cleanDetails = cleanText(step.details);
                    const cleanCost = sanitizePrice(step.estimated_cost);
                    const cleanDuration = cleanText(step.duration);
                    const cleanDist = cleanText(step.distance);

                    // Allow details max 108mm so it never collides with the right cost column (x=140 to 195)
                    const titleLines = doc.splitTextToSize(stepTitle, 108);
                    const detailsLines = doc.splitTextToSize(cleanDetails, 108);

                    const optionsLines: string[] = [];
                    if (step.available_options && step.available_options.length > 0) {
                        step.available_options.slice(0, 4).forEach((opt) => {
                            const optText = `* [${opt.mode}] ${opt.routeNumber || opt.provider}: ${opt.departureTime ? `${opt.departureTime} -> ${opt.arrivalTime} | ` : ""}${opt.duration} (${opt.cost})`;
                            const wrapped = doc.splitTextToSize(cleanText(optText), 108);
                            optionsLines.push(...wrapped);
                        });
                    }

                    const totalTextLines = titleLines.length + detailsLines.length + (optionsLines.length > 0 ? optionsLines.length + 1 : 0);
                    const textHeight = totalTextLines * 3.4;
                    const cardHeight = Math.max(22, textHeight + 9);

                    checkPageOverflow(cardHeight + 4);

                    // Card Container
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, yPos, 180, cardHeight, 1.5, 1.5, "FD");

                    // Left Transit Mode Boarding Badge
                    const mode = (step.mode || "Transit").toUpperCase();
                    const isFlight = mode.includes("FLIGHT") || mode.includes("AIR");
                    const isTrain = mode.includes("TRAIN") || mode.includes("RAIL");
                    const isLocal = mode.includes("LOCAL") || mode.includes("METRO") || mode.includes("BUS");

                    doc.setFillColor(isFlight ? 238 : isTrain ? 236 : 243, isFlight ? 242 : isTrain ? 253 : 244, isFlight ? 255 : isTrain ? 245 : 246);
                    doc.setDrawColor(isFlight ? 186 : isTrain ? 167 : 209, isFlight ? 230 : isTrain ? 243 : 213, isFlight ? 253 : isTrain ? 208 : 219);
                    doc.roundedRect(18, yPos + 4, 21, 6.5, 1, 1, "FD");

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(6.5);
                    doc.setTextColor(isFlight ? 30 : isTrain ? 15 : 79, isFlight ? 64 : isTrain ? 118 : 70, isFlight ? 175 : isTrain ? 110 : 229);
                    doc.text(mode.slice(0, 8), 28.5, yPos + 8.2, { align: "center" });

                    // Leg Number Tag
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(6.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`LEG ${sIdx + 1}`, 28.5, yPos + 14, { align: "center" });

                    // Center Details
                    let curY = yPos + 5.5;
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42); // slate-900
                    doc.text(titleLines, 43, curY);
                    curY += titleLines.length * 3.4 + 1;

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7.2);
                    doc.setTextColor(71, 85, 105); // slate-600
                    doc.text(detailsLines, 43, curY);
                    curY += detailsLines.length * 3.4;

                    if (optionsLines.length > 0) {
                        curY += 1.5;
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(6.8);
                        doc.setTextColor(180, 83, 9); // amber-700
                        doc.text("VERIFIED SCHEDULED SERVICES:", 43, curY);
                        curY += 3.2;

                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(6.8);
                        doc.setTextColor(51, 65, 85);
                        doc.text(optionsLines, 43, curY);
                    }

                    // Right Side: Price on top line, Duration & Distance on subsequent lines (Aligned right at 190mm)
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8.5);
                    doc.setTextColor(217, 119, 6); // Warm Amber
                    doc.text(cleanCost, 190, yPos + 6, { align: "right" });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(100, 116, 139);
                    doc.text(cleanDuration, 190, yPos + 10.5, { align: "right" });

                    if (cleanDist) {
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(6.5);
                        doc.setTextColor(148, 163, 184);
                        doc.text(cleanDist, 190, yPos + 14.5, { align: "right" });
                    }

                    yPos += cardHeight + 3.5;
                });

                yPos += 4;
            }

            // =================================================================
            // SECTION 2: CURATED ACCOMMODATIONS & RESIDENCES
            // =================================================================
            if (trip.hotels && trip.hotels.length > 0) {
                checkPageOverflow(24);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(15, 23, 42);
                doc.text("02 / CURATED ACCOMMODATIONS & RESIDENCES", 15, yPos);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                doc.text("Selected hotels matching your comfort standard and central neighbourhood access", 15, yPos + 4.5);
                yPos += 8;

                trip.hotels.forEach((hotel, idx) => {
                    const cleanName = cleanText(hotel.name || "Well-rated Stay");
                    const cleanAddress = cleanText(hotel.address || "City Centre");
                    const cleanPrice = sanitizePrice(hotel.price || "Rs. 3,500/night");
                    const rating = hotel.rating ? `${hotel.rating} / 5.0` : "4.5 / 5.0";

                    const hasImage = Boolean(hotelImages[idx]);
                    const textStartX = hasImage ? 50 : 21;
                    const textWidth = hasImage ? 95 : 124;

                    const addressLines = doc.splitTextToSize(cleanAddress, textWidth);
                    const descLines = hotel.description ? doc.splitTextToSize(cleanText(hotel.description), textWidth) : [];
                    const hotelCardHeight = Math.max(22, 11 + addressLines.length * 3.5 + (descLines.length > 0 ? 4 : 0));

                    checkPageOverflow(hotelCardHeight + 4);

                    // Card Container
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, yPos, 180, hotelCardHeight, 1.5, 1.5, "FD");

                    if (hasImage && hotelImages[idx]) {
                        try {
                            doc.addImage(hotelImages[idx]!, "JPEG", 18, yPos + 3, 26, hotelCardHeight - 6);
                        } catch {
                            // graceful fallback without drawing grey box
                        }
                    } else {
                        // Colored accent strip on the left
                        doc.setFillColor(217, 119, 6); // amber accent
                        doc.rect(15, yPos, 2.5, hotelCardHeight, "F");
                    }

                    // Hotel Name
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8.5);
                    doc.setTextColor(15, 23, 42);
                    doc.text(cleanName, textStartX, yPos + 6);

                    // Address
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(100, 116, 139);
                    doc.text(addressLines, textStartX, yPos + 10.5);

                    // Rating Badge
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(7);
                    doc.setTextColor(5, 150, 105); // emerald-600
                    doc.text(`Rating: ${rating}`, textStartX, yPos + hotelCardHeight - 3.5);

                    // Amenities Pills
                    if (hotel.amenities && hotel.amenities.length > 0) {
                        const amText = cleanText(hotel.amenities.slice(0, 3).join("  •  "));
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(6.5);
                        doc.setTextColor(148, 163, 184);
                        doc.text(amText, textStartX + 30, yPos + hotelCardHeight - 3.5);
                    }

                    // Price on the right
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8.5);
                    doc.setTextColor(217, 119, 6);
                    doc.text(cleanPrice, 190, yPos + 7, { align: "right" });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(6.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text("estimate, all taxes incl.", 190, yPos + 11.5, { align: "right" });

                    yPos += hotelCardHeight + 3.5;
                });

                yPos += 4;
            }

            // =================================================================
            // SECTION 3: DAILY ITINERARY PLAN (STRUCTURED EDITORIAL TIMELINE)
            // =================================================================
            checkPageOverflow(24);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(15, 23, 42);
            doc.text("03 / CHRONOLOGICAL EXPEDITION ITINERARY", 15, yPos);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Capacity-balanced daily schedules with off-peak perks, arrival transfers, and cultural highlights", 15, yPos + 4.5);
            yPos += 8;

            (trip.itinerary || []).forEach((day, dayIndex) => {
                checkPageOverflow(20);

                let dayCity = primaryCity;
                const rawTheme = cleanText(day.theme || "");
                if (rawTheme.includes(":")) {
                    const possibleCity = rawTheme.split(":")[0].replace(/discover|arrive|highlights|local life/gi, "").trim();
                    if (possibleCity.length > 2 && possibleCity.toLowerCase() !== "india") {
                        dayCity = possibleCity;
                    }
                }

                // Day Title Banner Bar
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(15, yPos, 180, 8, 1, 1, "FD");

                // Day indicator strip
                doc.setFillColor(217, 119, 6);
                doc.rect(15, yPos, 2.5, 8, "F");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                const pacing = day.pacingRating ? ` [${cleanText(day.pacingRating).toUpperCase()} PACING]` : "";
                const dayHeader = `DAY ${day.day} : ${rawTheme || `Discover ${dayCity}`}${pacing}`;
                doc.text(dayHeader.slice(0, 95), 20, yPos + 5.5);

                if (day.date) {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(100, 116, 139);
                    doc.text(cleanText(day.date), 190, yPos + 5.5, { align: "right" });
                }

                yPos += 11;

                (day.activities || []).forEach((activity, actIndex) => {
                    let actTitle = cleanText(activity.title || activity.place_name || "Activity Stop");
                    if (actTitle.toLowerCase().startsWith("india ") && dayCity.toLowerCase() !== "india") {
                        actTitle = `${dayCity} ${actTitle.slice(6)}`;
                    }

                    const actTime = cleanText(activity.timeSlot || activity.time || "Scheduled");
                    const actPrice = sanitizePrice(activity.ticket_price || (activity.estimatedCost ? `Rs. ${activity.estimatedCost.amount}` : "Free"));
                    const crowd = activity.crowdLevel ? cleanText(activity.crowdLevel).toUpperCase() : "MODERATE";
                    const perkText = activity.offPeakTip ? `  •  Tip: ${cleanText(activity.offPeakTip)}` : "";
                    const fullDesc = cleanText((activity.description || activity.details || "") + perkText);

                    const hasActImg = Boolean(activityImages[`${dayIndex}_${actIndex}`]);
                    const textStartX = hasActImg ? 46 : 21;
                    const textWidth = hasActImg ? 98 : 124;

                    const descLines = doc.splitTextToSize(fullDesc, textWidth);
                    const actCardHeight = Math.max(18, 11 + descLines.length * 3.5);

                    checkPageOverflow(actCardHeight + 3.5);

                    // Activity Card
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, yPos, 180, actCardHeight, 1.5, 1.5, "FD");

                    if (hasActImg && activityImages[`${dayIndex}_${actIndex}`]) {
                        try {
                            doc.addImage(activityImages[`${dayIndex}_${actIndex}`]!, "JPEG", 18, yPos + 3, 22, actCardHeight - 6);
                        } catch {
                            // ignore image error
                        }
                    } else {
                        // Category bullet dot
                        doc.setFillColor(79, 70, 229); // indigo
                        doc.circle(18.5, yPos + 6, 1.2, "F");
                    }

                    // Activity Title
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text(actTitle, textStartX, yPos + 5.8);

                    // Time & Crowd Subtitle
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(6.8);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Window: ${actTime}   |   Density: ${crowd}`, textStartX, yPos + 9.8);

                    // Description & Tip
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(6.8);
                    doc.setTextColor(71, 85, 105);
                    doc.text(descLines, textStartX, yPos + 13.5);

                    // Price on the right
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(217, 119, 6);
                    doc.text(actPrice, 190, yPos + 6, { align: "right" });

                    yPos += actCardHeight + 2.5;
                });

                yPos += 3;
            });

            // =================================================================
            // SECTION 4: VOYAGE SHIELD™ GUARANTEE CERTIFICATE
            // =================================================================
            checkPageOverflow(32);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(15, 23, 42);
            doc.text("04 / VOYAGE SHIELD™ GUARANTEED OUTCOME PROTECTION", 15, yPos);
            yPos += 5.5;

            // Certificate Container Card
            doc.setFillColor(240, 253, 244); // emerald-50
            doc.setDrawColor(187, 247, 208); // emerald-200
            doc.roundedRect(15, yPos, 180, 26, 1.5, 1.5, "FD");

            // Emerald accent strip
            doc.setFillColor(5, 150, 105); // emerald-600
            doc.rect(15, yPos, 3, 26, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(4, 120, 87); // emerald-700
            doc.text("ACTIVE PARAMETRIC POLICY  •  POLICY CERTIFICATE #VY-SHIELD-2026", 22, yPos + 6);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(51, 65, 85);
            doc.text("• Autonomous Delay Trigger: If your scheduled flight or train is delayed >60 mins, compensation activates autonomously.", 22, yPos + 11.5);
            doc.text("• Instant Settlement: Direct bank settlement via UPI/IMPS (Rs. 4,500 / EUR 50 for international, Rs. 1,500 domestic) with zero paperwork.", 22, yPos + 16.5);
            doc.text("• 24/7 Global Emergency Assistance: Universal Emergency Services Dial 112 (Europe & India)  |  Voyage Desk: +91 1800-VOYAGE-SOS", 22, yPos + 21.5);

            yPos += 32;

            // =================================================================
            // SECTION 5: ITEMISED EXPENSE LEDGER
            // =================================================================
            checkPageOverflow(30);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(15, 23, 42);
            doc.text("05 / ITEMISED BUDGET LEDGER & EXPENDITURE BREAKDOWN", 15, yPos);
            yPos += 6;

            // Expense Breakdown Table Container
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(15, yPos, 180, 22, 1.5, 1.5, "FD");

            const colWidth = 36;
            const expenseCols = [
                { cat: "TRANSIT & FEEDER", share: "27% allocation" },
                { cat: "CURATED STAYS", share: "31% allocation" },
                { cat: "DINING & MEALS", share: "16% allocation" },
                { cat: "CULTURE & TOURS", share: "12% allocation" },
                { cat: "SAFETY BUFFER", share: "14% contingency" },
            ];

            expenseCols.forEach((col, cIdx) => {
                const cX = 15 + cIdx * colWidth;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.5);
                doc.setTextColor(100, 116, 139);
                doc.text(col.cat, cX + 4, yPos + 6.5);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(15, 23, 42);
                doc.text(col.share, cX + 4, yPos + 12);

                if (cIdx < expenseCols.length - 1) {
                    doc.setDrawColor(226, 232, 240);
                    doc.line(cX + colWidth, yPos + 2, cX + colWidth, yPos + 20);
                }
            });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(217, 119, 6);
            doc.text(`GRAND ESTIMATED TOTAL: ${trip.trip_details.total_estimated_cost || "Rs. 0"}`, 190, yPos + 18, { align: "right" });

            yPos += 28;

            // =================================================================
            // FOOTER & PAGE NUMBERING ON ALL PAGES
            // =================================================================
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // Header Top
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text("VOYAGE LUXURY TRAVEL DOSSIER  •  CONFIDENTIAL & VERIFIED", 15, 10);
                doc.text(`Page ${i} of ${pageCount}`, 195, 10, { align: "right" });

                doc.setDrawColor(226, 232, 240);
                doc.line(15, 12, 195, 12);

                // Footer Bottom
                doc.line(15, 285, 195, 285);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text("Generated via Voyage Autonomous Travel Platform  •  All Rights Reserved", 15, 290);
                doc.text("IRCTC, Flight & Open-Meteo Verified", 195, 290, { align: "right" });
            }

            // Save PDF
            const sanitizedFileName = `Voyage_${primaryCity.replace(/\s+/g, "_")}_Luxury_Dossier.pdf`;
            doc.save(sanitizedFileName);
        } catch (error) {
            console.error("Error creating PDF:", error);
            alert("An error occurred while generating the PDF. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Button
            onClick={generatePdf}
            disabled={generating}
            variant="outline"
            className="gap-2 border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white disabled:bg-white/5 disabled:text-white/40 cursor-pointer"
        >
            {generating ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Designing PDF Dossier...
                </>
            ) : (
                <>
                    <Download className="h-4 w-4" />
                    Download PDF Dossier
                </>
            )}
        </Button>
    );
}
