import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="p-8 text-center space-y-4">
      <h1 className="text-4xl font-bold mb-6">Outgunned Campaign Helper</h1>

      <p className="mb-4">Chat-first tabletop for Outgunned/Adventure.</p>
      <div className="space-x-4">
        <Link to="/campaign/demo-camp" className="text-blue-600 underline">Demo Campaign</Link>
      </div>


      <div className="space-x-4">
        <Link to="/characters/new">
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Create Character
          </button>
        </Link>

        <Link to="/characters">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            View All Characters
          </button>
        </Link>
      </div>
    </div>
  );
}
