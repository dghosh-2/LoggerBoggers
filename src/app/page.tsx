'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, X, TrendingUp, Wallet, PiggyBank, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { useUIStore } from '@/stores/ui-store';

const STEPS = [
  { id: 'age', label: 'How old are you?', type: 'number', placeholder: '25' },
  { id: 'location', label: 'Where are you located?', type: 'text', placeholder: 'Pittsburgh, PA' },
  { id: 'riskTolerance', label: 'What\'s your risk tolerance?', type: 'select', options: ['Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'] },
  { id: 'debtProfile', label: 'Tell us about any debt', type: 'textarea', placeholder: 'Student loans, credit cards, mortgage...' },
  { id: 'incomeStatus', label: 'What\'s your income status?', type: 'textarea', placeholder: 'Student, employed, freelancer...' },
  { id: 'customRequest', label: 'Any specific financial goals?', type: 'textarea', placeholder: 'Save for a house, pay off debt, invest more...' },
];

function FloatingCard({
  children,
  className,
  delay = 0,
  rotateX,
  rotateY,
  z = 0,
  floatOffset = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  rotateX: ReturnType<typeof useSpring>;
  rotateY: ReturnType<typeof useSpring>;
  z?: number;
  floatOffset?: number;
}) {
  const scale = 1 + z * 0.0005;
  const moveMultiplier = 1 + z * 0.01;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: 15 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateX: 0,
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      style={{
        rotateX: useTransform(rotateX, v => v * moveMultiplier),
        rotateY: useTransform(rotateY, v => v * moveMultiplier),
        scale,
        z,
      }}
      className={className}
    >
      <motion.div
        animate={{
          y: [0, -8 - floatOffset, 0],
        }}
        transition={{
          duration: 4 + floatOffset * 0.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay + floatOffset * 0.2,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const { setNavbarHidden } = useUIStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({
    age: '',
    location: '',
    riskTolerance: 'Moderate',
    debtProfile: '',
    incomeStatus: '',
    customRequest: '',
  });
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [8, -8]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), { stiffness: 100, damping: 30 });

  useEffect(() => {
    setNavbarHidden(true);
    return () => setNavbarHidden(false);
  }, [setNavbarHidden]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden -mx-6 md:-mx-8 -my-6 md:-my-8"
      style={{ perspective: '1200px' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-radial from-accent/10 via-transparent to-transparent blur-3xl"
        />
      </div>

      {/* Title at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-8 md:top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 md:gap-5"
      >
        <div
          className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center p-2.5 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #E8384F 0%, #C41230 50%, #8B0D21 100%)',
            boxShadow: '0 8px 32px rgba(200, 30, 60, 0.4)'
          }}
        >
          <Image src="/logo.png" alt="Scotty's Ledger" width={40} height={40} className="object-contain" />
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-[-0.02em]">
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #FF4D6A 0%, #E8384F 25%, #C41230 50%, #A01028 100%)',
            }}
          >
            scotty&apos;s
          </span>
          <span className="text-foreground ml-2 md:ml-3">ledger</span>
        </h1>
      </motion.div>

      {/* 3D Floating Elements Scene */}
      <div className="relative w-full max-w-5xl mx-auto h-[70vh] flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>

        {/* Background layer - large card */}
        <FloatingCard
          rotateX={rotateX}
          rotateY={rotateY}
          z={-100}
          delay={0.2}
          floatOffset={2}
          className="absolute w-[500px] h-[320px] md:w-[700px] md:h-[420px]"
        >
          <div className="w-full h-full rounded-3xl bg-gradient-to-br from-secondary/80 via-secondary/40 to-transparent border border-border/50 backdrop-blur-sm shadow-2xl" />
        </FloatingCard>

        {/* Main dashboard preview card */}
        <FloatingCard
          rotateX={rotateX}
          rotateY={rotateY}
          z={50}
          delay={0.4}
          floatOffset={0}
          className="absolute w-[420px] h-[280px] md:w-[580px] md:h-[360px]"
        >
          <div className="w-full h-full rounded-2xl bg-card/95 border border-border shadow-2xl overflow-hidden backdrop-blur-md">
            {/* Mock dashboard header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Image src="/logo.png" alt="" width={20} height={20} />
                </div>
                <span className="text-sm font-semibold">Dashboard</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-border" />
                <div className="w-3 h-3 rounded-full bg-border" />
                <div className="w-3 h-3 rounded-full bg-border" />
              </div>
            </div>

            {/* Mock stats */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Balance', value: '$47,250', icon: Wallet, color: 'text-foreground' },
                { label: 'Income', value: '$9,500', icon: TrendingUp, color: 'text-success' },
                { label: 'Savings', value: '67%', icon: PiggyBank, color: 'text-foreground' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
                  className="p-4 rounded-xl bg-secondary/50 border border-border"
                >
                  <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                  <p className="text-xs text-foreground-muted">{stat.label}</p>
                  <p className="text-lg font-semibold font-mono">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Mock chart area */}
            <div className="px-6 pb-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="h-24 rounded-xl bg-secondary/30 border border-border flex items-end justify-around px-4 pb-3"
              >
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 1.4 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                    className="w-6 bg-foreground/20 rounded-t"
                  />
                ))}
              </motion.div>
            </div>
          </div>
        </FloatingCard>

        {/* Floating accent card - top right */}
        <FloatingCard
          rotateX={rotateX}
          rotateY={rotateY}
          z={120}
          delay={0.6}
          floatOffset={3}
          className="absolute top-[10%] right-[5%] md:right-[10%]"
        >
          <div className="px-5 py-4 rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Monthly Growth</p>
                <p className="text-lg font-semibold text-success">+12.5%</p>
              </div>
            </div>
          </div>
        </FloatingCard>

        {/* Floating accent card - bottom left */}
        <FloatingCard
          rotateX={rotateX}
          rotateY={rotateY}
          z={80}
          delay={0.7}
          floatOffset={1}
          className="absolute bottom-[15%] left-[5%] md:left-[12%]"
        >
          <div className="px-5 py-4 rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-foreground-muted" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Expenses</p>
                <p className="text-lg font-semibold">$6,400</p>
              </div>
            </div>
          </div>
        </FloatingCard>

      </div>

      {/* CTA Button at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-30"
      >
        <motion.button
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative inline-flex items-center gap-3 px-10 py-4 bg-foreground text-background rounded-lg font-mono text-sm uppercase tracking-widest font-medium transition-all duration-300 hover:shadow-2xl hover:shadow-foreground/25 overflow-hidden"
        >
          <span className="relative z-10">Get Started</span>
          <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground-secondary to-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        </motion.button>
      </motion.div>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4"
            >
              <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <Image src="/logo.png" alt="" width={20} height={20} />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">Personalize your experience</h2>
                        <p className="text-xs text-foreground-muted">Step {currentStep + 1} of {STEPS.length}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                      <X className="w-4 h-4 text-foreground-muted" />
                    </button>
                  </div>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <motion.div className="h-full bg-foreground rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>

                <div className="p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-xl font-semibold mb-6">{step.label}</h3>

                      {step.type === 'number' && (
                        <input type="number" name={step.id} value={formData[step.id]} onChange={handleChange}
                          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
                          placeholder={step.placeholder} />
                      )}

                      {step.type === 'text' && (
                        <input type="text" name={step.id} value={formData[step.id]} onChange={handleChange}
                          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
                          placeholder={step.placeholder} />
                      )}

                      {step.type === 'select' && (
                        <div className="grid grid-cols-2 gap-3">
                          {step.options?.map((opt) => (
                            <button key={opt} type="button" onClick={() => setFormData(prev => ({ ...prev, [step.id]: opt }))}
                              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${formData[step.id] === opt ? 'bg-foreground text-background border-foreground' : 'bg-background border-border hover:border-foreground-muted'}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {step.type === 'textarea' && (
                        <textarea name={step.id} value={formData[step.id]} onChange={handleChange} rows={3}
                          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all resize-none"
                          placeholder={step.placeholder} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="px-6 pb-6 pt-2 flex gap-3">
                  {currentStep > 0 && (
                    <button onClick={handleBack} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-border font-medium text-sm hover:bg-secondary transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                  {currentStep < STEPS.length - 1 ? (
                    <button onClick={handleNext} className={`${currentStep > 0 ? 'flex-[2]' : 'w-full'} flex items-center justify-center gap-2 py-3 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity`}>
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={loading}
                      className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {loading ? 'Setting up...' : 'Start Exploring'} {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
