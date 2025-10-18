import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Campaign from "./Campaign";
import Game from "./Game";
import Character from "./Character";
import CharacterCreator from "./CharacterCreator";
import CharactersList from "./CharactersList";

import Header from "../components/Header";

export const Router = () => (
  <BrowserRouter>
    {/* Fixed, translucent header on every screen */}
    <Header />

    {/* Push content below the fixed header + apply nice page width */}
    <main className="pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/campaign/:id" element={<Campaign />} />
          <Route path="/game/:id" element={<Game />} />
          <Route path="/character/:id" element={<Character />} />
          <Route path="/characters/new" element={<CharacterCreator />} />
          <Route path="/characters" element={<CharactersList />} />
        </Routes>
      </div>
    </main>
  </BrowserRouter>
);
