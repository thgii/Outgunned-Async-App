import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Campaign from "./Campaign";
import Game from "./Game";
import Character from "./Character";
import CharacterCreator from "./CharacterCreator";
import CharactersList from "./CharactersList";
import CharacterEdit from "./CharacterEdit";

export const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/campaign/:id" element={<Campaign/>} />
      <Route path="/game/:id" element={<Game/>} />
      <Route path="/character/:id" element={<Character/>} />
      <Route path="/character/:id/edit" element={<CharacterEdit/>} />
      <Route path="/characters/new" element={<CharacterCreator />} />
      <Route path="/characters" element={<CharactersList />} />
    </Routes>
  </BrowserRouter>
);
