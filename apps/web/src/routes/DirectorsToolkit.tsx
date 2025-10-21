import { useState } from "react";
import DirectorsToolkit_AttributesAndSkills from "../components/DirectorsToolkit_AttributesAndSkills";

/**
 * Director's Toolkit route (no external UI kit)
 * Tabs are simple buttons; content panes are conditionally rendered.
 */

export default function DirectorsToolkit() {
  const [tab, setTab] = useState<"attributes" | "resources" | "feats">("attributes");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold">
          DT
        </div>
        <div>
          <h1 className="text-3xl font-bold">Director’s Toolkit</h1>
          <p className="text-gray-600 text-sm">
            Reference materials and quick rules look-ups for running your game.
          </p>
        </div>
      </div>

      {/* Tabs (simple) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("attributes")}
          className={`px-3 py-1.5 rounded-full border ${
            tab === "attributes" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Attributes & Skills
        </button>
        <button
          onClick={() => setTab("resources")}
          className={`px-3 py-1.5 rounded-full border ${
            tab === "resources" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => setTab("feats")}
          className={`px-3 py-1.5 rounded-full border ${
            tab === "feats" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Feats
        </button>
      </div>

      {/* Content panes */}
      <div>
        {tab === "attributes" && <DirectorsToolkit_AttributesAndSkills />}

        {tab === "resources" && (
          <div className="w-full max-w-4xl mx-auto rounded-2xl border shadow-sm bg-white p-6">
            <h2 className="text-xl font-semibold mb-2">Resources</h2>
            <p className="text-gray-600">
              Coming soon: Adrenaline/Luck, Grit, Lethal Bullets, etc.
            </p>
          </div>
        )}

        {tab === "feats" && (
          <div className="w-full max-w-4xl mx-auto rounded-2xl border shadow-sm bg-white p-6">
            <h2 className="text-xl font-semibold mb-2">Feats</h2>
            <p className="text-gray-600">
              Future list of feat categories and quick references.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
