export default function GMControls({ gameId }: { gameId: string }) {
  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="font-semibold">GM Controls</div>
      <ul className="list-disc pl-5 text-sm">
        <li>Start Action/Reaction turn</li>
        <li>Post handout (image)</li>
        <li>Pin/redact message</li>
      </ul>
    </div>
  );
}
