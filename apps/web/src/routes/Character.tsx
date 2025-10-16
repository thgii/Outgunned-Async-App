import { useParams } from "react-router-dom";
import CharacterDetails from "../components/CharacterDetails";

export default function Character() {
  const { id } = useParams();
  return (
    <div className="max-w-4xl mx-auto p-6">
      {id && <CharacterDetails id={String(id)} />}
    </div>
  );
}
