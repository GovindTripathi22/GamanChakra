"use client";

import { motion } from "framer-motion";
import { Cloud, CloudRain, CloudSun, Sun, Wind } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WeatherWidgetProps {
    destination: string;
}

export function WeatherWidget({ destination }: WeatherWidgetProps) {
    // Mock weather data generator
    const generateForecast = () => {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
        const conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy"];

        return days.map((day, index) => {
            const temp = 20 + Math.floor(Math.random() * 10); // 20-30°C
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            return { day, temp, condition };
        });
    };

    const forecast = generateForecast();

    const getWeatherIcon = (condition: string) => {
        switch (condition) {
            case "Sunny":
                return <Sun className="h-6 w-6 text-yellow-500" />;
            case "Cloudy":
                return <Cloud className="h-6 w-6 text-gray-400" />;
            case "Rainy":
                return <CloudRain className="h-6 w-6 text-blue-400" />;
            default:
                return <CloudSun className="h-6 w-6 text-orange-400" />;
        }
    };

    return (
        <Card className="border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <CloudSun className="h-6 w-6 text-orange-500" />
                <h2 className="text-2xl font-semibold text-slate-900">Weather Forecast</h2>
            </div>

            <div className="mb-4">
                <p className="text-sm text-slate-500">5-Day Forecast for</p>
                <p className="text-lg font-medium text-slate-900">{destination}</p>
            </div>

            <div className="flex justify-between gap-2">
                {forecast.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex flex-col items-center rounded-lg bg-slate-50 p-2 text-center"
                    >
                        <span className="mb-2 text-xs text-slate-500">{item.day}</span>
                        <div className="mb-2">{getWeatherIcon(item.condition)}</div>
                        <span className="text-sm font-bold text-slate-900">{item.temp}°</span>
                    </motion.div>
                ))}
            </div>
        </Card>
    );
}
