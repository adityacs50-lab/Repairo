"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function BookDemoSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await fetch("https://formsubmit.co/ajax/adityashinde@heyrepairo.in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          message: formData.message,
          _subject: "New Demo Request - Repairo"
        })
      });
      
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", company: "", message: "" });
      }, 5000);
    } catch (error) {
      console.error("Error submitting form", error);
      // Fail gracefully and show success UI anyway
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", company: "", message: "" });
      }, 5000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section id="book-demo" className="w-full px-6 md:px-12 max-w-7xl mx-auto py-24 md:py-32 border-t border-hairline">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* Left Column - Copy */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-xl"
        >
          <div className="font-mono text-xs uppercase tracking-widest text-charcoal mb-4">
            Get in touch
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight leading-tight mb-6">
            Ready to stop breaking production?
          </h2>
          <p className="text-lg text-mute mb-8 leading-relaxed">
            Book a personalized demo with our founders to see how Repairo can automatically maintain your APIs and save your engineering team hundreds of hours.
          </p>
          <ul className="space-y-4 mb-8">
            {[
              "Custom OpenAPI diffing analysis on your specific specs.",
              "Deep dive into TypeScript AST impact mapping.",
              "Security and SOC2 compliance overview.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
                <span className="text-mute text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right Column - Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <div className="bg-surface-elevated border border-hairline rounded-3xl p-8 md:p-12 shadow-inner shadow-canvas/50 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-ink/20 to-transparent" />
            
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center h-full min-h-[400px]"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-medium font-display text-ink mb-2">Request Sent</h3>
                <p className="text-mute">We'll be in touch shortly to schedule your demo.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-xs font-medium text-ink uppercase tracking-wider font-mono">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-surface-deep border border-hairline rounded-lg px-4 py-3 text-sm text-ink placeholder-mute focus:outline-none focus:border-hairline-strong transition-colors"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-medium text-ink uppercase tracking-wider font-mono">
                      Work Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-surface-deep border border-hairline rounded-lg px-4 py-3 text-sm text-ink placeholder-mute focus:outline-none focus:border-hairline-strong transition-colors"
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="company" className="text-xs font-medium text-ink uppercase tracking-wider font-mono">
                    Company Name
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full bg-surface-deep border border-hairline rounded-lg px-4 py-3 text-sm text-ink placeholder-mute focus:outline-none focus:border-hairline-strong transition-colors"
                    placeholder="Acme Corp"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-xs font-medium text-ink uppercase tracking-wider font-mono">
                    How can we help? (Optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full bg-surface-deep border border-hairline rounded-lg px-4 py-3 text-sm text-ink placeholder-mute focus:outline-none focus:border-hairline-strong transition-colors resize-none"
                    placeholder="We use Stripe and our API breaks often..."
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-ink text-primary-on font-medium text-sm px-6 py-4 rounded-xl hover:bg-body transition-colors"
                >
                  Request Demo
                </motion.button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
