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
        .replace(/[^\x20-\x7E\n\r]/g, " ") // restrict to safe printable ASCII
        .replace(/\s+/g, " ")
        .trim();
};

const sanitizePrice = (price: string | undefined | null): string => {
    if (!price) return "N/A";
    return cleanText(price);
};

/**
 * Normalizes destination strings like "Srirangam, India" -> "Srirangam"
 */
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

            // Initialize A4 PDF
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            let yPos = 20;

            const checkPageOverflow = (heightNeeded: number): boolean => {
                if (yPos + heightNeeded > 270) {
                    doc.addPage();
                    yPos = 22;
                    return true;
                }
                return false;
            };

            // =================================================================
            // PAGE 1: HEADER & TITLE
            // =================================================================
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text("VOYAGE ITINERARY", 15, yPos + 2);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text("AUTONOMOUS TRAVEL COMPANION - CAPACITY & BUDGET OPTIMIZED", 15, yPos + 7.5);

            yPos += 13;

            // Hero Banner: Use real photo if loaded, otherwise render an executive gradient card
            if (heroImageBase64) {
                try {
                    doc.addImage(heroImageBase64, "JPEG", 15, yPos, 180, 48);
                    yPos += 53;
                } catch {
                    renderExecutiveHeroCard();
                }
            } else {
                renderExecutiveHeroCard();
            }

            function renderExecutiveHeroCard() {
                // Sleek slate-navy banner with orange accent strip
                doc.setFillColor(15, 23, 42); // slate-900
                doc.roundedRect(15, yPos, 180, 36, 2, 2, "F");

                // Orange accent strip
                doc.setFillColor(234, 88, 12); // orange-600
                doc.rect(15, yPos, 4, 36, "F");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(249, 115, 22); // orange-500
                doc.text("OFFICIAL EXPEDITION DOSSIER", 24, yPos + 9);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.setTextColor(255, 255, 255);
                const bannerDest = cleanText(trip.trip_details.destination);
                const wrappedDest = doc.splitTextToSize(bannerDest, 160);
                doc.text(wrappedDest.slice(0, 2), 24, yPos + 18);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); // slate-400
                doc.text("Synchronized with IRCTC Rail Schedules, Flight Radars & Parametric Delay Shield", 24, yPos + 30);

                yPos += 42;
            }

            // Summary Info Badges (Duration, Vibe, Budget, Estimated Cost)
            const cardWidth = 42;
            const cardHeight = 16;
            const cardGap = 4;
            const startX = 15;

            const summaryStats = [
                { label: "DURATION", value: trip.trip_details.duration || "N/A" },
                { label: "VIBE", value: trip.trip_details.vibe || "General" },
                { label: "BUDGET", value: trip.trip_details.budget ? `Rs. ${trip.trip_details.budget}` : "Flexible" },
                { label: "EST. TOTAL", value: trip.trip_details.total_estimated_cost || "Rs. 0" },
            ];

            summaryStats.forEach((stat, idx) => {
                const x = startX + idx * (cardWidth + cardGap);
                doc.setFillColor(248, 250, 252); // slate-50
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.roundedRect(x, yPos, cardWidth, cardHeight, 1.5, 1.5, "FD");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.5);
                doc.setTextColor(100, 116, 139);
                doc.text(stat.label, x + 3.5, yPos + 5);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                const cleanVal = cleanText(stat.value);
                const wrappedVal = doc.splitTextToSize(cleanVal, cardWidth - 7);
                doc.text(wrappedVal[0] || cleanVal, x + 3.5, yPos + 11);
            });

            yPos += cardHeight + 8;

            // =================================================================
            // SECTION: TRANSPORTATION / GETTING THERE (NO OVERLAPPING TEXT)
            // =================================================================
            if (trip.transportation_plan && trip.transportation_plan.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(15, 23, 42);
                doc.text("Getting There & Transit Plan", 15, yPos);
                yPos += 5.5;

                trip.transportation_plan.forEach((step) => {
                    const cleanDetails = cleanText(step.details);
                    const cleanCost = sanitizePrice(step.estimated_cost);
                    const cleanDuration = cleanText(step.duration);

                    // Allow details max 105mm so it never collides with the right cost column (x=140 to 195)
                    const detailsLines = doc.splitTextToSize(cleanDetails, 105);
                    const textHeight = detailsLines.length * 3.7;
                    const cardHeight = Math.max(16, textHeight + 6);

                    checkPageOverflow(cardHeight + 4);

                    // Card Container
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, yPos, 180, cardHeight, 1.5, 1.5, "FD");

                    // Left Transit Mode Pill
                    const mode = (step.mode || "Transit").toUpperCase();
                    const isFlight = mode.includes("FLIGHT") || mode.includes("AIR");
                    const isTrain = mode.includes("TRAIN") || mode.includes("RAIL");

                    doc.setFillColor(isFlight ? 239 : isTrain ? 240 : 241, isFlight ? 246 : isTrain ? 253 : 245, isFlight ? 255 : isTrain ? 244 : 249);
                    doc.setDrawColor(isFlight ? 191 : isTrain ? 187 : 203, isFlight ? 219 : isTrain ? 247 : 213, isFlight ? 254 : isTrain ? 208 : 225);
                    doc.roundedRect(18, yPos + 3.5, 20, 7, 1, 1, "FD");

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(7);
                    doc.setTextColor(isFlight ? 29 : isTrain ? 21 : 71, isFlight ? 78 : isTrain ? 128 : 85, isFlight ? 216 : isTrain ? 61 : 105);
                    doc.text(mode.slice(0, 7), 28, yPos + 8, { align: "center" });

                    // Center Details
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7.5);
                    doc.setTextColor(51, 65, 85); // slate-700
                    doc.text(detailsLines, 42, yPos + 5.5);

                    // Right Side: Price on top line, Duration on second line (Aligned right at 190mm)
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(234, 88, 12); // Orange-600
                    doc.text(cleanCost, 190, yPos + 6, { align: "right" });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(100, 116, 139);
                    doc.text(cleanDuration, 190, yPos + 10.5, { align: "right" });

                    yPos += cardHeight + 3;
                });

                yPos += 4;
            }

            // =================================================================
            // SECTION: RECOMMENDED ACCOMMODATIONS (NO UGLY "PREVIEW" BOXES)
            // =================================================================
            if (trip.hotels && trip.hotels.length > 0) {
                checkPageOverflow(20);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(15, 23, 42);
                doc.text("Recommended Accommodations", 15, yPos);
                yPos += 5.5;

                trip.hotels.forEach((hotel, idx) => {
                    const cleanName = cleanText(hotel.name || "Well-rated Stay");
                    const cleanAddress = cleanText(hotel.address || "City Centre");
                    const cleanPrice = sanitizePrice(hotel.price || "₹3,000/night");
                    const rating = hotel.rating ? `${hotel.rating} / 5` : "4.0 / 5";

                    const hasImage = Boolean(hotelImages[idx]);
                    const textStartX = hasImage ? 50 : 20;
                    const textWidth = hasImage ? 95 : 125;

                    const addressLines = doc.splitTextToSize(cleanAddress, textWidth);
                    const hotelCardHeight = Math.max(22, 10 + addressLines.length * 3.5);

                    checkPageOverflow(hotelCardHeight + 4);

                    // Card Container
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, yPos, 180, hotelCardHeight, 1.5, 1.5, "FD");

                    if (hasImage && hotelImages[idx]) {
                        try {
                            doc.addImage(hotelImages[idx]!, "JPEG", 18, yPos + 3, 26, hotelCardHeight - 6);
                        } catch {
                            // If drawing image fails, fallback gracefully without drawing ugly grey box
                        }
                    } else {
                        // Colored accent strip on the left instead of empty grey box
                        doc.setFillColor(234, 88, 12);
                        doc.rect(15, yPos, 2.5, hotelCardHeight, "F");
                    }

                    // Hotel Name
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);
                    doc.text(cleanName, textStartX, yPos + 6);

                    // Address
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7.5);
                    doc.setTextColor(100, 116, 139);
                    doc.text(addressLines, textStartX, yPos + 10.5);

                    // Rating Badge
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(7.5);
                    doc.setTextColor(16, 185, 129); // emerald-600
                    doc.text(`Rating: ${rating}`, textStartX, yPos + hotelCardHeight - 3.5);

                    // Price on the right
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.setTextColor(234, 88, 12);
                    doc.text(cleanPrice, 190, yPos + 7, { align: "right" });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(6.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text("estimate, all taxes incl.", 190, yPos + 11.5, { align: "right" });

                    yPos += hotelCardHeight + 3;
                });

                yPos += 4;
            }

            // =================================================================
            // SECTION: DAILY ITINERARY (CLEAN TYPOGRAPHY, NO PREVIEW BOXES)
            // =================================================================
            checkPageOverflow(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text("Daily Itinerary Plan", 15, yPos);
            yPos += 6;

            (trip.itinerary || []).forEach((day, dayIndex) => {
                checkPageOverflow(16);

                // Determine city for this day to fix "India old town heritage walk"
                let dayCity = primaryCity;
                const rawTheme = cleanText(day.theme || "");
                if (rawTheme.includes(":")) {
                    const possibleCity = rawTheme.split(":")[0].replace(/discover|arrive|highlights|local life/gi, "").trim();
                    if (possibleCity.length > 2 && possibleCity.toLowerCase() !== "india") {
                        dayCity = possibleCity;
                    }
                }

                // Day Title & Pacing Pill
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(234, 88, 12);
                const pacing = day.pacingRating ? ` [${cleanText(day.pacingRating).toUpperCase()} PACING]` : "";
                doc.text(`Day ${day.day}: ${rawTheme || `Discover ${dayCity}`}${pacing}`, 15, yPos);
                yPos += 5.5;

                (day.activities || []).forEach((activity, actIndex) => {
                    let actTitle = cleanText(activity.title || activity.place_name || "Activity Stop");
                    // Repair generic "India heritage walk" or "India museum" into actual city name
                    if (actTitle.toLowerCase().startsWith("india ") && dayCity.toLowerCase() !== "india") {
                        actTitle = `${dayCity} ${actTitle.slice(6)}`;
                    }

                    const actTime = cleanText(activity.timeSlot || activity.time || "Scheduled");
                    const actPrice = sanitizePrice(activity.ticket_price || (activity.estimatedCost ? `Rs. ${activity.estimatedCost.amount}` : "Free"));
                    const crowd = activity.crowdLevel ? cleanText(activity.crowdLevel).toUpperCase() : "MODERATE";
                    const perkText = activity.offPeakTip ? ` - Tip: ${cleanText(activity.offPeakTip)}` : "";
                    const fullDesc = cleanText((activity.description || activity.details || "") + perkText);

                    const hasActImg = Boolean(activityImages[`${dayIndex}_${actIndex}`]);
                    const textStartX = hasActImg ? 45 : 20;
                    const textWidth = hasActImg ? 100 : 125;

                    const descLines = doc.splitTextToSize(fullDesc, textWidth);
                    const actCardHeight = Math.max(18, 11 + descLines.length * 3.5);

                    checkPageOverflow(actCardHeight + 3);

                    // Activity Card
                    doc.setFillColor(250, 250, 250);
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(15, yPos, 180, actCardHeight, 1.5, 1.5, "FD");

                    if (hasActImg && activityImages[`${dayIndex}_${actIndex}`]) {
                        try {
                            doc.addImage(activityImages[`${dayIndex}_${actIndex}`]!, "JPEG", 18, yPos + 3, 22, actCardHeight - 6);
                        } catch {
                            // ignore image error
                        }
                    } else {
                        // Clean subtle pill accent on left
                        doc.setFillColor(99, 102, 241); // indigo
                        doc.circle(18.5, yPos + 6, 1.2, "F");
                    }

                    // Activity Title
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8.5);
                    doc.setTextColor(15, 23, 42);
                    doc.text(actTitle, textStartX, yPos + 6);

                    // Time & Crowd Subtitle
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Time: ${actTime}   |   Crowd: ${crowd}`, textStartX, yPos + 10);

                    // Description & Tip
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(71, 85, 105);
                    doc.text(descLines, textStartX, yPos + 14);

                    // Price on the right
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(234, 88, 12);
                    doc.text(actPrice, 190, yPos + 6, { align: "right" });

                    yPos += actCardHeight + 2.5;
                });

                yPos += 2.5;
            });

            // =================================================================
            // FOOTER & PAGE NUMBERING ON ALL PAGES
            // =================================================================
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // Header Top
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(148, 163, 184);
                doc.text("VOYAGE - Your Personal Travel Companion", 15, 10);
                doc.text(`Page ${i} of ${pageCount}`, 195, 10, { align: "right" });

                doc.setDrawColor(226, 232, 240);
                doc.line(15, 12, 195, 12);

                // Footer Bottom
                doc.line(15, 285, 195, 285);
                doc.text("Generated via Voyage - Budget & Capacity Optimized", 15, 290);
                doc.text("All rights reserved.", 195, 290, { align: "right" });
            }

            // Save PDF
            const sanitizedFileName = `Voyage_${primaryCity.replace(/\s+/g, "_")}_Itinerary.pdf`;
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
            className="gap-2 border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white disabled:bg-white/5 disabled:text-white/40"
        >
            {generating ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Designing PDF...
                </>
            ) : (
                <>
                    <Download className="h-4 w-4" />
                    Download PDF
                </>
            )}
        </Button>
    );
}
