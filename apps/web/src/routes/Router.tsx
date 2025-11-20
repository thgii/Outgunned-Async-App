import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Campaign from "./Campaign";
import Game from "./Game";
import Character from "./Character";
import CharacterCreator from "./CharacterCreator";
import CharactersList from "./CharactersList";
import DirectorsToolkit from "./DirectorsToolkit";
import Header from "../components/Header";
import Login from "./Login";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/store";
import GameAdmin from "./GameAdmin";
import CampaignAdmin from "./CampaignAdmin";
import Campaigns from "./Campaigns";
import CampaignCreate from "./CampaignCreate";
import NpcsList from "./NpcsList";


function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuth((s) => s.token);
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}

export const Router = () => (
  <BrowserRouter>
    {/* Fixed, translucent header on every screen */}
    <Header />

    {/* Push content below the fixed header + apply nice page width */}
    <main className="pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/game/:id" element={<RequireAuth><Game /></RequireAuth>} />
          <Route path="/campaign/:id" element={<RequireAuth><Campaign /></RequireAuth>} />
          <Route path="/character/:id" element={<RequireAuth><Character /></RequireAuth>} />
          <Route path="/characters" element={<RequireAuth><CharactersList /></RequireAuth>} />
          <Route path="/directors-toolkit" element={<RequireAuth><DirectorsToolkit /></RequireAuth>} />
          <Route path="/characters/new" element={<RequireAuth><CharacterCreator /></RequireAuth>} />
          <Route path="/game/:id/admin" element={<RequireAuth><GameAdmin></GameAdmin></RequireAuth>} />
          <Route path="/campaign/:id/admin" element={<RequireAuth><CampaignAdmin /></RequireAuth>} />
          <Route path="/campaigns" element={<RequireAuth><Campaigns /></RequireAuth>} />
          <Route path="/campaigns/new" element={<RequireAuth><CampaignCreate /></RequireAuth>} />
          <Route path="/act/:id" element={<RequireAuth><Game /></RequireAuth>} />
          <Route path="/act/:id/admin" element={<RequireAuth><GameAdmin /></RequireAuth>} />
          <Route path="/npcs" element={<RequireAuth><NpcsList /></RequireAuth>} />


        </Routes>
      </div>
    </main>
  </BrowserRouter>
);
