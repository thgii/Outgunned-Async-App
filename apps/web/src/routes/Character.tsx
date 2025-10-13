import { useParams } from "react-router-dom";
import CharacterSheet from "../components/CharacterSheet";

export default function Character() {
  const { id } = useParams();
  return (
    <div className="max-w-3xl mx-auto p-6">
      <CharacterSheet characterId={String(id)} />
    </div>
  );
}
