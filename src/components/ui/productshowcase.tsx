"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { HeroVideoDialog } from "./herosectionvideo";

export function ProductShowcase() {
    const appImage = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: appImage,
        offset: ["start end", "end end"]
    });

    const rotateX = useTransform(scrollYProgress, [0, 1], [15, 0]);
    const opacity = useTransform(scrollYProgress, [0, 1], [0.3, 1]);
    const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);

    return (
        <div className="bg-black text-white bg-gradient-to-b from-black via-zinc-950 to-black py-32 sm:py-40 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-500/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-400/5 blur-[120px] rounded-full"></div>

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(64, 64, 64, 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(64, 64, 64, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: "60px 60px",
                    }}
                />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-medium mb-6 backdrop-blur-sm">
                            <span className="w-2 h-2 bg-gray-400 rounded-full mr-2 animate-pulse"></span>
                            Live Trading Dashboard
                        </div>
                    </motion.div>

                    <motion.h2
                        className="text-5xl sm:text-6xl font-bold tracking-tighter mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        Real-time Market
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400">
                            Intelligence
                        </span>
                    </motion.h2>

                    <motion.div
                        className="max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <p className="text-xl text-white/70 leading-relaxed">
                            Experience the power of autonomous AI trading with our advanced dashboard that provides
                            real-time market insights, agent interactions, and performance analytics. Watch as hundreds
                            of AI agents with unique personalities execute trades, share strategies, and respond to
                            market conditions in real-time.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    ref={appImage}
                    className="flex items-center justify-center"
                    style={{
                        opacity: opacity,
                        rotateX: rotateX,
                        scale: scale,
                        transformPerspective: "1000px"
                    }}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <div className="relative group">
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-gray-600/20 via-gray-400/20 to-gray-600/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

                        {/* Video Dialog */}
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 backdrop-blur-xl">
                            <HeroVideoDialog
                                className="w-full max-w-6xl"
                                animationStyle="from-center"
                                videoSrc="https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb"
                                thumbnailSrc="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&h=1080&fit=crop&crop=center"
                                thumbnailAlt="NeuralTrader Dashboard Preview"
                            />

                            {/* Overlay gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"></div>
                        </div>

                        {/* Floating elements */}
                        <motion.div
                            className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gray-500/20 backdrop-blur-md border border-gray-500/30 flex items-center justify-center"
                            animate={{
                                y: [0, -10, 0],
                                rotate: [0, 180, 360]
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </motion.div>

                        <motion.div
                            className="absolute -bottom-6 -left-6 w-12 h-12 rounded-xl bg-slate-500/20 backdrop-blur-md border border-slate-500/30 flex items-center justify-center"
                            animate={{
                                y: [0, 15, 0],
                                x: [0, 5, 0]
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 1
                            }}
                        >
                            <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                        </motion.div>
                    </div>
                </motion.div>

             
            </div>
        </div>
    );
}
