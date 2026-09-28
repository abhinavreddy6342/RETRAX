import { Fragment } from "react";
import { History, BrainCircuit, ShieldAlert, Lightbulb, Workflow, ArrowRight, Activity } from "lucide-react";
import { motion } from "framer-motion";

export function LearningLoop({ counts = {}, onStep }) {
  const steps = [
    { label: "PAST INCIDENTS", icon: History, count: counts.incidents, target: "incidents" },
    { label: "HINDSIGHT MEMORY", icon: BrainCircuit, count: counts.memories, target: "memory-evidence" },
    { label: "CURRENT INCIDENT", icon: ShieldAlert, count: counts.current, target: "current-incident" },
    { label: "HISTORICAL REASONING", icon: Activity, count: counts.reasoning, target: "historical-reasoning" },
    { label: "ENGINEER ACTION", icon: Lightbulb, count: counts.actions, target: "action-form" },
    { label: "OUTCOME", icon: ArrowRight, count: counts.outcomes, target: "trajectory" },
    { label: "NEW MEMORY", icon: Workflow, count: counts.learning, target: "postmortems" },
  ];

  return (
    <section className="bottom-strip command-learning-loop" aria-label="Incident learning cycle">
      <div className="learning-loop-heading">
        <div>
          <span className="section-kicker">THE LEARNING LOOP</span>
          <h2>Past experience → future incident response</h2>
        </div>
        <span className="section-index">06</span>
      </div>

      <div className="learning-loop-steps">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Fragment key={step.label}>
              <motion.button
                type="button"
                className="flow-step"
                onClick={() => onStep?.(step.target)}
                aria-label={`${step.label}, ${step.count ?? "count unavailable"}; jump to details`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
                whileHover={{ y: -2 }}
              >
                <span className="flow-step-icon"><Icon size={15} /></span>
                <span className="flow-step-copy">
                  <span>{step.label}</span>
                  <small>{step.count ?? "—"}</small>
                </span>
              </motion.button>

              {index < steps.length - 1 && <ArrowRight size={13} className="flow-arrow" />}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
