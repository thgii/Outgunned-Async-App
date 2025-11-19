import React from "react";

export default function DirectorsToolkit_EnemyResources() {
  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl border border-gray-300 shadow bg-white p-6 space-y-8">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-gray-900">
          Enemy Resources: Feats & Special Actions
        </h2>
        <p className="text-sm text-gray-700">
          Use Enemy Feats and Adrenaline-powered Special Actions to tailor Goons,
          Bad Guys, and Bosses and make each fight unique. These are tools, not
          obligations: ignore them for quick, simple fights, or turn them on when
          you want a set-piece encounter.
        </p>
      </header>

      {/* Enemy Resources overview */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Enemy Resources</h3>
        <p className="text-sm text-gray-700">
          Much like Heroes, Enemies can rely on special resources to sway the
          odds, especially <span className="font-semibold">Enemy Feats</span> and{" "}
          <span className="font-semibold">Special Actions</span>. These allow you
          to customize Enemies so each combat feels different and unpredictable.
        </p>
        <p className="text-sm text-gray-700">
          You are <span className="font-semibold">not required</span> to use
          these at all. Skip them to keep combat quick and light, or bring them in
          when you want to dedicate more time and attention to a fight.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h4 className="text-sm font-semibold text-blue-900">Enemy Feats</h4>
            <p className="mt-1 text-xs text-blue-900">
              Permanent tweaks to how the Enemy fights (better gear, brutal
              tactics, special defenses, etc.).
            </p>
            <ul className="mt-2 space-y-1 text-xs text-blue-900 list-disc list-inside">
              <li>Spend <span className="font-semibold">Feat Points</span>.</li>
              <li>Goons: <span className="font-semibold">1</span> Feat Point.</li>
              <li>Bad Guys: <span className="font-semibold">3</span> Feat Points.</li>
              <li>Bosses: <span className="font-semibold">5</span> Feat Points.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <h4 className="text-sm font-semibold text-red-900">
              Adrenaline & Special Actions
            </h4>
            <p className="mt-1 text-xs text-red-900">
              Explosive one-off moves triggered by{" "}
              <span className="font-semibold">Adrenaline</span> from Hot Boxes in
              the Enemy&apos;s Grit track.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-red-900 list-disc list-inside">
              <li>
                Some Bad Guys/Bosses have <span className="font-semibold">HOT BOXES</span>{" "}
                in their Grit.
              </li>
              <li>
                Filling a Hot Box grants the Director{" "}
                <span className="font-semibold">1 Adrenaline</span>.
              </li>
              <li>Special Actions cost 1, 2, or 3 Adrenaline.</li>
              <li>
                You can spend Adrenaline immediately or save it up for a bigger
                move later.
              </li>
              <li>
                When combat ends, all <span className="font-semibold">unused Adrenaline is lost</span>.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final Blow rule */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white-900">Final Blow (Hot Box Last Grit Box)</h3>
        <p className="text-xs text-white-900">
          Normally, if a Hero defeats an Enemy before you can spend the
          accumulated Adrenaline on a Special Action, you just lose that
          Adrenaline.
        </p>
        <p className="text-xs text-amber-900">
          <span className="font-semibold">Exception:</span> if the Enemy&apos;s{" "}
          <span className="font-semibold">last</span> Grit box is a{" "}
          <span className="font-semibold">HOT BOX</span>, you may choose to spend
          your Adrenaline even after the Enemy is defeated, triggering one last
          parting gift the Heroes won&apos;t soon forget.
        </p>
      </section>

      {/* When to use each */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            When to Give an Enemy Feats
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-gray-800 list-disc list-inside">
            <li>You had time to prep the Session.</li>
            <li>You want distinctive, themed Enemies.</li>
            <li>You want to challenge overconfident Heroes.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            When to Use Special Actions
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-gray-800 list-disc list-inside">
            <li>You want to extend or escalate a fight.</li>
            <li>You want “unforeseen accidents” and twists.</li>
            <li>
              You want to play with enemy strategy in the moment, deciding how to
              spend Adrenaline as you go.
            </li>
          </ul>
        </div>
      </section>

      {/* Enemy Feats */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Enemy Feats by Cost</h3>
        <p className="text-xs text-gray-700">
          An Enemy with 1 Feat Point can only buy one 1-point Feat. An Enemy with 3
          Feat Points can buy a single 3-point Feat, one 2-point and one 1-point
          Feat, or up to three 1-point Feats, and so on.
        </p>

        {/* 1-point feats */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">1-Point Enemy Feats</h4>
          <dl className="space-y-3 text-xs text-gray-800">
            <div>
              <dt className="font-semibold">AUTOMATIC WEAPONS</dt>
              <dd>
                Enemies are armed with automatic weapons. Heroes who fail to score at
                least a Basic Success during their Reaction Turn become{" "}
                <span className="font-semibold">Nervous</span>. If already Nervous,
                they lose 1 additional Grit.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">BULLETPROOF VESTS</dt>
              <dd>
                Heroes suffer <span className="font-semibold">-1</span> when rolling
                to hit the Enemy with firearms or other ranged weapons.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">FIGHTERS</dt>
              <dd>
                Enemies are experts in hand-to-hand combat. Heroes suffer{" "}
                <span className="font-semibold">-1</span> when rolling to hit the
                Enemy <span className="italic">without</span> firearms or ranged
                weapons.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">HEAVY-HANDED</dt>
              <dd>
                Burly Enemies or ones armed with bats and chains. Heroes who fail to
                score at least a Basic Success during their Reaction Turn become{" "}
                <span className="font-semibold">Tired</span>. If already Tired, they
                lose 1 additional Grit.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">MOB</dt>
              <dd>
                The Enemies are a large group, riotous crowd, or gang with far
                greater numbers. Whenever a Hero loses any Grit, they lose{" "}
                <span className="font-semibold">1 additional Grit</span>.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">SHARP BLADES</dt>
              <dd>
                Enemies wield knives, claws, or sharp swords. Heroes who fail to
                score at least a Basic Success during their Reaction Turn become{" "}
                <span className="font-semibold">Hurt</span>. If already Hurt, they
                lose 1 additional Grit. Heroes with knives or swords ignore this Feat.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">TACTICS</dt>
              <dd>
                Well-trained foes with excellent battlefield movement. When a Hero
                uses a Quick Action to change range, they must flip a coin:
                <br />
                <span className="font-semibold">Heads:</span> the Enemy anticipates
                the move, range doesn&apos;t change, and the Hero loses their action.
                <br />
                <span className="font-semibold">Tails:</span> the Hero repositions
                successfully.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">WALKING HAZARD</dt>
              <dd>
                Extremely dangerous or reckless Enemies, or ones with unusual weapons.
                Attacking the Enemy always requires an{" "}
                <span className="font-semibold">Action Roll</span>.
              </dd>
            </div>
          </dl>
        </div>

        {/* 2-point feats */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">2-Point Enemy Feats</h4>
          <dl className="space-y-3 text-xs text-gray-800">
            <div>
              <dt className="font-semibold">ARMORED</dt>
              <dd>
                Enemies wear heavy armor or riot gear. Heroes suffer{" "}
                <span className="font-semibold">-1</span> to rolls made to hit the
                Enemy. This stacks with{" "}
                <span className="font-semibold">Bulletproof Vests</span>.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">HARD TO KILL</dt>
              <dd>
                When the Enemy reaches a Hot Box, they gain 1 Adrenaline as usual but
                do <span className="font-semibold">not</span> lose extra Grit past
                that box. You only fill up to the Hot Box, even if the attack would
                deal more Grit.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">MARTIAL ARTS</dt>
              <dd>
                Skilled martial artists. All Heroes who don&apos;t have the{" "}
                <span className="font-semibold">Martial Arts</span> Feat suffer{" "}
                <span className="font-semibold">-1</span> to Action and Reaction
                Rolls against the Enemy at Melee or Close Range.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">MEDKIT</dt>
              <dd>
                When the Enemy would lose all Grit, they immediately gain{" "}
                <span className="font-semibold">1 additional Grit</span> and return
                to the fight.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">ONE STEP AHEAD</dt>
              <dd>
                The Enemy has no Weak Spot. If a Hero tries to find it and succeeds,
                they realize there is none and lose 1 Grit from the disheartening
                discovery.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">PIERCING BULLETS</dt>
              <dd>
                Heroes get <span className="font-semibold">no bonus</span> from
                bulletproof vests or Partial Cover against these weapons.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">RELENTLESS</dt>
              <dd>
                Enemies ignore <span className="font-semibold">Covering Fire</span>.
                Heroes who lay Covering Fire still spend their action and mag but gain
                no advantage.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">SHOTGUNS</dt>
              <dd>
                Enemies are armed with shotguns or similar weapons. All Heroes in
                Melee with them at the end of their Action Turn suffer{" "}
                <span className="font-semibold">-1</span> to their next Reaction Roll.
              </dd>
            </div>
          </dl>
        </div>

        {/* 3-point feats */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">3-Point Enemy Feats</h4>
          <dl className="space-y-3 text-xs text-gray-800">
            <div>
              <dt className="font-semibold">EXPLOSIVE WEAPONS</dt>
              <dd>
                Enemies wield grenades, rockets, or similarly devastating weapons.
                During Reaction Turns, <span className="font-semibold">all</span>{" "}
                rolls made by Heroes are considered{" "}
                <span className="font-semibold">Gambles</span>.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">FLAMETHROWER</dt>
              <dd>
                Enemies are equipped with a fearsome flamethrower. Heroes who fail to
                score at least a <span className="font-semibold">Critical</span>{" "}
                Success during their Reaction Turn must{" "}
                <span className="font-semibold">skip</span> their next Action Turn.
                When the Enemy is defeated, the flamethrower explodes or becomes
                unusable.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">RAGE</dt>
              <dd>
                Rage burns in their eyes. The Enemy begins the combat with{" "}
                <span className="font-semibold">1 Adrenaline</span>.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">TITAN</dt>
              <dd>
                An extraordinarily resilient single foe (or unit). Heroes cannot deal
                more than <span className="font-semibold">1 Grit per attack</span> to
                this Enemy.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Special Actions */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Enemy Special Actions</h3>
        <p className="text-xs text-gray-700">
          When you fill in a Hot Box on a Bad Guy or Boss, you gain 1 Adrenaline. You
          can spend that Adrenaline on the following Special Actions, sorted by cost.
          Any unused Adrenaline is lost when combat ends.
        </p>

        {/* 1-Adrenaline */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">
            1-Adrenaline Special Actions
          </h4>
          <dl className="space-y-3 text-xs text-gray-800">
            <div>
              <dt className="font-semibold">COUNTER</dt>
              <dd>
                After a Hero has dealt a blow, the Enemy counters immediately. That
                Hero loses the <span className="font-semibold">same amount of Grit</span>{" "}
                the Enemy just lost.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">DISARM</dt>
              <dd>
                The Enemies try to disarm a Hero. If the Hero fails a{" "}
                <span className="font-semibold">Critical Reaction Roll</span> in{" "}
                Brawn+Dexterity, they lose their weapon.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">FLASHBANG!</dt>
              <dd>
                Toss a flash grenade. Heroes who fail a{" "}
                <span className="font-semibold">Critical Reaction Roll</span> in
                Nerves+Awareness become{" "}
                <span className="font-semibold">Distracted</span> and suffer{" "}
                <span className="font-semibold">-1</span> to their next roll.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">FOUL PLAY</dt>
              <dd>
                A dirty trick: dirt in the eyes, shots from behind, etc. If the Hero
                fails a <span className="font-semibold">Critical Reaction Roll</span> in
                Crime+Awareness, they lose their next Action Turn.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">GRAB AND THROW</dt>
              <dd>
                After a Hero attacks, the Enemy grabs and throws them. If the Hero
                fails a <span className="font-semibold">Critical Reaction Roll</span> in
                Brawn+Endure, they&apos;re knocked prone and suffer{" "}
                <span className="font-semibold">-1</span> to all rolls until they use a
                Quick Action to stand up.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">I DON&apos;T THINK SO!</dt>
              <dd>
                Used when a Hero activates a Feat that requires Adrenaline. The Hero
                loses their action but does not spend the Feat or any Adrenaline.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">PILE ON</dt>
              <dd>
                The Enemies swarm the weakest Hero. The Hero with the least Grit
                immediately loses 2 Grit. If they have already lost all Grit, they do{" "}
                <span className="italic">not</span> roll Death Roulette but become{" "}
                <span className="font-semibold">Tired</span>. If already Tired, they
                become <span className="font-semibold">Hurt</span>. If already Hurt,
                they become <span className="font-semibold">Broken</span>.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">TACKLE</dt>
              <dd>
                An Enemy charges and tackles a Hero. If the Hero fails a{" "}
                <span className="font-semibold">Critical Reaction Roll</span> in
                Brawn+Force, they lose their footing and suffer{" "}
                <span className="font-semibold">-1</span> to their next roll.
              </dd>
            </div>
          </dl>
        </div>

        {/* 2-Adrenaline */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">
            2-Adrenaline Special Actions
          </h4>
          <dl className="space-y-3 text-xs text-gray-800">
            <div>
              <dt className="font-semibold">CALL FOR BACKUP</dt>
              <dd>
                The current Enemies withdraw and are immediately replaced by an Enemy
                with a higher Template or Type. Combat resumes where it left off.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">CHAOS</dt>
              <dd>
                The Enemies cause chaos (alarms, fires, destruction). From now on,
                Heroes can <span className="font-semibold">no longer spend Adrenaline</span>{" "}
                to gain +1 to their rolls.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">CLAMP DOWN</dt>
              <dd>
                Enemies grapple the Heroes. Heroes who fail a{" "}
                <span className="font-semibold">Basic Reaction Roll</span> in
                Brawn+Stealth become trapped. While trapped, a Hero automatically fails
                all Reaction Rolls, but during their turn they can try to break free
                with a <span className="font-semibold">Critical Action Roll</span> in
                Brawn+Force.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">GRENADE</dt>
              <dd>
                During a Reaction Turn, the Enemies throw a grenade instead of
                attacking. All Heroes must make an{" "}
                <span className="font-semibold">Extreme Reaction Roll</span> in
                Brawn+Stunt. A Hero who scores an{" "}
                <span className="font-semibold">Impossible Success</span> can bounce
                the grenade back, saving their allies and defeating the thrower.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">PARRY</dt>
              <dd>
                Used after a Hero hits the Enemy. The Enemy completely ignores that
                loss of Grit.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">SURROUND</dt>
              <dd>
                Enemies surround or ambush the Heroes. From now on, during their Action
                Turns, Heroes must sacrifice <span className="font-semibold">1 Grit</span>{" "}
                to get access to their free Quick Action.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">THREATS</dt>
              <dd>
                The Enemies do something so sadistic, reckless, or intimidating that it
                shakes the Heroes. Heroes who fail a{" "}
                <span className="font-semibold">Critical Reaction Roll</span> in
                Nerves+Cool lose 1 Adrenaline. If they have no Adrenaline, they become{" "}
                <span className="font-semibold">Scared</span> instead.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">WEAK SPOT</dt>
              <dd>
                The Enemies exploit a Hero&apos;s weak spot. That Hero suffers{" "}
                <span className="font-semibold">-2</span> to their next Reaction Roll.
              </dd>
            </div>
          </dl>
        </div>

        {/* 3-Adrenaline */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">
            3-Adrenaline Special Actions
          </h4>
          <dl className="space-y-3 text-xs text-gray-800">
            <div>
              <dt className="font-semibold">FINAL MOVE</dt>
              <dd>
                A furious, dramatic last strike against a Hero. If the Hero fails an{" "}
                <span className="font-semibold">Extreme Reaction Roll</span> in
                Brawn+Fight, they become <span className="font-semibold">Broken</span>.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">INFAMY</dt>
              <dd>
                When a Hero spends Adrenaline or a Spotlight for any reason, they lose
                the resource <span className="font-semibold">without</span> gaining any
                benefit. If a Spotlight was used to save an ally, another Hero may
                choose to spend their own Spotlight instead.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">SECRET WEAPON</dt>
              <dd>
                The Enemy reveals a hidden weapon or skill. They immediately gain one{" "}
                <span className="font-semibold">Enemy Feat</span> of any kind, chosen by
                the Director.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">TO THE END</dt>
              <dd>
                The Enemy grits their teeth and pushes through the pain. The Director{" "}
                <span className="font-semibold">erases 2 filled-in Grit boxes</span>.
                After this, the Director no longer gains Adrenaline for the rest of the
                combat.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Weak Spot rules */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Weak Spot</h3>
        <p className="text-sm text-gray-700">
          Most Enemies have a Weak Spot you can exploit to turn the tide. It might be
          a fragile support over their heads, a careless henchman, or a grenade on
          their belt. Finding and using the Weak Spot is also a way for less
          combat-focused Heroes to shine during a fight.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">
              Finding the Weak Spot
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-800 list-disc list-inside">
              <li>
                Make an <span className="font-semibold">Action Roll</span> in{" "}
                <span className="font-semibold">Focus+Detect</span> with Difficulty
                equal to the Enemy&apos;s Defense.
              </li>
              <li>
                Or, if you have the <span className="font-semibold">Intuition</span>{" "}
                Feat, you may spend <span className="font-semibold">1 Adrenaline</span>{" "}
                to find the Weak Spot without rolling.
              </li>
              <li>
                The Director randomly generates a Weak Spot (using the official table)
                and tells you the result.
              </li>
              <li>
                You may share or withhold this information from the other Heroes.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">
              Exploiting the Weak Spot
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-800 list-disc list-inside">
              <li>
                Each Weak Spot grants <span className="font-semibold">+1</span> to a
                single roll or creates a special opportunity to hit where it hurts.
              </li>
              <li>
                Only Heroes who know about the Weak Spot can exploit it, and each
                Weak Spot can only be used <span className="font-semibold">once</span>,
                success or fail.
              </li>
              <li>
                Each Enemy has only <span className="font-semibold">one</span> Weak
                Spot; once found, you can&apos;t look for another.
              </li>
              <li>
                The Weak Spot is more than a bonus &mdash; it&apos;s a narrative hook
                that encourages clever play, investigation, and teamwork.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
