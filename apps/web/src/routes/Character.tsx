import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CharacterSheet from "../components/CharacterSheet";
import { api } from "../lib/api";

export default function Character() {
  const { id } = useParams();
  const [character, setCharacter] = useState<any>(null);
  useEffect(() => { api(`/characters/${id}`).then(setCharacter); }, [id]);
  if (!character) return <div className="p-6">Loading…</div>;
  return <div className="max-w-3xl mx-auto p-6"><CharacterSheet value={character} onChange={setCharacter}/></div>;
}
