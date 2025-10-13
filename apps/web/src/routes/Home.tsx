import { Link } from "react-router-dom";
export default function Home() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Outgunned Campaign Helper</h1>
      <p className="mb-4">Chat-first tabletop for Outgunned/Adventure.</p>
      <div className="space-x-4">
        <Link to="/campaign/demo-camp" className="text-blue-600 underline">Demo Campaign</Link>
      </div>
    </div>
  );
}
