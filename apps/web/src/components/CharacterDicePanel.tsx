import { useMemo, useState, type ReactNode } from "react";
import type { CharacterDTO, AttrKey, SkillKey } from "@action-thread/types";
import DiceRoller from "./DiceRoller";
import { conditionPenaltyForAttribute } from "../lib/conditions";
import type { RollResult } from "../lib/dice";

type Props = {
  dto: CharacterDTO;
  onSpendAdrenaline?: (amount: number) => void;
  onPaidRerollSpend?: (amount: number) => void;
  className?: string;
  onRollEvent?: (
    kind: "roll" | "freeReroll" | "paidReroll" | "allIn",
    result: RollResult
  ) => void;
  // 🔹 Called when a Gamble roll finishes and we know how many Snake Eyes were rolled
  onGambleGritLoss?: (amount: number) => void;
};

const ATTR_LABEL: Record<AttrKey, string> = {
  brawn: "Brawn",
  nerves: "Nerves",
  smooth: "Smooth",
  focus: "Focus",
  crime: "Crime",
};

export default function CharacterDicePanel({
  dto,
  onSpendAdrenaline,
  onPaidRerollSpend,
  className = "",
  onRollEvent,
  onGambleGritLoss,
}: Props) {
  const [attr, setAttr] = useState<AttrKey>("nerves");
  const [skill, setSkill] = useState<SkillKey>("shoot");
  const [adHoc, setAdHoc] = useState<number>(0);
  const [spendAdrenalineNow, setSpendAdrenalineNow] = useState<boolean>(false);
  const [gamble, setGamble] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);

  const attrVal = Number(dto.attributes?.[attr] ?? 0);
  const skillVal = Number(dto.skills?.[skill] ?? 0);

  const condPenalty = useMemo(
    () => conditionPenaltyForAttribute(attr, dto),
    // recompute when the conditions payload changes, even if mutated in place
    [attr, JSON.stringify(dto.conditions ?? null)]
  );

  const preRollAdrenaline = spendAdrenalineNow ? 1 : 0;
  const modifier = useMemo(
    () => condPenalty + preRollAdrenaline + Number(adHoc || 0),
    [condPenalty, preRollAdrenaline, adHoc]
  );

  const canSpendAdrenaline =
    Number(dto.resources?.adrenaline ?? dto.resources?.luck ?? 0) > 0;

  function handleToggleSpend() {
    setSpendAdrenalineNow((prev) => {
      const next = !prev;
      if (next && canSpendAdrenaline) onSpendAdrenaline?.(1);
      return next;
    });
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Attribute / Skill / Condition */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Attribute">
          <select
            className="w-full border border-gray-400 bg-white text-gray-900 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            value={attr}
            onChange={(e) => setAttr(e.target.value as AttrKey)}
          >
            {(Object.keys(ATTR_LABEL) as AttrKey[]).map((k) => (
              <option key={k} value={k}>
                {ATTR_LABEL[k]} ({Number(dto.attributes?.[k] ?? 0)})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Skill">
          <select
            className="w-full border border-gray-400 bg-white text-gray-900 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            value={skill}
            onChange={(e) => setSkill(e.target.value as SkillKey)}
          >
            {Object.keys(dto.skills ?? {})
              .sort()
              .map((k) => (
                <option key={k} value={k}>
                  {capitalize(k)} ({Number(dto.skills?.[k as SkillKey] ?? 0)})
                </option>
              ))}
          </select>
        </Field>

        <Field label="Condition Penalty (auto)">
          <div className="px-2 py-1 rounded border border-gray-400 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-500 text-sm font-semibold">
            {condPenalty}
          </div>
        </Field>
      </div>

      {/* Spend adrenaline / ad-hoc / summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Spend 1 Adrenaline now (+1 die)">
          <button
            type="button"
            onClick={handleToggleSpend}
            disabled={!canSpendAdrenaline && !spendAdrenalineNow}
            className={`px-3 py-1 rounded text-sm font-semibold border transition-colors ${
              spendAdrenalineNow
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            } disabled:opacity-50`}
          >
            {spendAdrenalineNow ? "Spending 1" : "Not spending"}
          </button>
        </Field>

        <Field label="Ad-hoc Modifier (±)">
          <input
            type="number"
            inputMode="numeric"
            className="w-full border border-gray-400 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            value={adHoc}
            onChange={(e) => setAdHoc(parseInt(e.target.value || "0", 10))}
          />
        </Field>

        <Field label="Selected (A + S)">
          <div className="px-2 py-1 rounded border border-gray-400 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-500 font-semibold text-sm">
            {ATTR_LABEL[attr]} {attrVal} + {capitalize(skill)} {skillVal}
          </div>
        </Field>
      </div>

      {/* 🔹 Gamble toggle + resolve button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Field label="Gamble (Snake Eyes cost 1 Grit each)">
          <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={gamble}
              onChange={(e) => setGamble(e.target.checked)}
            />
            <span>
              When this roll is a Gamble, each final <code>1</code> on the dice makes you
              lose 1 Grit.
            </span>
          </label>
        </Field>

        <button
          type="button"
          className="mt-1 inline-flex items-center rounded-md border border-slate-400 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 shadow-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!gamble || !lastResult}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!gamble || !lastResult) return;
            const counts = lastResult.breakdown?.counts ?? {};
            const snakeEyes = counts[1] ?? 0;
            if (snakeEyes > 0) {
              onGambleGritLoss?.(snakeEyes);
            }
            setGamble(false);
          }}
        >
          Resolve Gamble
        </button>
      </div>

      {/* Embedded roller */}
      <DiceRoller
        attribute={attrVal}
        skill={skillVal}
        modifier={modifier}
        defaultDifficulty="basic"
        canSpendAdrenaline={canSpendAdrenaline}
        onPaidReroll={() => onPaidRerollSpend?.(1)}
        onRollEvent={(kind, result) => {
          // 🔹 Track the most recent result in this roll chain
          setLastResult(result);

          // Preserve existing behavior (chat logging, etc.)
          onRollEvent?.(kind, result);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-zinc-800 dark:text-gray-100 mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}