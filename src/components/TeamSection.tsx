"use client";

import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animationVariants";
import { Spotlight } from "@/components/ui/spotlight";

const team = [
  {
    name: "Aditya",
    role: "Founder",
    bio: "Building self-maintaining APIs.",
    twitter: "https://x.com/Repairoai",
    linkedin: "https://www.linkedin.com/in/aditya-shinde-ai/",
    avatar: "/images/aditya.png"
  },
  {
    name: "Sanjay",
    role: "CTO",
    bio: "Scaling infrastructure and developer experience.",
    twitter: "https://x.com/Repairoai",
    linkedin: "https://www.linkedin.com/in/sanjaynandanj/",
    avatar: "/images/sanjay.png"
  }
];

export function TeamSection() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto border-t border-hairline relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[400px] bg-accent-blue-glow rounded-full blur-[120px] opacity-20 pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative z-10"
      >
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-medium text-ink tracking-tight mb-4">
            Built by developers, for developers.
          </h2>
          <p className="text-lg text-mute max-w-2xl mx-auto">
            We're on a mission to eliminate manual API maintenance and make breaking changes a thing of the past.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {team.map((member) => (
            <motion.div 
              key={member.name}
              variants={itemVariants}
              className="relative bg-surface-card border border-hairline-strong p-8 rounded-2xl flex flex-col items-center text-center hover:border-hairline transition-colors group overflow-hidden"
            >
              <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-2xl" size={300} />
              <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-surface-elevated border border-hairline flex items-center justify-center text-2xl font-display text-ink mb-6 group-hover:scale-105 transition-transform overflow-hidden">
                {member.avatar.includes('/') ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  member.avatar
                )}
              </div>
              <h3 className="text-xl font-medium text-ink mb-1">{member.name}</h3>
              <p className="text-accent-blue text-sm font-medium mb-4">{member.role}</p>
              <p className="text-mute text-sm mb-6 flex-grow">{member.bio}</p>
              
              <div className="flex items-center gap-4">
                <a 
                  href={member.twitter} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-charcoal hover:text-ink transition-colors"
                >
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-charcoal hover:text-ink transition-colors"
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
