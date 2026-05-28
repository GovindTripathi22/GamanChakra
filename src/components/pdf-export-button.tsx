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

// Canvas-based image loader that targets browser cache to prevent fetch timeout and CORS issues
const getBase64ImageFromUrl = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.setAttribute("crossOrigin", "anonymous");
        
        // Timeout handler
        const timeoutId = setTimeout(() => {
            img.src = ""; // Abort loading
            console.warn("PDF Image load timeout:", url);
            resolve(null);
        }, 15000); // 15 seconds timeout
        
        img.onload = () => {
            clearTimeout(timeoutId);
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL("image/jpeg");
                    resolve(dataURL);
                } else {
                    resolve(null);
                }
            } catch (e) {
                console.warn("Canvas error for PDF image conversion:", e);
                resolve(null);
            }
        };
        
        img.onerror = () => {
            clearTimeout(timeoutId);
            console.warn("Failed to load image for PDF:", url);
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
            // Get exact matching URLs used in the results page to hit browser cache
            const heroImageUrl = `https://image.pollinations.ai/prompt/cinematic%20photo%20of%20${encodeURIComponent(trip.trip_details.destination)}%20famous%20landmark%20sunset%20aesthetic%204k?width=1600&height=900&nologo=true`;
            
            // Start fetching hero image in parallel
            const heroPromise = getBase64ImageFromUrl(heroImageUrl);

            // Fetch hotel images in parallel
            const hotelPromises = trip.hotels.map(async (hotel) => {
                if (hotel.image_url) {
                    return getBase64ImageFromUrl(hotel.image_url);
                }
                return null;
            });

            // Fetch activity images in parallel
            const activityPromises: Promise<{ key: string; base64: string | null }>[] = [];
            trip.itinerary.forEach((day, dayIndex) => {
                day.activities.forEach((activity, actIndex) => {
                    if (activity.image_url) {
                        activityPromises.push(
                            getBase64ImageFromUrl(activity.image_url).then((base64) => ({
                                key: `${dayIndex}_${actIndex}`,
                                base64
                            }))
                        );
                    }
                });
            });

            // Resolve all image downloads in parallel
            const [heroImageBase64, hotelImages, resolvedActivities] = await Promise.all([
                heroPromise,
                Promise.all(hotelPromises),
                Promise.all(activityPromises)
            ]);

            const activityImages: { [key: string]: string | null } = {};
            resolvedActivities.forEach((item) => {
                activityImages[item.key] = item.base64;
            });

            // Create A4 PDF Document
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            let yPos = 20;

            const checkPageOverflow = (heightNeeded: number): boolean => {
                if (yPos + heightNeeded > 270) {
                    doc.addPage();
                    yPos = 22; // Leave margin for page header
                    return true;
                }
                return false;
            };

            // --- TITLE & SUBTITLE ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text("GAMANCHAKRA ITINERARY", 15, yPos + 2);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text("YOUR EXCLUSIVE TRAVEL GUIDE", 15, yPos + 8);

            yPos += 14;

            // Hero Image
            if (heroImageBase64) {
                try {
                    doc.addImage(heroImageBase64, "JPEG", 15, yPos, 180, 55);
                    yPos += 60;
                } catch (e) {
                    doc.setFillColor(241, 245, 249);
                    doc.roundedRect(15, yPos, 180, 40, 2, 2, "F");
                    yPos += 45;
                }
            } else {
                doc.setFillColor(241, 245, 249);
                doc.roundedRect(15, yPos, 180, 40, 2, 2, "F");
                yPos += 45;
            }

            // Destination Heading
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(234, 88, 12); // Orange-600
            doc.text(`Journey to ${trip.trip_details.destination}`, 15, yPos);
            yPos += 8;

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
                doc.roundedRect(x, yPos, cardWidth, cardHeight, 1.5, 1.5, "FD");

                doc.setFont("helvetica", "normal");
                doc.setFontSize(6.5);
                doc.setTextColor(100, 116, 139);
                doc.text(item.label, x + 3, yPos + 5);

                doc.setFont("helvetica", "bold");
                const val = sanitizePrice(item.value);
                doc.setFontSize(val.length > 15 ? 7.5 : 8.5);
                doc.setTextColor(15, 23, 42);
                const wrappedVal = doc.splitTextToSize(val, cardWidth - 6);
                doc.text(wrappedVal, x + 3, yPos + 10.5);
            });

            yPos += cardHeight + 10;

            // --- TRANSPORTATION ---
            if (trip.transportation_plan && trip.transportation_plan.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(15, 23, 42);
                doc.text("Getting There", 15, yPos);
                yPos += 6;

                trip.transportation_plan.forEach((step) => {
                    const detailsWrapped = doc.splitTextToSize(step.details, 110);
                    const textHeight = detailsWrapped.length * 3.8;
                    const cardHeight = Math.max(12, textHeight + 5);

                    checkPageOverflow(cardHeight + 4);

                    // Card Background
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(241, 245, 249);
                    doc.roundedRect(15, yPos, 180, cardHeight, 1.5, 1.5, "FD");

                    // Trans Mode Title
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9.5);
                    doc.setTextColor(234, 88, 12);
                    doc.text(step.mode, 19, yPos + Math.max(6, (cardHeight / 2) - 1.5));

                    // Transit details
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(71, 85, 105);
                    doc.text(detailsWrapped, 55, yPos + 4.5);

                    // Duration / Cost on Right
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`${sanitizePrice(step.estimated_cost)}  |  ${step.duration}`, 191, yPos + Math.max(6, (cardHeight / 2) - 1.5), { align: "right" });

                    yPos += cardHeight + 3;
                });
                yPos += 4;
            }

            // --- HOTELS ---
            checkPageOverflow(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text("Recommended Accommodations", 15, yPos);
            yPos += 7;

            for (let index = 0; index < trip.hotels.length; index++) {
                const hotel = trip.hotels[index];
                
                const wrappedAddress = doc.splitTextToSize(hotel.address, 115);
                const addressHeight = wrappedAddress.length * 3.8;
                // Name (5) + Gap (2) + Address (addressHeight) + Rating/Price (4) + Padding (4)
                const textBlockHeight = 5 + 2 + addressHeight + 4 + 4;
                const cardHeight = Math.max(30, textBlockHeight); // Minimum height is 30 to fit image nicely

                checkPageOverflow(cardHeight + 4);

                // Card Background
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(241, 245, 249);
                doc.roundedRect(15, yPos, 180, cardHeight, 2, 2, "FD");

                // Draw Image
                const imgBase64 = hotelImages[index];
                const imageY = yPos + (cardHeight - 24) / 2;
                if (imgBase64) {
                    try {
                        doc.addImage(imgBase64, "JPEG", 18, imageY, 36, 24);
                    } catch (e) {
                        doc.setFillColor(241, 245, 249);
                        doc.rect(18, imageY, 36, 24, "F");
                    }
                } else {
                    doc.setFillColor(248, 250, 252);
                    doc.roundedRect(18, imageY, 36, 24, 1, 1, "F");
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(7.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text("PREVIEW", 36, imageY + 13, { align: "center" });
                }

                // Name
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(15, 23, 42);
                doc.text(hotel.name, 58, yPos + 7);

                // Address
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(wrappedAddress, 58, yPos + 12.5);

                // Rating & Price at the bottom
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(234, 88, 12);
                doc.text(`Rating: ${hotel.rating} / 5`, 58, yPos + cardHeight - 5);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(234, 88, 12);
                doc.text(sanitizePrice(hotel.price), 191, yPos + cardHeight - 5, { align: "right" });

                yPos += cardHeight + 4;
            }
            yPos += 4;

            // --- ITINERARY ---
            checkPageOverflow(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text("Daily Itinerary", 15, yPos);
            yPos += 7;

            for (let dayIndex = 0; dayIndex < trip.itinerary.length; dayIndex++) {
                const day = trip.itinerary[dayIndex];
                checkPageOverflow(15);

                // Day Title
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11.5);
                doc.setTextColor(234, 88, 12);
                doc.text(`Day ${day.day}: ${day.theme}`, 15, yPos);
                yPos += 6;

                for (let actIndex = 0; actIndex < day.activities.length; actIndex++) {
                    const activity = day.activities[actIndex];

                    const wrappedDesc = doc.splitTextToSize(activity.details, 122);
                    const descHeight = wrappedDesc.length * 3.8;
                    // Title (4.5) + Meta (4.5) + Desc (descHeight) + Padding
                    const textBlockHeight = 4.5 + 4.5 + descHeight + 6;
                    const cardHeight = Math.max(24, textBlockHeight); // Minimum 24 to fit image

                    checkPageOverflow(cardHeight + 4);

                    // Card Background
                    doc.setFillColor(250, 250, 250);
                    doc.setDrawColor(241, 245, 249);
                    doc.roundedRect(15, yPos, 180, cardHeight, 1.5, 1.5, "FD");

                    // Image
                    const actImgBase64 = activityImages[`${dayIndex}_${actIndex}`];
                    const actImgY = yPos + (cardHeight - 18) / 2;
                    if (actImgBase64) {
                        try {
                            doc.addImage(actImgBase64, "JPEG", 18, actImgY, 28, 18);
                        } catch (e) {
                            doc.setFillColor(241, 245, 249);
                            doc.rect(18, actImgY, 28, 18, "F");
                        }
                    } else {
                        doc.setFillColor(241, 245, 249);
                        doc.rect(18, actImgY, 28, 18, "F");
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(6.5);
                        doc.setTextColor(148, 163, 184);
                        doc.text("PREVIEW", 32, actImgY + 10, { align: "center" });
                    }

                    // Activity Name
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9.5);
                    doc.setTextColor(15, 23, 42);
                    doc.text(activity.place_name, 50, yPos + 6.5);

                    // Time & Cost
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7.5);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Time: ${activity.time}  |  Cost: ${sanitizePrice(activity.ticket_price)}`, 50, yPos + 11);

                    // Details Description
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7.5);
                    doc.setTextColor(71, 85, 105);
                    doc.text(wrappedDesc, 50, yPos + 15.5);

                    yPos += cardHeight + 3;
                }
                yPos += 3;
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
