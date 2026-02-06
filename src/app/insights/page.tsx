"use client";

import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Target,
  BarChart3,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { InsightCard } from "@/components/cards/insight-card";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { useUserStore } from "@/stores/user-store";

type FilterType = "all" | "info" | "warning" | "alert";

interface InsightDetail {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "alert";
  recommendations?: string[];
  impact?: string;
  action?: string;
}

export default function InsightsPage() {
  const { insights } = useUserStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedInsight, setSelectedInsight] = useState<InsightDetail | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const filteredInsights = filter === "all" 
    ? insights 
    : insights.filter((i) => i.severity === filter);

  const stats = {
    total: insights.length,
    info: insights.filter((i) => i.severity === "info").length,
    warning: insights.filter((i) => i.severity === "warning").length,
    alert: insights.filter((i) => i.severity === "alert").length,
  };

  // Extended insight data for modal
  const getInsightDetails = (insight: typeof insights[0]): InsightDetail => {
    const recommendations: Record<string, string[]> = {
      "Spending Alert": [
        "Set up automatic alerts for large purchases over $500",
        "Review subscription services for potential savings",
        "Consider using cash for discretionary spending",
      ],
      "Savings Milestone": [
        "Increase automatic savings by 5% next month",
        "Open a high-yield savings account",
        "Set your next milestone at $10,000",
      ],
      "Investment Opportunity": [
        "Max out your 401(k) contribution",
        "Consider index funds for diversification",
        "Review your risk tolerance annually",
      ],
    };

    const impacts: Record<string, string> = {
      "info": "This insight can help you save an additional $200-500/month",
      "warning": "Acting on this could prevent $300+ in unnecessary spending",
      "alert": "Addressing this immediately could save you from potential debt",
    };

    return {
      ...insight,
      severity: insight.severity || "info",
      recommendations: recommendations[insight.title] || [
        "Review your spending in this category",
        "Set a budget limit for next month",
        "Track progress weekly",
      ],
      impact: impacts[insight.severity || "info"],
    };
  };

  const handleViewDetails = (insight: typeof insights[0]) => {
    setSelectedInsight(getInsightDetails(insight));
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
            <p className="text-foreground-muted mt-1">
              AI-powered analysis of your financial patterns
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard interactive onClick={() => setFilter("all")}>
            <div className={`flex items-center gap-3 ${filter === "all" ? "opacity-100" : "opacity-60"}`}>
              <div className="p-2 rounded-lg bg-primary/10">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-sm text-foreground-muted">Total Insights</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard interactive onClick={() => setFilter("info")}>
            <div className={`flex items-center gap-3 ${filter === "info" ? "opacity-100" : "opacity-60"}`}>
              <div className="p-2 rounded-lg bg-accent/10">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.info}</p>
                <p className="text-sm text-foreground-muted">Positive</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard interactive onClick={() => setFilter("warning")}>
            <div className={`flex items-center gap-3 ${filter === "warning" ? "opacity-100" : "opacity-60"}`}>
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.warning}</p>
                <p className="text-sm text-foreground-muted">Warnings</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard interactive onClick={() => setFilter("alert")}>
            <div className={`flex items-center gap-3 ${filter === "alert" ? "opacity-100" : "opacity-60"}`}>
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingUp className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.alert}</p>
                <p className="text-sm text-foreground-muted">Alerts</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {filter === "all" ? "All Insights" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Insights`}
            </h2>
            <span className="text-sm text-foreground-muted">
              {filteredInsights.length} insight{filteredInsights.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid gap-4">
            {filteredInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                title={insight.title}
                description={insight.description}
                severity={insight.severity || "info"}
                action="View details"
                onAction={() => handleViewDetails(insight)}
              />
            ))}
          </div>
        </div>

        {/* AI Summary */}
        <GlassCard>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">AI Summary</h3>
              <p className="text-foreground-muted leading-relaxed">
                Overall, your finances are in good shape. Your spending is consistent and you&apos;re 
                maintaining a healthy savings rate of 32%. The main area for improvement is your 
                subscription spending, which has increased 15% over the last quarter. Consider 
                reviewing your recurring expenses to optimize your budget further.
              </p>
              <motion.button 
                onClick={() => setShowAnalysis(true)}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                whileHover={{ x: 3 }}
              >
                Get detailed analysis
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Insight Details Modal */}
      <Modal
        isOpen={selectedInsight !== null}
        onClose={() => setSelectedInsight(null)}
        title={selectedInsight?.title || ""}
        size="md"
      >
        {selectedInsight && (
          <div className="p-6 space-y-6">
            {/* Severity Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              selectedInsight.severity === "info" 
                ? "bg-accent/10 text-accent" 
                : selectedInsight.severity === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive"
            }`}>
              {selectedInsight.severity === "info" && <CheckCircle className="w-4 h-4" />}
              {selectedInsight.severity === "warning" && <AlertTriangle className="w-4 h-4" />}
              {selectedInsight.severity === "alert" && <TrendingUp className="w-4 h-4" />}
              {selectedInsight.severity.charAt(0).toUpperCase() + selectedInsight.severity.slice(1)}
            </div>

            {/* Description */}
            <p className="text-foreground-muted leading-relaxed">
              {selectedInsight.description}
            </p>

            {/* Impact */}
            <div className="p-4 rounded-xl bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Potential Impact</span>
              </div>
              <p className="text-sm text-foreground-muted">{selectedInsight.impact}</p>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {selectedInsight.recommendations?.map((rec, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">{index + 1}</span>
                    </div>
                    <span className="text-sm">{rec}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <motion.button
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                toast.success("Action plan created!");
                setSelectedInsight(null);
              }}
            >
              Create Action Plan
            </motion.button>
          </div>
        )}
      </Modal>

      {/* Detailed Analysis Modal */}
      <Modal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        title="Detailed Financial Analysis"
        subtitle="AI-powered deep dive into your finances"
        size="lg"
      >
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary text-center">
              <p className="text-sm text-foreground-muted mb-1">Health Score</p>
              <p className="text-3xl font-semibold text-primary">85</p>
              <p className="text-xs text-success mt-1">+5 from last month</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary text-center">
              <p className="text-sm text-foreground-muted mb-1">Savings Rate</p>
              <p className="text-3xl font-semibold">32%</p>
              <p className="text-xs text-success mt-1">Above average</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary text-center">
              <p className="text-sm text-foreground-muted mb-1">Risk Level</p>
              <p className="text-3xl font-semibold text-accent">Low</p>
              <p className="text-xs text-foreground-muted mt-1">Well balanced</p>
            </div>
          </div>

          {/* Analysis Sections */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-success/5 border border-success/20">
              <h4 className="font-semibold text-success mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Strengths
              </h4>
              <ul className="text-sm text-foreground-muted space-y-1">
                <li>• Consistent income with 5.2% growth</li>
                <li>• Emergency fund covers 4.5 months of expenses</li>
                <li>• Diversified investment portfolio</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
              <h4 className="font-semibold text-warning mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Areas for Improvement
              </h4>
              <ul className="text-sm text-foreground-muted space-y-1">
                <li>• Subscription spending up 15% (review needed)</li>
                <li>• Dining out exceeds budget by $150/month</li>
                <li>• Could optimize tax-advantaged accounts</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                6-Month Projection
              </h4>
              <p className="text-sm text-foreground-muted">
                At your current rate, you&apos;ll reach your savings goal in approximately 8 months. 
                Reducing subscription costs by $100/month would accelerate this to 6.5 months.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              toast.success("Analysis exported to PDF!");
              setShowAnalysis(false);
            }}
          >
            Export Full Report
          </motion.button>
        </div>
      </Modal>
    </PageTransition>
  );
}
