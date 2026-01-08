"use client";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { motion } from "motion/react";

export default function ContactPage() {
  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
        delay: i,
      },
    }),
  };

  const titleLines = ["PRENEZ CONTACT", "AVEC NOTRE EQUIPE"];

  return (
    <>
    <div className="min-h-screen bg-[#eaedf0] text-[#2f3b42]">
      <Header />

      <main className="particle-readability max-w-6xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <motion.h1
            className="text-2xl font-semibold leading-[1.1] tracking-tight text-[#3c4e58] lg:text-4xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
          >
            {titleLines.map((line, lineIndex) => (
              <div key={line} className="overflow-hidden">
                {line.split("").map((char, charIndex) => {
                  const delay = lineIndex * 0.2 + charIndex * 0.025;
                  return (
                    <motion.span
                      key={`${lineIndex}-${charIndex}-${char}`}
                      className="inline-block"
                      variants={{
                        hidden: { y: "110%", opacity: 0 },
                        visible: {
                          y: "0%",
                          opacity: 1,
                          transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay },
                        },
                      }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  );
                })}
              </div>
            ))}
          </motion.h1>
          <p className="max-w-sm text-base leading-relaxed text-[#4f5e66]">
            Une question, un projet, une demonstration ? Completez le formulaire ci-dessous, on vous repond au plus vite.
          </p>
        </div>

        <form className="mt-16 grid items-stretch gap-4 lg:grid-cols-2" action="#" method="POST">
          <div className="grid h-full grid-rows-3 gap-3">
            <motion.label
              className="block h-full border border-[#d5d9dc] bg-white p-5 shadow-sm"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              custom={0}
              viewport={{ once: true, amount: 0.2 }}
            >
              <div className="mb-2 text-sm font-semibold text-[#2f3b42]">-&gt; Mail</div>
              <input
                type="email"
                name="email"
                placeholder="Tapez votre mail"
                className="w-full border-0 bg-transparent text-2xl text-[#8a8f94] placeholder:text-[#8a8f94] focus:outline-none"
                required
              />
            </motion.label>

            <motion.label
              className="block h-full border border-[#d5d9dc] bg-white p-5 shadow-sm"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              custom={0.1}
              viewport={{ once: true, amount: 0.2 }}
            >
              <div className="mb-2 text-sm font-semibold text-[#2f3b42]">-&gt; Prenom</div>
              <input
                type="text"
                name="firstName"
                placeholder="Et votre prenom"
                className="w-full border-0 bg-transparent text-2xl text-[#8a8f94] placeholder:text-[#8a8f94] focus:outline-none"
                required
              />
            </motion.label>

            <motion.label
              className="block h-full border border-[#d5d9dc] bg-white p-5 shadow-sm"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              custom={0.2}
              viewport={{ once: true, amount: 0.2 }}
            >
              <div className="mb-2 text-sm font-semibold text-[#2f3b42]">-&gt; Nom</div>
              <input
                type="text"
                name="lastName"
                placeholder="Puis votre nom"
                className="w-full border-0 bg-transparent text-2xl text-[#8a8f94] placeholder:text-[#8a8f94] focus:outline-none"
                required
              />
            </motion.label>
          </div>

          <motion.div
            className="flex h-full flex-col border border-[#d5d9dc] bg-white p-5 shadow-sm"
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            custom={0.3}
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="mb-2 text-sm font-semibold text-[#2f3b42]">-&gt; Message</div>
            <textarea
              name="message"
              placeholder="Et enfin votre message ici"
              className="flex-1 min-h-0 w-full resize-none border-0 bg-transparent text-2xl text-[#8a8f94] placeholder:text-[#8a8f94] focus:outline-none"
              required
            />

            <div className="mt-4">
              <button
                type="submit"
                className="inline-flex items-center justify-center border border-[#2f3b42] px-6 py-2 text-lg font-medium text-[#2f3b42] transition hover:bg-[#2f3b42] hover:text-white"
              >
                Envoyer
              </button>
            </div>
          </motion.div>
        </form>
      </main>
    </div>

    <Footer />
    </>
  );
}

