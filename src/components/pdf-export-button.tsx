"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { GeneratedTrip } from "@/actions/generate-trip";

interface PdfExportButtonProps {
    trip: GeneratedTrip;
}

const sanitizePrice = (price: string | undefined): string => {
    if (!price) return "N/A";
    return price
        .replace(/₹/g, "Rs. ")
        .replace(/\s+/g, " ")
        .trim();
};

// Helper to fetch image and convert to Base64 (with timeout and CORS handling)
const fetchImageBase64 = async (url: string): Promise<string | null> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to fetch image for PDF:", url, e);
        return null;
    }
};

export function PdfExportButton({ trip }: PdfExportButtonProps) {
    const [generating, setGenerating] = useState(false);

    const generatePdf = async () => {
        setGenerating(true);

        try {
            // 1. Fetch hero image in parallel with others
            const heroImageUrl = `https://image.pollinations.ai/prompt/cinematic%20photo%20of%20${encodeURIComponent(trip.trip_details.destination)}%20landmark%20sunset%20aesthetic%204k?width=600&height=350&nologo=true`;
            const heroPromise = fetchImageBase64(heroImageUrl);

            // 2. Fetch hotel images
            const hotelPromises = trip.hotels.map(async (hotel) => {
                if (hotel.image_url) {
                    return fetchImageBase64(hotel.image_url);
                }
                return null;
            });

            // 3. Fetch activity images
            const activityPromises: Promise<{ key: string; base64: string | null }>[] = [];
            trip.itinerary.forEach((day, dayIndex) => {
                day.activities.forEach((activity, actIndex) => {
                    if (activity.image_url) {
                        activityPromises.push(
                            fetchImageBase64(activity.image_url).then((base64) => ({
                                key: `${dayIndex}_${actIndex}`,
                                base64
                            }))
                        );
                    }
                });
            });

            // Resolve all in parallel
            const [heroImageBase64, hotelImages, resolvedActivities] = await Promise.all([
                heroPromise,
                Promise.all(hotelPromises),
                Promise.all(activityPromises)
            ]);

            const activityImages: { [key: string]: string | null } = {};
            resolvedActivities.forEach((item) => {
                activityImages[item.key] = item.base64;
            });

            // Create jsPDF instance
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            let yPos = 20;

            const checkPageOverflow = (heightNeeded: number): boolean => {
                if (yPos + heightNeeded > 270) {
                    doc.addPage();
                    yPos = 22; // Leave margin for header
                    return true;
                }
                return false;
            };

            // --- PAGE 1: TITLE & COVER ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text("GAMANCHAKRA", 15, yPos + 4);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text("YOUR BESPOKE TRAVEL COMPANION", 15, yPos + 10);

            yPos += 16;

            // Destination Hero Image
            if (heroImageBase64) {
                try {
                    doc.addImage(heroImageBase64, "JPEG", 15, yPos, 180, 60);
                    yPos += 66;
                } catch (e) {
                    console.error("Error drawing hero image in PDF:", e);
                    yPos += 5;
                }
            } else {
                // Background card placeholder
                doc.setFillColor(241, 245, 249);
                doc.roundedRect(15, yPos, 180, 45, 3, 3, "F");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.setTextColor(148, 163, 184);
                doc.text(trip.trip_details.destination.toUpperCase(), 105, yPos + 25, { align: "center" });
                yPos += 52;
            }

            // Destination Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(234, 88, 12); // Orange-600
            doc.text(`Journey to ${trip.trip_details.destination}`, 15, yPos);
            yPos += 9;

            // Summary cards
            const cardWidth = 42;
            const cardHeight = 18;
            const cardGap = 4;
            const startX = 15;

            const details = [
                { label: "DURATION", value: trip.trip_details.duration },
                { label: "VIBE", value: trip.trip_details.vibe },
                { label: "BUDGET", value: trip.trip_details.budget },
                { label: "EST. COST", value: trip.trip_details.total_estimated_cost || "N/A" }
            ];

            details.forEach((item, index) => {
                const x = startX + index * (cardWidth + cardGap);
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(241, 245, 249);
                doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, "FD");

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text(item.label, x + 4, yPos + 5);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(15, 23, 42);
                const val = sanitizePrice(item.value);
                const wrappedVal = doc.splitTextToSize(val, cardWidth - 8);
                doc.text(wrappedVal, x + 4, yPos + 11);
            });

            yPos += cardHeight + 12;

            // --- TRANSPORTATION ---
            if (trip.transportation_plan && trip.transportation_plan.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(15, 23, 42);
                doc.text("Getting There", 15, yPos);
                yPos += 6;

                trip.transportation_plan.forEach((step) => {
                    checkPageOverflow(16);

                    // Draw card background
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(241, 245, 249);
                    doc.roundedRect(15, yPos, 180, 12, 1.5, 1.5, "FD");

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9.5);
                    doc.setTextColor(234, 88, 12);
                    doc.text(step.mode, 19, yPos + 8);

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8.5);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`${sanitizePrice(step.estimated_cost)}  |  ${step.duration}`, 191, yPos + 8, { align: "right" });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(71, 85, 105);
                    const detailsWrapped = doc.splitTextToSize(step.details, 110);
                    doc.text(detailsWrapped, 55, yPos + 7.5);

                    yPos += 15;
                });
                yPos += 4;
            }

            // --- HOTELS ---
            checkPageOverflow(26);
            yPos += 2;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text("Recommended Accommodations", 15, yPos);
            yPos += 7;

            for (let index = 0; index < trip.hotels.length; index++) {
                const hotel = trip.hotels[index];
                checkPageOverflow(34);

                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(241, 245, 249);
                doc.roundedRect(15, yPos, 180, 30, 2, 2, "FD");

                const imgBase64 = hotelImages[index];
                if (imgBase64) {
                    try {
                        doc.addImage(imgBase64, "JPEG", 18, yPos + 3, 36, 24);
                    } catch (e) {
                        doc.setFillColor(241, 245, 249);
                        doc.rect(18, yPos + 3, 36, 24, "F");
                    }
                } else {
                    doc.setFillColor(248, 250, 252);
                    doc.roundedRect(18, yPos + 3, 36, 24, 1, 1, "F");
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text("HOTEL PREVIEW", 36, yPos + 15, { align: "center" });
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(15, 23, 42);
                doc.text(hotel.name, 58, yPos + 7);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                const wrappedAddress = doc.splitTextToSize(hotel.address, 80);
                doc.text(wrappedAddress, 58, yPos + 12);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(234, 88, 12);
                doc.text(`Rating: ${hotel.rating} / 5`, 58, yPos + 25);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(234, 88, 12);
                doc.text(sanitizePrice(hotel.price), 191, yPos + 25, { align: "right" });

                yPos += 34;
            }
            yPos += 4;

            // --- ITINERARY ---
            checkPageOverflow(26);
            yPos += 2;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text("Daily Itinerary", 15, yPos);
            yPos += 7;

            for (let dayIndex = 0; dayIndex < trip.itinerary.length; dayIndex++) {
                const day = trip.itinerary[dayIndex];
                checkPageOverflow(20);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(234, 88, 12);
                doc.text(`Day ${day.day}: ${day.theme}`, 15, yPos);
                yPos += 5.5;

                for (let actIndex = 0; actIndex < day.activities.length; actIndex++) {
                    const activity = day.activities[actIndex];
                    checkPageOverflow(28);

                    doc.setFillColor(250, 250, 250);
                    doc.setDrawColor(241, 245, 249);
                    doc.roundedRect(15, yPos, 180, 24, 1.5, 1.5, "FD");

                    const actImgBase64 = activityImages[`${dayIndex}_${actIndex}`];
                    if (actImgBase64) {
                        try {
                            doc.addImage(actImgBase64, "JPEG", 18, yPos + 3, 28, 18);
                        } catch (e) {
                            doc.setFillColor(241, 245, 249);
                            doc.rect(18, yPos + 3, 28, 18, "F");
                        }
                    } else {
                        doc.setFillColor(241, 245, 249);
                        doc.rect(18, yPos + 3, 28, 18, "F");
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(6.5);
                        doc.setTextColor(148, 163, 184);
                        doc.text("ACTIVITY", 32, yPos + 12, { align: "center" });
                    }

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);
                    doc.text(activity.place_name, 50, yPos + 6);

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7.5);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Time: ${activity.time}  |  Cost: ${sanitizePrice(activity.ticket_price)}`, 50, yPos + 10.5);

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7.5);
                    doc.setTextColor(71, 85, 105);
                    const wrappedDesc = doc.splitTextToSize(activity.details, 140);
                    doc.text(wrappedDesc, 50, yPos + 15);

                    yPos += 27;
                }
                yPos += 2;
            }

            // --- HEADER & FOOTER ON ALL PAGES ---
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // Header
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text("Gamanchakra - Your Personal Travel Companion", 15, 10);
                doc.text(`Page ${i} of ${pageCount}`, 195, 10, { align: "right" });

                doc.setDrawColor(241, 245, 249);
                doc.line(15, 12, 195, 12);

                // Footer
                doc.line(15, 285, 195, 285);
                doc.text("Generated via Gamanchakra", 15, 290);
                doc.text("All rights reserved.", 195, 290, { align: "right" });
            }

            doc.save(`Gamanchakra_${trip.trip_details.destination.replace(/\s+/g, "_")}_Itinerary.pdf`);

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
