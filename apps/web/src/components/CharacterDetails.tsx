import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Character = {
  id: string;
  name: string;
  role: string;
  trope: string;
  age?: string;
  background?: string;
  flaw?: string;
  catchphrase?: string;
  attributes?: Record<string, number>;
  skills?: Record<string, number>;
  feats?: string[];
  gear?: string[];
  resources?: Record<string, number>;
  ride?: string;
  notes?: string;
};

export default function CharacterDetails({ id }: { id: string }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await api(`/characters/${id}`);
        setCharacter(data);
      } catch (err) {
        console.error("Failed to load character:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <p>Loading character...</p>;
  if (!character) return <p>Character not found.</p>;

  const {
    name,
    role,
    trope,
    age,
    background,
    flaw,
    catchphrase,
    attributes,
    skills,
    feats,
    gear,
    resources,
    ride,
    notes,
  } = character;

  const renderAttributes = () => {
    if (!attributes) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
        {Object.entries(attributes).map(([key, val]) => (
          <div
            key={key}
            className="rounded bg-gray-100 px-3 py-2 flex justify-between text-sm"
          >
            <span className="font-semibold">{key}</span>
            <span>{val}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderSkills = () => {
    if (!skills) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
        {Object.entries(skills).map(([key, val]) => (
          <div
            key={key}
            className="rounded bg-gray-100 px-3 py-2 flex justify-between text-sm"
          >
            <span>{key}</span>
            <span>{val}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-gray-600">
            {role} — {trope}
          </p>
          {background && <p className="italic text-sm">Background: {background}</p>}
          {age && <p className="text-sm">Age: {age}</p>}
          {catchphrase && <p className="text-sm mt-1">“{catchphrase}”</p>}
          {flaw && <p className="text-sm mt-1 text-red-700">Flaw: {flaw}</p>}
        </div>
        <button
          onClick={() => navigate(`/character/${id}/edit`)}
          className="bg-black text-white px-4 py-2 rounded hover:opacity-80"
        >
          Edit
        </button>
      </div>

      {/* Resources */}
      {resources && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Resources</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(resources).map(([key, val]) => (
              <div
                key={key}
                className="rounded bg-gray-50 border px-3 py-2 flex justify-between text-sm"
              >
                <span className="font-semibold">{key}</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ride */}
      {ride && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Ride</h2>
          <p className="bg-gray-50 border rounded px-3 py-2">{ride}</p>
        </div>
      )}

      {/* Attributes */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Attributes</h2>
        {renderAttributes()}
      </div>

      {/* Skills */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Skills</h2>
        {renderSkills()}
      </div>

      {/* Feats */}
      {feats && feats.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Feats</h2>
          <ul className="list-disc list-inside">
            {feats.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Gear */}
      {gear && gear.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Gear</h2>
          <ul className="list-disc list-inside">
            {gear.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Notes</h2>
          <p className="whitespace-pre-wrap bg-gray-50 border rounded px-3 py-2">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
}
