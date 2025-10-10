export default function MessageEditor({
  defaultValue,
  onSave,
  onCancel
}: {
  defaultValue: string;
  onSave: (content: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <textarea defaultValue={defaultValue} className="flex-1 border rounded p-2" rows={3}/>
      <div className="flex flex-col gap-2">
        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={(e)=>{
          const content = (e.currentTarget.parentElement?.previousSibling as HTMLTextAreaElement).value;
          onSave(content);
        }}>Save</button>
        <button className="px-3 py-1 bg-slate-300 rounded" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
