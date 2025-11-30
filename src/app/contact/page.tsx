"use client";

import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-20">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16 text-center"
                >
                    <h1 className="mb-4 font-serif text-4xl font-bold text-slate-900 md:text-5xl">
                        Get in Touch
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-slate-600">
                        Have questions about your trip? Need help with our AI planner? We're here to help you explore the world.
                    </p>
                </motion.div>

                <div className="grid gap-12 lg:grid-cols-2">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-8"
                    >
                        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 text-center py-12">
                            <div className="mb-4 flex justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <MapPin className="h-8 w-8" />
                                </div>
                            </div>
                            <h3 className="mb-2 text-2xl font-bold text-slate-900">Contact Info</h3>
                            <p className="text-lg text-slate-500 font-medium">Coming Soon</p>
                        </div>

                        <div className="rounded-3xl bg-orange-500 p-8 text-white shadow-lg">
                            <h3 className="mb-4 text-2xl font-bold">Frequently Asked Questions</h3>
                            <p className="mb-6 opacity-90">
                                Find quick answers to common questions about our AI trip planner, pricing, and features in our Help Center.
                            </p>
                            <Button variant="secondary" className="w-full bg-white text-orange-600 hover:bg-slate-50">
                                Visit Help Center
                            </Button>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-3xl bg-white p-8 shadow-lg border border-slate-100"
                    >
                        <h3 className="mb-6 text-2xl font-bold text-slate-900">Send us a Message</h3>
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">First Name</label>
                                    <Input placeholder="John" className="bg-slate-50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Last Name</label>
                                    <Input placeholder="Doe" className="bg-slate-50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Email</label>
                                <Input type="email" placeholder="john@example.com" className="bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Subject</label>
                                <Input placeholder="How can we help?" className="bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Message</label>
                                <Textarea placeholder="Tell us more about your inquiry..." className="min-h-[150px] bg-slate-50" />
                            </div>
                            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg">
                                <Send className="mr-2 h-5 w-5" /> Send Message
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
