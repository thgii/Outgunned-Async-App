import React from "react";

/**
 * Director’s Toolkit: Core Cinematic Rolls & Resources
 * Self-contained card component (Tailwind only).
 * Works in light/dark and scales cleanly on mobile.
 */
export default function RulesReference() {
  return (
    <section className="w-full">
      <div className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-zinc-900/90">
        <header className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            🎬 Director’s Toolkit: <span className="whitespace-nowrap">Core Cinematic Rolls &amp; Resources</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quick-reference for success tiers, extra actions, help, adrenaline, spotlights, and stylish failure.
          </p>
        </header>

        {/* Roll Success Rates */}
        <section className="mt-6">
          <h3 className="mb-2 text-lg font-semibold">🎲 Roll Success Rates</h3>
            <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-800">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:text-gray-200">
                  <tr className="text-left">
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Set Rolled</th>
                    <th className="px-3 py-2">Description</th>
                  </tr>
                </thead>
                <tbody className="align-top divide-y divide-gray-200 dark:divide-zinc-800 text-black">
                  <tr className="bg-white dark:bg-zinc-900">
                    <td className="px-3 py-2 font-medium">Basic Success</td>
                    <td className="px-3 py-2">2-of-a-kind</td>
                    <td className="px-3 py-2">Standard success.</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-zinc-950/50">
                    <td className="px-3 py-2 font-medium">Critical Success</td>
                    <td className="px-3 py-2">3-of-a-kind</td>
                    <td className="px-3 py-2">Strong success; can fuel bigger effects.</td>
                  </tr>
                  <tr className="bg-white dark:bg-zinc-900">
                    <td className="px-3 py-2 font-medium">Extreme Success</td>
                    <td className="px-3 py-2">4-of-a-kind</td>
                    <td className="px-3 py-2">Legendary outcome, major advantage.</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-zinc-950/50">
                    <td className="px-3 py-2 font-medium">Impossible Success</td>
                    <td className="px-3 py-2">5-of-a-kind</td>
                    <td className="px-3 py-2">Breathtaking result.</td>
                  </tr>
                  <tr className="bg-white dark:bg-zinc-900">
                    <td className="px-3 py-2 font-medium">Jackpot!</td>
                    <td className="px-3 py-2">6+-of-a-kind</td>
                    <td className="px-3 py-2">Scene-stealing brilliance.</td>
                  </tr>
                </tbody>
              </table>
            </div>

          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed dark:bg-zinc-800/50">
            <p className="mb-1">
              <span className="font-medium">Three = One, One = Three.</span> Three smaller successes equal one greater;
              one greater can split into three smaller.
            </p>
            <p>Extra successes can be spent as extra actions (below).</p>
          </div>
        </section>

        {/* Extra Actions */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">⚡ Extra Actions</h3>
          <ul className="space-y-2 text-sm leading-relaxed">
            <li>
              <span className="font-medium">+1 Basic Success → Quick Action:</span> grab/throw an item, reload, reach
              partial cover.
            </li>
            <li>
              <span className="font-medium">+1 Critical Success → Full Action:</span> break through a door, dive to total
              cover, search/investigate.
            </li>
            <li>
              <span className="font-medium">+1 Extreme Success → Cool Action:</span> leap from explosions, shoot while
              sprinting, jam/disable complex mechanisms.
            </li>
          </ul>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You can also spend extra successes to trigger Feats that require actions or to{" "}
            <span className="font-medium">help an ally</span> by granting them a success.
          </p>
        </section>

        {/* Help */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🫱 Help</h3>
          <ul className="space-y-1 text-sm leading-relaxed">
            <li>
              <span className="font-medium">+1 to a roll</span> for minor but meaningful help.
            </li>
            <li>
              <span className="font-medium">Automatic success</span> when help overwhelms the difficulty.
            </li>
            <li>
              <span className="font-medium">Allow the roll</span> when help provides the prerequisite to even attempt it.
            </li>
          </ul>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Directors gauge impact: “useful but not decisive” → +1; overwhelming → auto success.
          </p>
        </section>

        {/* Adrenaline */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">💥 Gaining Adrenaline</h3>
          <p className="text-sm leading-relaxed">
            Heroes start with <span className="font-medium">1 Adrenaline</span> and gain{" "}
            <span className="font-medium">+2 when filling the Hot Box</span> on the Grit track. Directors can also award
            +1 for success against all odds, big sacrifices, epic/cathartic moments, or crowd-cheering moves.
          </p>
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-zinc-800/50">
            <p className="font-medium">Spend Adrenaline to:</p>
            <ul className="mt-1 list-disc pl-5">
              <li>Gain +1 to any Action/Reaction roll</li>
              <li>Activate a Feat that costs Adrenaline</li>
              <li>Trade 6 Adrenaline → 1 Spotlight</li>
            </ul>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Tip: If little Adrenaline is being spent, the table probably needs more awards flowing.
          </p>
        </section>

        {/* Spotlights */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🌟 Using Spotlights</h3>
          <p className="text-sm leading-relaxed">
            Heroes can hold up to <span className="font-medium">3 Spotlights</span>. Spend 1 to:
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed">
            <li>Auto-succeed with an Extreme Success</li>
            <li>Save a friend from Death Roulette (they gain a Lethal Bullet)</li>
            <li>Remove any Condition (even Broken)</li>
            <li>Protect a Ride or perform a Director-approved cinematic flourish</li>
          </ul>
          <p className="mt-2 text-sm">
            After use, flip a coin — <span className="font-medium">tails</span>: regain that Spotlight. When saving a
            friend, <span className="font-medium">they</span> regain it on tails.
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Award Spotlights for pitch-perfect Catchphrases or boldly leaning into Flaws.
          </p>
        </section>

        {/* Failing with Style */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">🎭 Failing with Style</h3>
          <p className="text-sm leading-relaxed">
            Failure never stops the story — it redirects it. On a failure, pick a framing that keeps momentum:
          </p>
          <ol className="mt-2 list-decimal pl-5 text-sm leading-relaxed">
            <li>
              <span className="font-medium">Roll with the Punches:</span> partial/temporary success plus a twist.
            </li>
            <li>
              <span className="font-medium">Pay the Price:</span> succeed at a cost (Condition or lost Gear/Cash).
            </li>
            <li>
              <span className="font-medium">Take the Hard Road:</span> miss now, but reveal a tougher alternative path.
            </li>
            <li>
              <span className="font-medium">Face Danger:</span> escalate to a Dangerous Roll or drop into immediate
              peril.
            </li>
          </ol>
        </section>

        {/* Dangerous Rolls */}
        <section className="mt-8">
          <h3 className="mb-2 text-lg font-semibold">💀 Dangerous Rolls</h3>
          <p className="text-sm leading-relaxed">
            If you fail a dangerous roll, you don’t face the usual consequences for a failure. Instead, you lose a set amount of Grit depending on the difficulty of the failed roll.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed">
            <li>BASIC: You lose 1 Grit</li>
            <li>CRITICAL: You lose 3 Grit</li>
            <li>EXTREME: You lose 9 Grit</li>
            <li>IMPOSSIBLE: You lose All Grit</li>
          </ul>
        </section>

        <footer className="mt-8 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Sources: Outgunned Corebook &amp; Adventure Genre Book — compiled for table reference.
        </footer>
      </div>
    </section>
  );
}
