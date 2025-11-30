"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GeneratedTrip } from "@/actions/generate-trip";

interface PdfExportButtonProps {
    trip: GeneratedTrip;
}

export function PdfExportButton({ trip }: PdfExportButtonProps) {
    const generatePdf = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(22);
        doc.setTextColor(240, 90, 34); // Orange
        doc.text("Gamanchakra Itinerary", 14, 20);

        // Trip Details
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Destination: ${trip.trip_details.destination}`, 14, 30);
        doc.text(`Duration: ${trip.trip_details.duration}`, 14, 36);
        doc.text(`Budget: ${trip.trip_details.budget}`, 14, 42);
        doc.text(`Vibe: ${trip.trip_details.vibe}`, 14, 48);

        let yPos = 60;

        // Hotels
        doc.setFontSize(16);
        doc.setTextColor(240, 90, 34);
        doc.text("Recommended Hotels", 14, yPos);
        yPos += 10;

        const hotelData = trip.hotels.map((hotel) => [
            hotel.name,
            hotel.address,
            hotel.price,
            hotel.rating + " Stars",
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [["Name", "Address", "Price", "Rating"]],
            body: hotelData,
            theme: "striped",
            headStyles: { fillColor: [240, 90, 34] },
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 20;

        // Itinerary
        doc.setFontSize(16);
        doc.setTextColor(240, 90, 34);
        doc.text("Daily Itinerary", 14, yPos);
        yPos += 10;

        trip.itinerary.forEach((day) => {
            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`Day ${day.day}: ${day.theme}`, 14, yPos);
            yPos += 8;

            const activityData = day.activities.map((activity) => [
                activity.time,
                activity.place_name,
                activity.details,
                activity.ticket_price,
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [["Time", "Activity", "Details", "Cost"]],
                body: activityData,
                theme: "grid",
                headStyles: { fillColor: [50, 50, 50] },
            });

            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 15;
        });

        // Transportation Plan
        if (trip.transportation_plan && trip.transportation_plan.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(16);
            doc.setTextColor(240, 90, 34);
            doc.text("How to Reach", 14, yPos);
            yPos += 10;

            const transportData = trip.transportation_plan.map((step) => [
                step.mode,
                step.details,
                step.duration,
                step.estimated_cost
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [["Mode", "Details", "Duration", "Cost"]],
                body: transportData,
                theme: "striped",
                headStyles: { fillColor: [240, 90, 34] },
            });
        }

        doc.save(`Gamanchakra_Trip_${trip.trip_details.destination}.pdf`);
    };

    return (
        <Button onClick={generatePdf} variant="outline" className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
            <Download className="h-4 w-4" />
            Download PDF
        </Button>
    );
}
