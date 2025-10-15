import { useNavigate } from "react-router-dom";
import CharacterForm from "../components/CharacterForm";
import { api } from "../lib/api";
import type { CharacterDTO } from "@action-thread/types";

export default function CharacterCreator() {
  const nav = useNavigate();

  async function save(dto: CharacterDTO) {
    // POST to your worker
    const created = await api("/characters", { method: "POST", json: dto });
    nav(`/characters/${created.id}`);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create Character</h1>
      <CharacterForm onSubmit={save} />
    </div>
  );
}
