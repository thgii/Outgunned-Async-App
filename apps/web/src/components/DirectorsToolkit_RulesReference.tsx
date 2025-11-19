import React from "react";

export default function RulesReference() {
  return (
    <section className="w-full">
      <div className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-zinc-900/90">
        <header className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            🎬 Director’s Toolkit: <span className="whitespace-nowrap">Core Cinematic Rolls &amp; Resources</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quick-reference for dice, success tiers, rerolls, all-in, adrenaline, spotlights, and cinematic outcomes.
          </p>
        </header>

        {/* SUCCESS */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🎯 Success</h3>

          <p className="text-sm leading-relaxed mb-3">
            You get a <span className="font-medium">Success</span> for each set of two or more dice that land on the same face.
            The symbol on the dice makes no difference.
          </p>

          <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-800 mb-4">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-gray-200">
                <tr>
                  <th className="px-3 py-2">Success Level</th>
                  <th className="px-3 py-2">Set</th>
                  <th className="px-3 py-2">Meaning</th>
                </tr>
              </thead>
              <tbody className="align-top divide-y divide-gray-200 dark:divide-zinc-800 text-black">
                <tr className="bg-white dark:bg-zinc-900">
                  <td className="px-3 py-2 font-medium">Basic Success</td>
                  <td className="px-3 py-2">2-of-a-kind</td>
                  <td className="px-3 py-2">Pass Basic rolls.</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-zinc-950/50">
                  <td className="px-3 py-2 font-medium">Critical Success</td>
                  <td className="px-3 py-2">3-of-a-kind</td>
                  <td className="px-3 py-2">Pass Critical rolls.</td>
                </tr>
                <tr className="bg-white dark:bg-zinc-900">
                  <td className="px-3 py-2 font-medium">Extreme Success</td>
                  <td className="px-3 py-2">4-of-a-kind</td>
                  <td className="px-3 py-2">Pass Extreme rolls.</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-zinc-950/50">
                  <td className="px-3 py-2 font-medium">Impossible Success</td>
                  <td className="px-3 py-2">5-of-a-kind</td>
                  <td className="px-3 py-2">Heroic, breathtaking result.</td>
                </tr>
                <tr className="bg-white dark:bg-zinc-900">
                  <td className="px-3 py-2 font-medium">Jackpot!</td>
                  <td className="px-3 py-2">6+-of-a-kind</td>
                  <td className="px-3 py-2">You become the Director for one turn!</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm leading-relaxed mb-2">
            To pass a <span className="font-medium">Basic roll</span>, you need a Basic Success.  
            To pass an <span className="font-medium">Extreme roll</span>, you need an Extreme Success.
          </p>

          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed dark:bg-zinc-800/50">
            <p className="mb-1 font-medium">Three = One, One = Three</p>
            <p className="mb-1">• Three smaller successes equal one greater success.</p>
            <p className="mb-1">• One greater success can be split into three smaller successes.</p>
            <p className="mt-2">
              Examples: 3 Basic → 1 Critical.  
              3 Critical → 1 Extreme.  
              And vice-versa.
            </p>
          </div>

          <p className="text-sm leading-relaxed mt-3">
            If you score <span className="font-medium">higher</span> than needed, the Director may grant an enhanced outcome.  
            If you score <span className="font-medium">lower</span>, you may mitigate some consequences.
          </p>

          <p className="text-sm leading-relaxed mt-2">
            If you roll a <span className="font-medium">Jackpot!</span> you become the Director for one turn —
            describe how your sensational actions take control of the scene.
          </p>

          <p className="text-sm leading-relaxed mt-2">
            Remember: <span className="font-medium">we are not playing poker.</span>  
            A full house = Critical + Basic. A flush = beautiful failure.
          </p>
        </section>

        {/* SUCCESS RATES */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">📊 Success Rates</h3>
          <p className="text-sm mb-3">Chance of achieving each success level with and without rerolls.</p>

          <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-800">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-gray-200">
                <tr>
                  <th className="px-3 py-2">Dice</th>
                  <th className="px-3 py-2">Critical</th>
                  <th className="px-3 py-2">Critical (Re-roll)</th>
                  <th className="px-3 py-2">Extreme</th>
                  <th className="px-3 py-2">Extreme (Re-roll)</th>
                  <th className="px-3 py-2">Impossible</th>
                  <th className="px-3 py-2">Impossible (Re-roll)</th>
                </tr>
              </thead>
              <tbody className="align-top divide-y divide-gray-200 dark:divide-zinc-800 text-black">
                {[
                  ["2", "17%", "–", "–", "–", "–", "–"],
                  ["3", "45%", "3%", "5%", "–", "–", "–"],
                  ["4", "72%", "10%", "21%", "0.5%", "1.5%", "–"],
                  ["5", "91%", "21%", "47%", "2%", "9%", "0.1%", "0.5%"],
                  ["6", "99%", "37%", "75%", "5%", "26%", "0.5%", "3.5%"],
                  ["7", "100%", "54%", "89%", "11%", "51%", "1%", "13%"],
                  ["8", "100%", "70%", "99%", "18%", "75%", "3%", "32%"],
                  ["9", "100%", "84%", "99%", "28%", "90%", "5%", "57%"],
                ].map((row, i) => (
                  <tr key={i} className={i % 2 ? "bg-gray-50 dark:bg-zinc-950/50" : "bg-white dark:bg-zinc-900"}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* REROLL */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🔁 Re-roll</h3>
          <p className="text-sm leading-relaxed mb-3">
            If you score at least <span className="font-medium">one Basic Success</span>, you may re-roll all dice that were not part of a combination.
          </p>

          <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
            <li>Re-rolling GREATLY increases your odds — you should do it often.</li>
            <li>If the new result is better: keep it.</li>
            <li>If it is not better: you lose one previously scored success (your choice which).</li>
            <li>A new roll is “better” if:
              <ul className="list-disc pl-5 mt-1">
                <li>You generate any additional success, OR</li>
                <li>You transform an existing success into a greater success.</li>
              </ul>
            </li>
          </ul>

          <p className="text-sm leading-relaxed mt-3 font-medium">
            Re-rolls are NOT dangerous — Heroes should re-roll most of the time.
          </p>
        </section>

        {/* FREE REROLL */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🎁 Free Re-roll</h3>
          <p className="text-sm leading-relaxed mb-2">
            Some Feats grant a Free Re-roll (Gunslinger when using guns, Military Training when relying on discipline, etc).
          </p>

          <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
            <li>You NEVER risk losing your original success.</li>
            <li>You may use a Free Re-roll even if your first roll had <span className="font-medium">zero</span> successes.</li>
            <li>A Free Re-roll replaces your normal re-roll — use it whenever possible.</li>
          </ul>
        </section>

        {/* ALL IN */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🔥 All In</h3>
          <p className="text-sm leading-relaxed mb-3">
            If after a Re-roll or Free Re-roll your result improved, you may choose to go <span className="font-medium">All In</span>.
          </p>

          <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
            <li>Roll all dice that were not part of a success again.</li>
            <li>If the result improves again → great!</li>
            <li>If not → you lose <span className="font-medium">ALL</span> previously scored successes.</li>
          </ul>

          <p className="text-sm font-medium mt-2">
            All In is dangerous — use sparingly and only in desperate moments.
          </p>
        </section>

        {/* RECAP */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">📘 Roll Recap</h3>
          <ol className="list-decimal pl-5 text-sm leading-relaxed space-y-1">
            <li>Roll the dice.</li>
            <li>Tally all successes.</li>
            <li>If you have ≥ 1 success → you may Re-roll.</li>
            <li>If you have a Free Re-roll → you may Re-roll even on 0 successes.</li>
            <li>If a Re-roll improves the result → you may go All In.</li>
          </ol>
        </section>

        {/* Existing sections below unchanged */}
        {/* Extra Actions */}
        <section className="mt-10">
          <h3 className="mb-2 text-lg font-semibold">⚡ Extra Actions</h3>
          <ul className="space-y-2 text-sm leading-relaxed">
            <li><span className="font-medium">+1 Basic Success → Quick Action:</span> grab/throw an item, reload, partial cover.</li>
            <li><span className="font-medium">+1 Critical Success → Full Action:</span> break doors, total cover, search/investigate.</li>
            <li><span className="font-medium">+1 Extreme Success → Cool Action:</span> leaps, sprinting shots, complex maneuvers.</li>
          </ul>
        </section>

        {/* Help */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🫱 Help</h3>
          <ul className="space-y-1 text-sm leading-relaxed">
            <li><span className="font-medium">+1 to a roll</span> for minor help.</li>
            <li><span className="font-medium">Automatic success</span> for overwhelming help.</li>
            <li><span className="font-medium">Allow the roll</span> when help enables the attempt.</li>
          </ul>
        </section>

        {/* Adrenaline */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">💥 Adrenaline</h3>
          <p className="text-sm leading-relaxed">
            Heroes start with 1 Adrenaline and gain +2 when filling the Hot Box. Directors may award +1 for epic, unlikely, or emotional moments.
          </p>
        </section>

        {/* Spotlights */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🌟 Spotlights</h3>
          <ul className="list-disc pl-5 text-sm leading-relaxed">
            <li>Auto-succeed with an Extreme Success</li>
            <li>Save a friend from Death Roulette</li>
            <li>Remove any Condition</li>
            <li>Protect a Ride or perform cinematic flourish</li>
          </ul>
        </section>

        {/* Dangerous Rolls */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">💀 Dangerous Rolls</h3>
          <ul className="list-disc pl-5 text-sm leading-relaxed">
            <li>Basic Fail: lose 1 Grit</li>
            <li>Critical Fail: lose 3 Grit</li>
            <li>Extreme Fail: lose 9 Grit</li>
            <li>Impossible Fail: lose ALL Grit</li>
          </ul>
        </section>

        <footer className="mt-10 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Sources: Outgunned Corebook — Complete Dice Rules Reference.
        </footer>
      </div>
    </section>
  );
}
