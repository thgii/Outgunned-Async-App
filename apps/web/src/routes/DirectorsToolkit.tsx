import { useState } from "react";
import DirectorsToolkit_AttributesAndSkills from "../components/DirectorsToolkit_AttributesAndSkills";
import DirectorsToolkit_Gear from "../components/DirectorsToolkit_Gear";
import DirectorsToolkit_Feats from "../components/DirectorsToolkit_Feats";


export default function DirectorsToolkit() {
  const [tab, setTab] = useState<"attributes" | "gear" | "resources" | "feats">("attributes");

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-gray-900 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
          DT
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Director’s Toolkit</h1>
          <p className="text-gray-700 text-sm">
            Reference materials and quick rules look-ups for running your game.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setTab("attributes")}
          className={`px-4 py-2 rounded-full border font-medium ${
            tab === "attributes"
              ? "bg-blue-600 text-white border-blue-700"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Attributes & Skills
        </button>
        <button
          onClick={() => setTab("gear")}
          className={`px-4 py-2 rounded-full border font-medium ${
            tab === "gear"
              ? "bg-blue-600 text-white border-blue-700"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Gear
        </button>

        <button
          onClick={() => setTab("feats")}
          className={`px-4 py-2 rounded-full border font-medium ${
            tab === "feats"
              ? "bg-blue-600 text-white border-blue-700"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Feats
        </button>

        <button
          onClick={() => setTab("resources")}
          className={`px-4 py-2 rounded-full border font-medium ${
            tab === "resources"
              ? "bg-blue-600 text-white border-blue-700"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Resources
        </button>
        
      </div>

      {/* Content panes */}
      <div>
        {tab === "attributes" && <DirectorsToolkit_AttributesAndSkills />}

        {tab === "gear" && <DirectorsToolkit_Gear />}
        
        {tab === "resources" && (
          <div className="w-full max-w-4xl mx-auto rounded-2xl border border-gray-300 shadow bg-white p-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Resources</h2>
            <p className="text-gray-700">
              Coming soon: Adrenaline/Luck, Grit, Lethal Bullets, etc.
            </p>
          </div>
        )}

       {tab === "feats" && <DirectorsToolkit_Feats />}
      </div>
    </div>
  );
}
