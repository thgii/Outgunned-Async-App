import CampaignWizard from "../components/CampaignWizard";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function CampaignCreate() {
  const nav = useNavigate();

  async function handleSubmit(payload: { title: string; description: string; heroIds: string[] }) {
    const res = await api("/campaigns", {
      method: "POST",
      json: payload, // { title, description, heroIds }
    });
    const id = typeof res === "object" && res?.id ? res.id : String(res);
    nav(`/campaign/${id}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Create Campaign</h1>
      <CampaignWizard onSubmit={handleSubmit} />
    </div>
  );
}
