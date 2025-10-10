import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Campaign() {
  const { id } = useParams();
  const [games, setGames] = useState<any[]>([]);
  useEffect(() => { api(`/campaigns/${id}/games`).then(setGames); }, [id]);
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Campaign {id}</h1>
      <ul className="space-y-2">
        {games.map(g => (
          <li key={g.id} className="p-3 bg-white rounded shadow">
            <Link to={`/game/${g.id}`} className="text-blue-600 underline">{g.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
