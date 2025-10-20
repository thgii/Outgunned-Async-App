import { useNavigate } from "react-router-dom";
import CharacterWizard from "../components/CharacterWizard";
import type { CharacterDTO } from "@action-thread/types";

export default function CharacterCreator() {
  const nav = useNavigate();
  function done(created: CharacterDTO) {
    nav(`/character/${created.id}`);
  }
  return (
    <div className="max-w-4xl mx-auto p-6">
      <CharacterWizard onComplete={done} />
    </div>
  );
}
