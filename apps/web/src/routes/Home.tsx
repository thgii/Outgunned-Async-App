import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="p-8 text-center space-y-4">
      <h1 className="text-4xl font-bold mb-6">OCAP: Outgunned Campaign Async Platform</h1>

      <p className="mb-4">Chat-first tabletop for Outgunned Cinematic Campaigns.</p>

      <div className="space-x-4">
        <Link to="/characters/new">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Create Hero
          </button>
        </Link>

        <Link to="/characters">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            View All Heroes
          </button>
        </Link>

        <Link to="/campaigns">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
            View All Campaigns
          </button>
        </Link>

      </div>
    </div>
  );
}
